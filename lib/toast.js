// Toast notification system
let toastContainer = null;
let toastId = 0;

export const showToast = (message, type = 'info', duration = 4000) => {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      pointer-events: none;
    `;
    document.body.appendChild(toastContainer);
  }

  const id = toastId++;
  const toastEl = document.createElement('div');
  toastEl.className = `toast toast-${type}`;
  toastEl.style.cssText = `
    pointer-events: auto;
    margin-top: 12px;
    animation: slideIn 0.3s ease-out;
  `;

  const bgColor = {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6'
  }[type] || '#3b82f6';

  const icon = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  }[type] || 'ℹ';

  toastEl.innerHTML = `
    <div style="
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: #0d1526;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
      color: #f9fafb;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
      font-size: 14px;
      border-left: 3px solid ${bgColor};
      max-width: 400px;
    ">
      <span style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        background: ${bgColor};
        color: white;
        border-radius: 50%;
        flex-shrink: 0;
        font-weight: 600;
        font-size: 12px;
      ">${icon}</span>
      <span>${message}</span>
    </div>
  `;

  toastContainer.appendChild(toastEl);

  if (duration > 0) {
    setTimeout(() => {
      toastEl.style.animation = 'slideOut 0.3s ease-out forwards';
      setTimeout(() => {
        toastEl.remove();
      }, 300);
    }, duration);
  }

  return () => {
    toastEl.style.animation = 'slideOut 0.3s ease-out forwards';
    setTimeout(() => toastEl.remove(), 300);
  };
};

export const showSuccessToast = (message, duration = 4000) => showToast(message, 'success', duration);
export const showErrorToast = (message, duration = 4000) => showToast(message, 'error', duration);
export const showWarningToast = (message, duration = 4000) => showToast(message, 'warning', duration);
export const showInfoToast = (message, duration = 4000) => showToast(message, 'info', duration);
