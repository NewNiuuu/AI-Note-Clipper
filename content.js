chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'showLoading') {
    showToast('正在提炼中...', 'loading');
  } else if (message.action === 'showResult') {
    navigator.clipboard.writeText(message.data).then(() => {
      showToast('✅ 核心提炼已复制到剪贴板', 'success');
    });
  } else if (message.action === 'showError') {
    showToast(`❌ 出错：${message.data}`, 'error');
  }
});

function showToast(text, type) {
  const existing = document.getElementById('ai-note-clipper-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'ai-note-clipper-toast';
  toast.textContent = text;

  const colors = {
    loading: 'rgba(0, 0, 0, 0.75)',
    success: 'rgba(34, 139, 34, 0.9)',
    error: 'rgba(178, 34, 34, 0.9)'
  };

  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${colors[type] || colors.loading};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
    z-index: 2147483647;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    opacity: 0;
    transform: translateY(-10px);
    transition: opacity 0.3s ease, transform 0.3s ease;
  `;

  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}