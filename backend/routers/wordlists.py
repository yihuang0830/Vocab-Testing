from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas, auth
from typing import List

router = APIRouter(prefix="/api/wordlists", tags=["wordlists"])


@router.post("", response_model=schemas.WordListOut)
def create_word_list(
    req: schemas.WordListCreate,
    db: Session = Depends(get_db),
    teacher: models.User = Depends(auth.require_teacher),
):
    wl = models.WordList(name=req.name, teacher_id=teacher.id)
    db.add(wl)
    db.commit()
    db.refresh(wl)
    return wl


@router.get("", response_model=List[schemas.WordListSummary])
def list_word_lists(
    db: Session = Depends(get_db),
    teacher: models.User = Depends(auth.require_teacher),
):
    wls = db.query(models.WordList).filter(models.WordList.teacher_id == teacher.id).all()
    result = []
    for wl in wls:
        result.append(schemas.WordListSummary(
            id=wl.id,
            name=wl.name,
            created_at=wl.created_at,
            word_count=len(wl.words),
        ))
    return result


@router.get("/{wl_id}", response_model=schemas.WordListOut)
def get_word_list(
    wl_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    wl = db.query(models.WordList).filter(models.WordList.id == wl_id).first()
    if not wl:
        raise HTTPException(status_code=404, detail="单词列表不存在")

    # 老师可以访问自己的，学生只能访问被分配的
    if current_user.role == "teacher":
        if wl.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="无权访问")
    else:
        assigned = db.query(models.Assignment).filter(
            models.Assignment.word_list_id == wl_id,
            models.Assignment.student_id == current_user.id,
        ).first()
        if not assigned:
            raise HTTPException(status_code=403, detail="此单词列表未布置给你")

    return wl


@router.delete("/{wl_id}")
def delete_word_list(
    wl_id: int,
    db: Session = Depends(get_db),
    teacher: models.User = Depends(auth.require_teacher),
):
    wl = db.query(models.WordList).filter(
        models.WordList.id == wl_id, models.WordList.teacher_id == teacher.id
    ).first()
    if not wl:
        raise HTTPException(status_code=404, detail="单词列表不存在")
    db.delete(wl)
    db.commit()
    return {"ok": True}


@router.post("/{wl_id}/words", response_model=schemas.WordOut)
def add_word(
    wl_id: int,
    word: schemas.WordIn,
    db: Session = Depends(get_db),
    teacher: models.User = Depends(auth.require_teacher),
):
    wl = db.query(models.WordList).filter(
        models.WordList.id == wl_id, models.WordList.teacher_id == teacher.id
    ).first()
    if not wl:
        raise HTTPException(status_code=404, detail="单词列表不存在")

    w = models.Word(word_list_id=wl_id, english=word.english, chinese=word.chinese)
    db.add(w)
    db.commit()
    db.refresh(w)
    return w


@router.post("/{wl_id}/words/bulk")
def add_words_bulk(
    wl_id: int,
    req: schemas.BulkWordsRequest,
    db: Session = Depends(get_db),
    teacher: models.User = Depends(auth.require_teacher),
):
    wl = db.query(models.WordList).filter(
        models.WordList.id == wl_id, models.WordList.teacher_id == teacher.id
    ).first()
    if not wl:
        raise HTTPException(status_code=404, detail="单词列表不存在")

    words = [
        models.Word(word_list_id=wl_id, english=w.english, chinese=w.chinese)
        for w in req.words
    ]
    db.add_all(words)
    db.commit()
    return {"added": len(words)}


@router.put("/{wl_id}/words/{word_id}", response_model=schemas.WordOut)
def update_word(
    wl_id: int,
    word_id: int,
    word: schemas.WordIn,
    db: Session = Depends(get_db),
    teacher: models.User = Depends(auth.require_teacher),
):
    wl = db.query(models.WordList).filter(
        models.WordList.id == wl_id, models.WordList.teacher_id == teacher.id
    ).first()
    if not wl:
        raise HTTPException(status_code=404, detail="单词列表不存在")

    w = db.query(models.Word).filter(
        models.Word.id == word_id, models.Word.word_list_id == wl_id
    ).first()
    if not w:
        raise HTTPException(status_code=404, detail="单词不存在")

    w.english = word.english
    w.chinese = word.chinese
    db.commit()
    db.refresh(w)
    return w


@router.delete("/{wl_id}/words/{word_id}")
def delete_word(
    wl_id: int,
    word_id: int,
    db: Session = Depends(get_db),
    teacher: models.User = Depends(auth.require_teacher),
):
    wl = db.query(models.WordList).filter(
        models.WordList.id == wl_id, models.WordList.teacher_id == teacher.id
    ).first()
    if not wl:
        raise HTTPException(status_code=404, detail="单词列表不存在")

    w = db.query(models.Word).filter(
        models.Word.id == word_id, models.Word.word_list_id == wl_id
    ).first()
    if not w:
        raise HTTPException(status_code=404, detail="单词不存在")

    db.delete(w)
    db.commit()
    return {"ok": True}


@router.post("/{wl_id}/assign")
def assign_to_students(
    wl_id: int,
    req: schemas.AssignRequest,
    db: Session = Depends(get_db),
    teacher: models.User = Depends(auth.require_teacher),
):
    wl = db.query(models.WordList).filter(
        models.WordList.id == wl_id, models.WordList.teacher_id == teacher.id
    ).first()
    if not wl:
        raise HTTPException(status_code=404, detail="单词列表不存在")

    # 删除旧布置，重新布置
    db.query(models.Assignment).filter(models.Assignment.word_list_id == wl_id).delete()

    for sid in req.student_ids:
        student = db.query(models.User).filter(
            models.User.id == sid, models.User.role == "student"
        ).first()
        if student:
            db.add(models.Assignment(word_list_id=wl_id, student_id=sid))

    db.commit()
    return {"ok": True}


@router.get("/{wl_id}/assigned-students", response_model=List[int])
def get_assigned_students(
    wl_id: int,
    db: Session = Depends(get_db),
    teacher: models.User = Depends(auth.require_teacher),
):
    assignments = db.query(models.Assignment).filter(
        models.Assignment.word_list_id == wl_id
    ).all()
    return [a.student_id for a in assignments]


@router.get("/student/mine", response_model=List[schemas.WordListSummary])
def get_my_word_lists(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="仅限学生访问")

    assignments = db.query(models.Assignment).filter(
        models.Assignment.student_id == current_user.id
    ).all()

    result = []
    for a in assignments:
        wl = a.word_list
        result.append(schemas.WordListSummary(
            id=wl.id,
            name=wl.name,
            created_at=wl.created_at,
            word_count=len(wl.words),
        ))
    return result
