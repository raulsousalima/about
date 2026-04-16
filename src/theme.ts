export function initTheme() {
  const toggleBtn = document.getElementById('theme-toggle');
  const icon = document.getElementById('theme-icon');
  
  if (!toggleBtn || !icon) return;

  // Retrieve theme safely
  const savedTheme = localStorage.getItem('app-theme');
  const currentTheme = savedTheme ? savedTheme : 'dark';

  const applyTheme = (theme: string) => {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      icon.className = 'ti ti-sun text-2xl';
    } else {
      document.documentElement.removeAttribute('data-theme');
      icon.className = 'ti ti-moon text-2xl';
    }
  };

  // Apply on load
  applyTheme(currentTheme);

  // Bind click event
  toggleBtn.addEventListener('click', () => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const newTheme = isLight ? 'dark' : 'light';
    applyTheme(newTheme);
    localStorage.setItem('app-theme', newTheme);
  });
}
