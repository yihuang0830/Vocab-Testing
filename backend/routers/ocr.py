import re
import io
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from PIL import Image
import pytesseract
from auth import require_teacher
import models

router = APIRouter(prefix="/api/ocr", tags=["ocr"])


def extract_english_words(text: str) -> list[str]:
    """从OCR文本中提取英文单词，去重并过滤噪音"""
    # 按行分割，每行可能是一个单词或短语
    lines = text.strip().split("\n")
    words = []
    seen = set()

    for line in lines:
        line = line.strip()
        # 只保留主要由英文字母组成的行（允许空格、连字符、撇号）
        cleaned = re.sub(r"[^a-zA-Z\s\-']", "", line).strip()
        if cleaned and len(cleaned) >= 2:
            # 规范化空格
            cleaned = re.sub(r"\s+", " ", cleaned)
            key = cleaned.lower()
            if key not in seen:
                seen.add(key)
                words.append(cleaned)

    return words


@router.post("/scan")
async def scan_image(
    file: UploadFile = File(...),
    _: models.User = Depends(require_teacher),
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="请上传图片文件")

    contents = await file.read()
    try:
        image = Image.open(io.BytesIO(contents))
    except Exception:
        raise HTTPException(status_code=400, detail="无法读取图片")

    # 转为 RGB（处理 PNG 透明通道等情况）
    image = image.convert("RGB")

    # 使用英文语言包进行 OCR
    raw_text = pytesseract.image_to_string(image, lang="eng")
    words = extract_english_words(raw_text)

    if not words:
        raise HTTPException(status_code=422, detail="未能从图片中识别出英文单词，请确保图片清晰")

    return {"words": words, "raw": raw_text}
