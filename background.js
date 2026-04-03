chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "extract-qa",
    title: "提炼核心 Q&A",
    contexts: ["selection"]
  });
});

async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['apiKey', 'prompt'], (items) => {
      resolve(items);
    });
  });
}

async function ensureContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });
  } catch (e) {
    // 注入失败不影响主流程
  }
}

async function safeSendMessage(tabId, message) {
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch (err) {
    // content script 尚未加载，尝试主动注入后再发
    await ensureContentScript(tabId);
    try {
      await chrome.tabs.sendMessage(tabId, message);
    } catch (retryErr) {
      console.warn('消息发送失败:', retryErr.message);
    }
  }
}

async function callAIForSummary(selectedText, activeTab) {
  const { apiKey, prompt } = await getSettings();

  if (!apiKey) {
    await safeSendMessage(activeTab.id, {
      action: 'showError',
      data: '请先点击插件图标配置 API Key'
    });
    return null;
  }

  const systemPrompt = prompt || '你是一个高效的知识提炼助手。用户会输入一段人机对话。请你剥离所有冗余解释、客套话和细节，仅提取核心逻辑。必须严格按照以下格式输出，总字数尽量简短：\nQ: [将原始问题压缩为一句核心疑问]\nA: [将回答压缩为一句最直接的结论或方法]';

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: '待处理对话如下：\n' + selectedText }
      ],
      stream: false
    })
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "extract-qa") {
    const selectedText = info.selectionText;

    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

      await safeSendMessage(activeTab.id, { action: 'showLoading' });

      console.log('正在调用 DeepSeek API，请稍候...');

      const result = await callAIForSummary(selectedText, activeTab);

      if (result) {
        await safeSendMessage(activeTab.id, { action: 'showResult', data: result });
        console.log('💡 AI 提炼结果：\n', result);
      }
    } catch (error) {
      console.error('API 调用出错：', error);
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await safeSendMessage(activeTab.id, { action: 'showError', data: error.message });
    }
  }
});