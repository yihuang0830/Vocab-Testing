from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas, auth

router = APIRouter(prefix="/api/users", tags=["users"])


TEACHER_USERNAME = "imewhoru11"
TEACHER_PASSWORD = "ow246800"


def seed_teacher(db):
    """启动时确保内置老师账号存在"""
    existing = db.query(models.User).filter(models.User.username == TEACHER_USERNAME).first()
    if not existing:
        user = models.User(
            username=TEACHER_USERNAME,
            password_hash=auth.hash_password(TEACHER_PASSWORD),
            role="teacher",
        )
        db.add(user)
        db.commit()


@router.post("/login", response_model=schemas.TokenResponse)
def login(req: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == req.username).first()
    if not user or not auth.verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    token = auth.create_access_token({"sub": str(user.id)})
    return schemas.TokenResponse(
        access_token=token, token_type="bearer", role=user.role, username=user.username
    )


@router.post("/students", response_model=schemas.UserOut)
def create_student(
    req: schemas.CreateStudentRequest,
    db: Session = Depends(get_db),
    teacher: models.User = Depends(auth.require_teacher),
):
    existing = db.query(models.User).filter(models.User.username == req.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="用户名已存在")

    student = models.User(
        username=req.username,
        password_hash=auth.hash_password(req.password),
        role="student",
        created_by=teacher.id,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


@router.get("/students", response_model=list[schemas.UserOut])
def list_students(
    db: Session = Depends(get_db),
    teacher: models.User = Depends(auth.require_teacher),
):
    return db.query(models.User).filter(models.User.role == "student").all()


@router.delete("/students/{student_id}")
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    teacher: models.User = Depends(auth.require_teacher),
):
    student = db.query(models.User).filter(
        models.User.id == student_id, models.User.role == "student"
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="学生不存在")
    db.delete(student)
    db.commit()
    return {"ok": True}
