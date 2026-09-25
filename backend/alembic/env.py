import os
import sys
from pathlib import Path

from alembic import context
from sqlalchemy import engine_from_config, pool

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.db import Base

config = context.config
target_metadata = Base.metadata


def migration_url() -> str:
    """Use the unpooled Neon URL for migrations and a synchronous driver."""
    raw_url = os.getenv("DATABASE_DIRECT_URL") or os.getenv("DATABASE_URL") or config.get_main_option("sqlalchemy.url")
    if raw_url.startswith("postgresql+asyncpg://"):
        return raw_url.replace("postgresql+asyncpg://", "postgresql+psycopg://", 1)
    if raw_url.startswith("sqlite+aiosqlite://"):
        return raw_url.replace("sqlite+aiosqlite://", "sqlite://", 1)
    return raw_url


configuration = config.get_section(config.config_ini_section, {})
configuration["sqlalchemy.url"] = migration_url()

if context.is_offline_mode():
    context.configure(url=configuration["sqlalchemy.url"], target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()
else:
    connectable = engine_from_config(configuration, prefix="sqlalchemy.", poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()
