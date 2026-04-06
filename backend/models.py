from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)  # "teacher" or "student"
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    word_lists = relationship("WordList", back_populates="teacher")
    assignments = relationship("Assignment", back_populates="student")


class WordList(Base):
    __tablename__ = "word_lists"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    teacher = relationship("User", back_populates="word_lists")
    words = relationship("Word", back_populates="word_list", cascade="all, delete-orphan")
    assignments = relationship("Assignment", back_populates="word_list", cascade="all, delete-orphan")


class Word(Base):
    __tablename__ = "words"

    id = Column(Integer, primary_key=True, index=True)
    word_list_id = Column(Integer, ForeignKey("word_lists.id"), nullable=False)
    english = Column(String, nullable=False)
    chinese = Column(String, nullable=True)

    word_list = relationship("WordList", back_populates="words")


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    word_list_id = Column(Integer, ForeignKey("word_lists.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    word_list = relationship("WordList", back_populates="assignments")
    student = relationship("User", back_populates="assignments")
