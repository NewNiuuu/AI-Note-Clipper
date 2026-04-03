# 需求讲解文档 (Requirements)

## 核心需求：一键提炼网页选中文本的"核心 Q&A"

### 1. 需求拆解

将一个模糊的产品想法拆解为可实现的最小技术单元：

| 需求描述 | 技术拆解 | 实现要点 |
|---------|---------|---------|
| 在任意网页选中文本 | 跨页面文本获取 | 依赖 `contextMenus` 权限 |
| 通过右键菜单触发 | 上下文菜单创建 | `chrome.contextMenus.create()` |
| 区分"有选中"和"无选中" | 菜单显示条件 | `contexts: ["selection"]` |
| 获取用户选中的文本 | 菜单点击回调 | `info.selectionText` |
| 打印到控制台验证 | 调试输出 | `console.log()` |

---

### 2. 关键技术点详解

#### 2.1 Manifest V3 Service Worker 模式

```json
"background": {
  "service_worker": "background.js"
}
```

**为什么用 Service Worker？**
- 传统扩展用 `background.html` + 持续后台脚本，内存占用高
- Manifest V3 强制使用 Service Worker，是事件驱动的临时进程
- 无事件时自动休眠，有事件时唤醒——更省资源

**调试注意**：Service Worker 的 `console.log` 输出在扩展页面的「检查」DevTools 中，**不是**网页的 DevTools。

#### 2.2 右键菜单的创建时机

```js
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ ... });
});
```

**为什么在 `onInstalled` 里创建？**
- 扩展每次更新/重启，Service Worker 可能重新加载
- `onInstalled` 确保菜单只在**首次安装**时创建一次
- 避免重复创建多个相同菜单项

#### 2.3 `contexts: ["selection"]` 的作用

```js
chrome.contextMenus.create({
  contexts: ["selection"]  // 仅在用户有选中文本时显示
});
```

如果改成 `contexts: ["page"]`，则每页右键都显示该菜单。

可选值：`["page", "selection", "link", "image"]` 等。

#### 2.4 获取选中文本

```js
chrome.contextMenus.onClicked.addListener((info, tab) => {
  const selectedText = info.selectionText;  // 用户高亮的那段文本
});
```

`info` 对象包含点击上下文的信息：
- `selectionText` — 用户选中的纯文本
- `menuItemId` — 点击的菜单项 ID（用于区分多个菜单）
- `pageUrl` — 当前页面 URL

---

### 3. 完整交互流程

```
用户操作                    浏览器/扩展内部                              输出
──────────────────────────────────────────────────────────────────────────────
1. 安装扩展        →   Service Worker 启动                      →   [仅触发一次]
                     onInstalled 事件触发
                     创建右键菜单项

2. 配置扩展        →   点击工具栏图标，打开 popup.html
                     用户输入 API Key 和自定义 Prompt
                     点击保存 → chrome.storage.local 持久化

3. 访问任意网页    →   content.js 注入到页面                    →   [静默]

4. 用户选中文本    →   浏览器检测到 selection
                     右键菜单显示"提炼核心 Q&A"

5. 点击该菜单      →   onClicked 事件触发                        →   Toast: 正在提炼中...
                     info.selectionText 拿到文本
                     从 storage 读取 API Key
                     Fetch 调用 DeepSeek API
                     收到响应
                     sendMessage 到 content.js                 →   Toast: ✅ 已复制

6. 粘贴剪贴板      →   用户 Ctrl+V                               →   提炼结果落地
```

---

### 4. Sprint 2 进阶：DeepSeek API 对接

#### 4.1 为什么用 Fetch 而非 chrome.runtime 通信？

- `background.js` 是 Service Worker，本身就可以发起网络请求
- `fetch()` 直接在后台脚本中调用，不跨进程，无额外开销
- 无需引入额外的 message passing 复杂度

#### 4.2 DeepSeek API 兼容 OpenAI 格式

```js
POST https://api.deepseek.com/chat/completions
Headers: Authorization: Bearer ${API_KEY}
Body: {
  model: "deepseek-chat",
  messages: [
    { role: "system", content: "你是一个..." },
    { role: "user",   content: "待处理对话如下：\n" + selectedText }
  ],
  stream: false
}
```

响应结构：
```json
{
  "choices": [
    {
      "message": {
        "content": "Q: ...\nA: ..."
      }
    }
  ]
}
```

#### 4.3 async/await 在 Service Worker 中的意义

- `callAIForSummary` 是异步函数，等待网络 IO 时不阻塞主线程
- Service Worker 在无事件时会休眠，异步编程自然适配这种生命周期
- `chrome.contextMenus.onClicked` 监听器声明为 `async`，内部可 `await` API 调用

---

### 5. Sprint 3 进阶：结果输出与 UI 反馈

#### 5.1 进程间通信：background → content

```
background.js (Service Worker)
        │
        │ chrome.tabs.sendMessage(tabId, {action, data})
        ▼
content.js (注入到网页)
```

为什么需要这一层？
- `background.js` 无法直接操作网页 DOM（安全隔离）
- `content.js` 和网页同属一个上下文，可以操作 DOM 和剪贴板

#### 5.2 获取当前活跃标签页

```js
const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
chrome.tabs.sendMessage(activeTab.id, { action: 'showResult', data: result });
```

注意：这里用了数组解构 `[activeTab]`，因为 `query` 返回的是标签页数组。

#### 5.3 三种消息类型

| action | 触发时机 | content.js 行为 |
|--------|---------|----------------|
| `showLoading` | API 调用前 | 显示"正在提炼中..."Toast |
| `showResult` | API 返回成功 | 先写剪贴板，再显示成功 Toast |
| `showError` | API 异常 | 显示错误信息 Toast |

#### 5.4 剪贴板写入

```js
navigator.clipboard.writeText(message.data)
  .then(() => showToast('✅ 已复制', 'success'));
```

使用浏览器原生 Clipboard API，需用户授权（大多数浏览器自动允许）。

#### 5.5 动态 Toast 的实现要点

```js
function showToast(text, type) {
  // 1. 移除已存在的 Toast，避免堆叠
  document.getElementById('ai-note-clipper-toast')?.remove();

  // 2. 创建 DOM 元素
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 20px; right: 20px;
    border-radius: 8px;
    transition: opacity 0.3s ease;
  `;

  // 3. 先插入再触发动画（保证初始状态可见）
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
  });

  // 4. 3 秒后淡出消失
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
```

**关键技巧**：先用 `appendChild` 插入隐藏状态的元素，再用 `requestAnimationFrame` 触发动画，这样可以获得平滑的淡入效果。

---

### 6. Sprint 4 进阶：配置面板与工程优化

#### 6.1 chrome.storage.local 与硬编码分离

**为什么要用 `chrome.storage`？**
- `const API_KEY = '...'` 写在代码里，每次改都要重新部署
- `chrome.storage.local` 是扩展内置的键值存储，用户可在 popup 中随时修改
- 数据以 JSON 格式持久化，扩展更新后不丢失

**读写流程：**
```js
// 写入（popup.js）
chrome.storage.local.set({ apiKey, prompt }, () => { ... });

// 读取（background.js）
chrome.storage.local.get(['apiKey', 'prompt'], (items) => {
  // items.apiKey, items.prompt
});
```

**注意**：`chrome.storage` API 是异步的，需通过回调函数获取结果。

#### 6.2 popup.html 与 toolbar action

Manifest V3 配置：
```json
"action": {
  "default_popup": "popup.html"
}
```

这使得点击工具栏图标时，不是打开一个固定页面，而是弹出 `popup.html`。

#### 6.3 防御性检查：未配置 API Key 时主动提示

```js
async function callAIForSummary(selectedText) {
  const { apiKey } = await getSettings();

  if (!apiKey) {
    // 通知用户去配置
    chrome.tabs.sendMessage(activeTab.id, {
      action: 'showError',
      data: '请先点击插件图标配置 API Key'
    });
    return null;
  }
  // ... 继续调用 API
}
```

#### 6.4 popup.js 的核心逻辑

```js
// 页面加载时：读取已保存配置填充表单
chrome.storage.local.get(['apiKey', 'prompt'], (items) => {
  if (items.apiKey) document.getElementById('apiKey').value = items.apiKey;
});

// 点击保存：将表单数据写入 storage
document.getElementById('saveBtn').addEventListener('click', () => {
  chrome.storage.local.set({ apiKey, prompt }, () => {
    // 显示保存成功反馈
  });
});
```

#### 6.5 自定义 Prompt 的优先级

```js
const systemPrompt = prompt || '默认提示词...';
```

如果用户在 popup 中填写了自定义 Prompt，就用用户的；否则使用内置默认值。这样既保留了灵活性，又不至于让小白用户困惑。

---

### 7. 当前代码的局限（为后续阶段铺垫）

| 现状 | 下一阶段需要改的地方 |
|------|-------------------|
| API Key 硬编码在代码中 ✅ 已修复 | 可增加 Key 有效性预检 |
| Toast 样式直接内联 | 可抽取为独立的 CSS 文件 |
| 仅支持 DeepSeek | 可扩展为支持多模型切换 |

---

### 8. 架构分层（V1.0 完成版）

```
┌──────────────────────────────────────────────────┐
│  popup 层 (popup.html + popup.js)                │
│  - 用户配置面板（API Key / 自定义 Prompt）        │
│  - chrome.storage.local 读写                     │
├──────────────────────────────────────────────────┤
│  UI 层 (content.js)                              │
│  - Toast 提示框（DOM 动态创建）                   │
│  - 剪贴板写入 (Clipboard API)                     │
├──────────────────────────────────────────────────┤
│  逻辑层 (background.js)                         │
│  - 菜单管理 / 事件分发                            │
│  - chrome.storage.local 读取配置                 │
│  - API 调用 / 提炼逻辑                            │
│  - 跨进程消息转发 (sendMessage)                   │
├──────────────────────────────────────────────────┤
│  数据层 (chrome.storage.local)                   │
│  - apiKey / prompt 持久化存储                     │
└──────────────────────────────────────────────────┘
```

**各脚本职责划分**

| 职责 | background.js | content.js | popup.js |
|------|---------------|------------|----------|
| 右键菜单管理 | ✅ | ❌ | ❌ |
| 调用外部 API | ✅ | ❌ | ❌ |
| 读取 storage 配置 | ✅ | ❌ | ✅ |
| 写入 storage 配置 | ❌ | ❌ | ✅ |
| 操作网页 DOM | ❌ | ✅ | ❌ |
| 写入剪贴板 | ❌ | ✅ | ❌ |
| 显示 Toast | ❌ | ✅ | ❌ |
