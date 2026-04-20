export function initGalleryToggle() {
  const appBtn = document.getElementById('view-mode-app-btn');
  const webBtn = document.getElementById('view-mode-web-btn');
  const appView = document.getElementById('gallery-app-view');
  const webView = document.getElementById('gallery-web-view');

  if (!appBtn || !webBtn || !appView || !webView) return;

  function setViewMode(mode: 'app' | 'web') {
    if (mode === 'app') {
      // Button states
      appBtn?.classList.add('bg-surface', 'shadow-sm');
      appBtn?.classList.remove('text-muted');
      webBtn?.classList.remove('bg-surface', 'shadow-sm');
      webBtn?.classList.add('text-muted');

      // Show App, Hide Web
      appView?.classList.remove('hidden');
      appView?.classList.add('show-grid');
      webView?.classList.add('hidden');
    } else {
      // Button states
      webBtn?.classList.add('bg-surface', 'shadow-sm');
      webBtn?.classList.remove('text-muted');
      appBtn?.classList.remove('bg-surface', 'shadow-sm');
      appBtn?.classList.add('text-muted');

      // Show Web, Hide App
      webView?.classList.remove('hidden');
      appView?.classList.add('hidden');
      appView?.classList.remove('show-grid');
    }
  }

  appBtn.addEventListener('click', () => setViewMode('app'));
  webBtn.addEventListener('click', () => setViewMode('web'));
}
