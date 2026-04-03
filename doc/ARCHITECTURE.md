# 项目架构说明 (Architecture)
## 目录结构 (V1.0)
AI-Note-Clipper/
├── manifest.json       # 扩展核心配置（Manifest V3）
├── background.js       # Service Worker：右键菜单 + API 调用 + 消息转发
├── content.js          # 内容脚本：Toast 提示 + 剪贴板写入
├── popup.html         # 配置面板页面
├── popup.js           # 配置逻辑：chrome.storage.local 读写
├── README.md          # 项目说明文档
├── doc/               # 开发文档
│   ├── CLAUDE.md      # 开发阶段追踪（Claude Code 使用）
│   ├── ARCHITECTURE.md # 架构说明
│   ├── DATA_FLOW.md   # 数据流转说明
│   └── REQUIREMENTS.md # 需求讲解文档
└── img/               # 图片资源（README 中的展示图）