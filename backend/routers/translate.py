from fastapi import APIRouter, HTTPException, Depends
from deep_translator import GoogleTranslator
import schemas
import auth
import models

router = APIRouter(prefix="/api/translate", tags=["translate"])


@router.post("", response_model=schemas.TranslateResponse)
def translate(
    req: schemas.TranslateRequest,
    _: models.User = Depends(auth.require_teacher),
):
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="请输入要翻译的内容")

    try:
        result = GoogleTranslator(source="en", target="zh-CN").translate(text)
        return schemas.TranslateResponse(translation=result)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"翻译失败，请检查网络连接或手动输入中文：{str(e)}")
