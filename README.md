# FileSage - 智能文件管家

> 一个基于 Flask + 原生前端的智能文件管理 Web 应用，支持文件上传、分类管理、智能搜索、数据可视化等功能。

## ✨ 功能特性

- 📁 **文件上传** - 支持拖拽上传、多文件批量上传
- 🗂️ **智能分类** - 自动识别文件类型（图片、文档、视频、音频、代码、压缩包等）
- 🔍 **实时搜索** - 300ms 防抖搜索，快速定位文件
- 📊 **数据可视化** - 仪表盘展示文件统计、类型分布、分类占比
- 🎨 **酷炫 UI** - 赛博朋克深色主题、毛玻璃效果、粒子动画背景
- 🌗 **主题切换** - 深色/亮色主题一键切换
- 📱 **响应式设计** - 适配桌面端和移动端
- 👁️ **文件预览** - 支持图片、文本、代码、视频、音频在线预览
- 📋 **多种视图** - 网格视图 / 列表视图自由切换
- ⌨️ **键盘快捷键** - Esc 关闭模态框，Ctrl+K 聚焦搜索

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Python Flask |
| 前端 | HTML5 + CSS3 + Vanilla JavaScript |
| 数据库 | SQLite |
| 样式 | CSS Variables + Glassmorphism |

## 🚀 快速开始

### 环境要求

- Python 3.7+
- pip

### 安装与运行

```bash
# 克隆仓库
git clone https://github.com/your-username/FileSage.git
cd FileSage

# 安装依赖
pip install -r requirements.txt

# 启动服务
python app.py
```

访问 http://127.0.0.1:5000 即可使用。

## 📁 项目结构

```
FileSage/
├── app.py                 # Flask 后端主文件
├── requirements.txt       # Python 依赖
├── .gitignore             # Git 忽略配置
├── uploads/               # 上传文件存储目录
├── static/
│   ├── css/
│   │   └── style.css      # 酷炫前端样式
│   └── js/
│       └── app.js         # 前端交互逻辑
└── templates/
    └── index.html         # 主页面模板
```

## 📡 API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/files` | 获取文件列表（支持分类筛选、搜索、排序） |
| POST | `/api/upload` | 上传文件（支持多文件，最大 100MB） |
| DELETE | `/api/files/<filename>` | 删除文件 |
| GET | `/api/stats` | 获取文件统计信息 |
| GET | `/api/files/<filename>/preview` | 预览文件 |

## 📄 License

MIT License
