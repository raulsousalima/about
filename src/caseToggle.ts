// App/Web gallery switch (Daycoval). The buttons are a ui-segmented radiogroup:
// state lives in aria-checked + roving tabindex; arrow keys move the selection.
export function initGalleryToggle() {
  const appBtn = document.getElementById('view-mode-app-btn');
  const webBtn = document.getElementById('view-mode-web-btn');
  const appView = document.getElementById('gallery-app-view');
  const webView = document.getElementById('gallery-web-view');

  if (!appBtn || !webBtn || !appView || !webView) return;

  function setViewMode(mode: 'app' | 'web') {
    const app = mode === 'app';
    for (const [btn, on] of [[appBtn!, app], [webBtn!, !app]] as const) {
      btn.setAttribute('aria-checked', String(on));
      btn.tabIndex = on ? 0 : -1;
    }
    appView!.classList.toggle('hidden', !app);
    appView!.classList.toggle('show-grid', app);
    webView!.classList.toggle('hidden', app);
  }

  appBtn.addEventListener('click', () => setViewMode('app'));
  webBtn.addEventListener('click', () => setViewMode('web'));
  appBtn.parentElement!.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    const toWeb = appBtn.getAttribute('aria-checked') === 'true';
    setViewMode(toWeb ? 'web' : 'app');
    (toWeb ? webBtn : appBtn).focus();
  });
}
