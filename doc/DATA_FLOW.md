# 数据流转说明 (Data Flow)
## 当前数据流 (Sprint 3)
1. 用户在任意网页划选文本。
2. 用户点击右键菜单"提炼核心 Q&A"。
3. `background.js` 监听到点击事件，通过 `info.selectionText` 获取被选中的文本。
4. 通过 Fetch API 向 DeepSeek API 发起 POST 请求。
5. `background.js` 收到 API 结果后，通过 `chrome.tabs.sendMessage` 将结果发送给 `content.js`。
6. `content.js` 执行写入剪贴板 (`navigator.clipboard.writeText`) 并在页面显示 Toast 提示（3秒后自动消失）。

## 配置读取流 (Sprint 4)
1. 用户点击扩展图标，打开 `popup.html` 配置面板。
2. `popup.js` 从 `chrome.storage.local` 读取已保存的 `apiKey` 和 `prompt`，填入输入框。
3. 用户修改配置并点击保存，数据写入 `chrome.storage.local`。
4. 后续每次右键菜单触发提炼时，`background.js` 先从 `chrome.storage.local` 读取最新配置，再发起 API 请求。