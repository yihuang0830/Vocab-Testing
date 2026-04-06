# 📚 英语单词学习平台 / English Vocabulary Learning Platform

专为中国英语老师设计——帮助英语基础薄弱、读音不准的学生高效背单词。
老师一键布置，学生随时随地练习，每个单词都能点读发音。

> Designed for Chinese English teachers to help students who struggle with pronunciation and vocabulary retention.

---

## ✨ 核心特色 / Key Features

### 🔊 点读发音（最重要！）
每个单词都有朗读按钮，调用标准英式/美式发音，彻底解决学生"不会读"的问题。

> Every word has a pronunciation button with native English audio — solving the #1 problem for Chinese learners.

### 📷 扫描图片导入单词
纸质单词表拍照上传，OCR 自动识别英文单词，告别手动录入。

> Upload a photo of any paper word list — OCR extracts the words automatically.

### 📋 文本批量导入
直接粘贴"单词 中文"格式的文本，系统自动解析成单词表。

> Paste a list of "word — Chinese meaning" and the system parses it instantly.

### 🤖 AI 自动翻译
输入英文单词后一键翻译成中文，也可手动填写，两种方式自由切换。

> One-click AI translation (Google Translate), or type the Chinese meaning manually.

### 🃏 三种练习模式
| 模式 | 说明 |
|------|------|
| 单词列表 | 浏览全部单词，每个可点读，适合预习复习 |
| 翻卡片 | 看英文猜中文，支持随机顺序和5秒倒计时挑战 |
| 拼写测试 | 看中文写英文，即时反馈对错 |

> Three practice modes: Browse (with audio), Flashcard (random order + countdown timer), Spelling Test.

### 📊 不会的单词单独再练
翻卡片结束后，自动列出"还不会"的单词，可以专项再过一遍。

> After flashcard practice, review only the words you got wrong — targeted repetition.

### 👨‍🏫 老师/学生分账号
老师布置单词，学生只能看到分配给自己的列表，互不干扰。

> Separate teacher and student accounts. Students only see word lists assigned to them.

---

## 🚀 快速开始 / Getting Started

### 本地运行 / Run Locally

**环境要求 / Requirements**：Python 3.10+，Tesseract OCR

```bash
# 安装 Tesseract（macOS）
brew install tesseract

# 安装 Python 依赖
pip3 install -r backend/requirements.txt

# 启动
cd backend
uvicorn main:app --reload --port 8001
```

浏览器打开 `http://localhost:8001` / Open in browser: `http://localhost:8001`

---

### 在线部署 / Deploy Online（Render 免费）

1. 将代码上传到 GitHub
2. 在 [render.com](https://render.com) 用 GitHub 登录，创建 **Web Service**
3. 填写：
   - **Build Command**：`pip install -r backend/requirements.txt`
   - **Start Command**：`cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**：Free
4. 部署完成后获得公开网址，电脑、iPad、手机均可访问

---

## 👤 账号说明 / Accounts

| 角色 | 说明 |
|------|------|
| 👨‍🏫 老师 | 账号密码在 `backend/routers/users.py` 中设置，服务启动时自动创建 |
| 👨‍🎓 学生 | 由老师在后台"管理学生账号"中创建，设置用户名和初始密码 |

---

## 🛠 技术栈 / Tech Stack

| 层 | 技术 |
|----|------|
| 后端 | Python · FastAPI · SQLite · SQLAlchemy |
| 前端 | 原生 HTML / CSS / JavaScript（无框架，iPad/PC 响应式） |
| 认证 | JWT |
| OCR | Tesseract |
| 翻译 | Google Translate（deep_translator，无需 API Key） |
| 发音 | Web Speech API（浏览器内置，无需服务器） |

---

## 📁 项目结构 / Project Structure

```
Vocab Testing/
├── backend/
│   ├── main.py          # 应用入口，同时服务前端静态文件
│   ├── database.py      # SQLite 数据库连接
│   ├── models.py        # 数据表结构
│   ├── schemas.py       # API 数据格式
│   ├── auth.py          # JWT 认证
│   └── routers/
│       ├── users.py     # 账号管理
│       ├── wordlists.py # 单词列表 CRUD
│       ├── ocr.py       # 图片识别
│       └── translate.py # AI 翻译
└── frontend/
    ├── index.html       # 登录页
    ├── teacher.html     # 老师仪表盘
    ├── student.html     # 学生练习
    ├── css/styles.css   # 响应式样式
    └── js/
        ├── auth.js      # 登录与工具函数
        ├── teacher.js   # 老师端逻辑
        └── student.js   # 学生端练习逻辑
```

---

## 🎯 适用场景 / Target Users

- 🇨🇳 给中国中小学生补习英语的兼职/全职老师
- 英语基础薄弱、读音不准、记单词效率低的学生
- 需要布置纸质单词表的老师（扫图即可导入）
- 希望学生随时随地能练习的远程教学场景

> Built for Chinese tutors teaching English to young learners with weak phonics foundations.
