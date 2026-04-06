from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

PORT = int(os.environ.get("PORT", 8001))

from database import engine, SessionLocal
import models
from routers import users, wordlists, ocr, translate

# 创建数据库表
models.Base.metadata.create_all(bind=engine)

# 内置老师账号初始化
_db = SessionLocal()
try:
    users.seed_teacher(_db)
finally:
    _db.close()

app = FastAPI(title="英语单词学习平台")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(users.router)
app.include_router(wordlists.router)
app.include_router(ocr.router)
app.include_router(translate.router)

# 服务前端静态文件
frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")
frontend_dir = os.path.abspath(frontend_dir)

if os.path.exists(frontend_dir):
    app.mount("/static", StaticFiles(directory=os.path.join(frontend_dir, "css"), html=False), name="css")
    app.mount("/js", StaticFiles(directory=os.path.join(frontend_dir, "js"), html=False), name="js")

    @app.get("/")
    def serve_index():
        return FileResponse(os.path.join(frontend_dir, "index.html"))

    @app.get("/teacher")
    def serve_teacher():
        return FileResponse(os.path.join(frontend_dir, "teacher.html"))

    @app.get("/student")
    def serve_student():
        return FileResponse(os.path.join(frontend_dir, "student.html"))
