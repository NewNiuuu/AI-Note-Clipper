document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['apiKey', 'prompt'], (items) => {
    if (items.apiKey) {
      document.getElementById('apiKey').value = items.apiKey;
    }
    if (items.prompt) {
      document.getElementById('prompt').value = items.prompt;
    }
  });

  document.getElementById('saveBtn').addEventListener('click', () => {
    const apiKey = document.getElementById('apiKey').value.trim();
    const prompt = document.getElementById('prompt').value.trim();

    chrome.storage.local.set({ apiKey, prompt }, () => {
      const status = document.getElementById('status');
      status.classList.add('show');
      setTimeout(() => status.classList.remove('show'), 2000);
    });
  });
});