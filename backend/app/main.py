import time
import uuid
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from .db import PublicReceipt, SessionLocal, engine, initialise_database
from .gemini_service import compose_plan
from .privacy import redact_public_input
from .schemas import PolicyRequest, ProofPlan, ReceiptCreate, ReceiptRead
from .settings import settings


class SlidingWindowRateLimiter:
    """Per-instance abuse protection; use an edge/WAF rule for shared limits."""

    def __init__(self, limit: int, interval_seconds: int = 60) -> None:
        self.limit = limit
        self.interval_seconds = interval_seconds
        self.requests: dict[str, deque[float]] = defaultdict(deque)

    def check(self, client_key: str) -> None:
        now = time.monotonic()
        window = self.requests[client_key]
        while window and now - window[0] > self.interval_seconds:
            window.popleft()
        if len(window) >= self.limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please wait a moment before trying again.",
                headers={"Retry-After": str(self.interval_seconds)},
            )
        window.append(now)


rate_limiter = SlidingWindowRateLimiter(settings.rate_limit_per_minute)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    await initialise_database()
    yield
    await engine.dispose()


app = FastAPI(
    title="VERA public API",
    version="0.2.0",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url=None,
    lifespan=lifespan,
)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.host_list)
app.add_middleware(GZipMiddleware, minimum_size=800)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origin_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-Request-ID"],
    expose_headers=["X-Request-ID"],
    max_age=600,
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    response: Response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, __: RequestValidationError):
    return JSONResponse(status_code=422, content={"detail": "Invalid public request payload."})


async def db_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session


def require_rate_limit(request: Request) -> None:
    client = request.client.host if request.client else "unknown"
    rate_limiter.check(client)


async def readiness() -> dict[str, str]:
    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1 FROM public_receipts LIMIT 1"))
        return {"status": "ok", "database": "reachable-and-migrated"}
    except SQLAlchemyError:
        return {"status": "degraded", "database": "unreachable-or-unmigrated"}


@app.get("/health")
@app.get("/api/health", include_in_schema=False)
async def health(response: Response):
    result = await readiness()
    if result["status"] != "ok":
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return {"service": "vera-api", **result}


@app.post("/v1/proof-plan", response_model=ProofPlan, dependencies=[Depends(require_rate_limit)])
@app.post("/api/v1/proof-plan", response_model=ProofPlan, include_in_schema=False, dependencies=[Depends(require_rate_limit)])
async def proof_plan(payload: PolicyRequest):
    # Gemini receives only redacted public policy text; no request body is logged or stored.
    return await compose_plan(redact_public_input(payload.public_requirement))


@app.get("/v1/metrics", dependencies=[Depends(require_rate_limit)])
@app.get("/api/v1/metrics", include_in_schema=False, dependencies=[Depends(require_rate_limit)])
async def metrics(session: AsyncSession = Depends(db_session)):
    total = (await session.scalar(select(func.count(PublicReceipt.id)))) or 0
    successful = (
        await session.scalar(select(func.count(PublicReceipt.id)).where(PublicReceipt.outcome.is_(True)))
    ) or 0
    return {
        "verified_proofs": total,
        "successful_proofs": successful,
        "private_records_stored": 0,
    }


@app.get("/v1/receipts/{transaction_id}", response_model=ReceiptRead, dependencies=[Depends(require_rate_limit)])
@app.get("/api/v1/receipts/{transaction_id}", response_model=ReceiptRead, include_in_schema=False, dependencies=[Depends(require_rate_limit)])
async def get_receipt(transaction_id: str, session: AsyncSession = Depends(db_session)):
    receipt = await session.scalar(select(PublicReceipt).where(PublicReceipt.transaction_id == transaction_id))
    if receipt is None:
        raise HTTPException(status_code=404, detail="Public receipt not found.")
    return receipt


@app.post("/v1/receipts", response_model=ReceiptRead, status_code=201, dependencies=[Depends(require_rate_limit)])
@app.post("/api/v1/receipts", response_model=ReceiptRead, status_code=201, include_in_schema=False, dependencies=[Depends(require_rate_limit)])
async def create_receipt(payload: ReceiptCreate, session: AsyncSession = Depends(db_session)):
    receipt = PublicReceipt(**payload.model_dump())
    session.add(receipt)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(status_code=409, detail="Public receipt already exists") from None
    await session.refresh(receipt)
    return receipt
