# 英语单词学习平台

为英语老师和学生设计的单词背诵网站。老师布置单词，学生在线练习，支持点读、翻卡片、拼写测试。

## 功能

**老师端**
- 内置老师账号，直接登录即可
- 新建单词列表，支持手动输入、文本批量导入、图片OCR扫描
- 添加单词时可一键 AI 翻译（调用 Google 翻译）
- 将单词列表布置给指定学生

**学生端**
- 查看老师布置的单词列表
- 三种练习模式：
  - **单词列表**：浏览全部单词，支持点读
  - **翻卡片**：可选按顺序/随机，可开启5秒倒计时
  - **拼写测试**：看中文写英文
- 练习结束后显示"还不会"的单词列表，可单独再练一遍

## 技术栈

- **后端**：Python + FastAPI + SQLite
- **前端**：原生 HTML / CSS / JavaScript
- **OCR**：Tesseract
- **认证**：JWT

## 本地运行

**安装依赖**（需要 Python 3.10+）

```bash
pip3 install -r backend/requirements.txt
```

**安装 Tesseract**（macOS）

```bash
brew install tesseract
```

**启动**

```bash
cd backend
uvicorn main:app --reload --port 8001
```

浏览器打开 `http://localhost:8001`

## 账号

| 角色 | 说明 |
|------|------|
| 老师 | 账号密码在 `backend/routers/users.py` 的 `TEACHER_USERNAME` / `TEACHER_PASSWORD` |
| 学生 | 由老师在后台"管理学生账号"中创建 |

## 部署（Render 免费）

1. 将代码推送到 GitHub
2. 在 [render.com](https://render.com) 创建 Web Service，连接此仓库
3. Build Command：`pip install -r backend/requirements.txt`
4. Start Command：`cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Instance Type 选 Free，部署完成后获得公开网址
