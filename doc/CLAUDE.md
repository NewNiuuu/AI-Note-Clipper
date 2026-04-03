# 项目名称：AI-Note-Clipper (AI 笔记提炼器)
## 1. 项目核心目标
这是一个 Edge 浏览器插件（Manifest V3）。用于在网页划选冗长的对话文本，通过右键菜单触发，后台调用大模型 API 将其精简提炼为"核心问题+核心结论"，并输出到剪贴板或文件中。
## 2. 核心技术栈
- 纯原生 HTML / CSS / JavaScript (无需前端框架)
- Chrome Extension API (Manifest V3)
- Fetch API
## 3. 全局维护指令 (Claude Code Skills)
* **Skill 1 [状态同步]**：当项目进入新阶段，主动更新本文件中的"当前开发阶段"。
* **Skill 2 [架构维护]**：当文件结构或核心职责变化时，同步更新 `ARCHITECTURE.md`。
* **Skill 3 [数据流追踪]**：当数据获取、传递、处理逻辑变化时，同步更新 `DATA_FLOW.md`。
## 4. 当前开发阶段
- [x] 需求分析与方案设计
- [x] 阶段 1：项目骨架搭建与 Manifest V3 配置
- [x] 阶段 2：大模型 API 对接与提炼逻辑实现
- [x] 阶段 3：提炼结果处理（复制到剪贴板/UI 提示）
- [x] 阶段 4：配置界面与工程优化