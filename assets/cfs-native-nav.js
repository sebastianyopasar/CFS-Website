(() => {
  if (window.cfsNativeNavReady) return;
  window.cfsNativeNavReady = true;
  const openMenus = '.cfs-calc-submenu[open], .cfs-nav-main[open], .cfs-language[open]';
  document.addEventListener('click', event => {
    document.querySelectorAll(openMenus).forEach(menu => {
      if (!menu.contains(event.target)) menu.open = false;
    });
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const menu = event.target.closest(openMenus);
    if (menu) {
      menu.open = false;
      menu.querySelector('summary').focus();
    }
  });
})();
