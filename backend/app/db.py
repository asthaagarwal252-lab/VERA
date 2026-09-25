from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from .settings import settings

engine = create_async_engine(settings.database_url, future=True, pool_pre_ping=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    pass


class PublicReceipt(Base):
    __tablename__ = "public_receipts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    transaction_id: Mapped[str] = mapped_column(String(180), unique=True, index=True)
    outcome: Mapped[bool] = mapped_column(Boolean)
    disclosure_scope: Mapped[str] = mapped_column(String(120))
    requirement_hash: Mapped[str] = mapped_column(String(64), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


async def initialise_database() -> None:
    if settings.is_production:
        # Production schemas must be established by Alembic using the direct URL.
        return
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
