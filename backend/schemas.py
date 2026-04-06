from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# Auth
class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str


# Users
class CreateStudentRequest(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    role: str

    class Config:
        from_attributes = True


# Words
class WordIn(BaseModel):
    english: str
    chinese: Optional[str] = None


class WordOut(BaseModel):
    id: int
    english: str
    chinese: Optional[str] = None

    class Config:
        from_attributes = True


# Word Lists
class WordListCreate(BaseModel):
    name: str


class WordListOut(BaseModel):
    id: int
    name: str
    created_at: datetime
    words: List[WordOut] = []

    class Config:
        from_attributes = True


class WordListSummary(BaseModel):
    id: int
    name: str
    created_at: datetime
    word_count: int

    class Config:
        from_attributes = True


# Assignments
class AssignRequest(BaseModel):
    student_ids: List[int]


# OCR
class OCRResult(BaseModel):
    words: List[str]


# Translate
class TranslateRequest(BaseModel):
    text: str


class TranslateResponse(BaseModel):
    translation: str


# Bulk add words
class BulkWordsRequest(BaseModel):
    words: List[WordIn]
