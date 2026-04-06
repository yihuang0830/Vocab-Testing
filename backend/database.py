from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# 生产环境用 DATABASE_URL（PostgreSQL），本地用 SQLite
DATABASE_URL = os.environ.get("DATABASE_URL")

if DATABASE_URL:
    # Render 提供的 URL 以 postgres:// 开头，SQLAlchemy 需要 postgresql://
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    engine = create_engine(DATABASE_URL)
else:
    _data_dir = os.path.dirname(os.path.abspath(__file__))
    _db_path = os.path.join(_data_dir, "vocab.db")
    engine = create_engine(
        f"sqlite:///{_db_path}", connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
