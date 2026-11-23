if (!customElements.get('cfs-bestsellers')) {
  customElements.define('cfs-bestsellers', class extends HTMLElement {
    async connectedCallback() {
      if (this.children.length) return;
      try {
        const response = await fetch(this.dataset.url);
        if (!response.ok) return;
        const page = new DOMParser().parseFromString(await response.text(), 'text/html');
        const grid = page.querySelector('.cfs2-products-grid');
        if (grid && this.isConnected) this.replaceChildren(grid);
      } catch { /* The collection link remains available. */ }
    }
  });
}
