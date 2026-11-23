/* CFS 2.0 public Quick Add by exact SKU. Uses Shopify Ajax APIs only.
   This never calculates B2B discounts or starts checkout. */
(() => {
  const root = () => (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
  const norm = (value) => String(value || '').trim().toUpperCase();
  const message = (form, key, fallback) => form.dataset[key] || fallback;

  async function requestJson(url, options = {}) {
    const response = await fetch(url, { credentials: 'same-origin', ...options });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const error = new Error(data.description || data.message || `Request failed (${response.status})`);
      error.status = response.status;
      throw error;
    }
    return response.json();
  }

  async function findExactVariant(sku) {
    const query = new URLSearchParams({q: sku, 'resources[type]': 'product', 'resources[limit]': '10'});
    const data = await requestJson(`${root()}search/suggest.json?${query}`);
    const products = data?.resources?.results?.products || [];
    const matches = [];
    for (const product of products) {
      if (!product.handle) continue;
      const full = await requestJson(`${root()}products/${encodeURIComponent(product.handle)}.js`);
      for (const variant of (full.variants || [])) {
        if (norm(variant.sku) === sku) matches.push({ variant, handle: product.handle });
      }
    }
    if (matches.length > 1) return { state: 'ambiguous' };
    if (matches.length === 0) return { state: 'not-found' };
    const item = matches[0];
    if (!item.variant.available) return { state: 'unavailable' };
    if (item.variant.requires_selling_plan) return { state: 'requires-plan', handle: item.handle };
    return { state: 'found', id: item.variant.id };
  }

  function init(form) {
    if (form.dataset.cfs2Ready) return;
    form.dataset.cfs2Ready = 'true';
    const button = form.querySelector('button[type=submit]');
    const status = form.querySelector('[data-cfs2-status]');
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const sku = norm(form.elements.sku.value);
      const qty = Number(form.elements.quantity.value);
      if (!sku || sku.length > 100 || !Number.isInteger(qty) || qty < 1 || qty > 1000) {
        status.textContent = message(form,'msgInvalid','Enter a valid SKU and quantity.');
        return;
      }
      button.disabled = true;
      status.textContent = message(form,'msgSearching','Checking SKU...');
      try {
        const result = await findExactVariant(sku);
        if (result.state !== 'found') {
          const key = result.state === 'ambiguous' ? 'msgAmbiguous' : result.state === 'unavailable' ? 'msgUnavailable' : result.state === 'requires-plan' ? 'msgPlan' : 'msgNotFound';
          status.textContent = message(form,key,'Please view the product or contact us for assistance.');
          return;
        }
        await requestJson(`${root()}cart/add.js`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ items: [{ id: result.id, quantity: qty }] })
        });
        status.textContent = message(form,'msgAdded','Added to cart. Opening cart...');
        window.location.assign(`${root()}cart`);
      } catch (error) {
        console.error('CFS Quick Add:', error);
        status.textContent = message(form,'msgError','Could not add this item. Please try searching for it or contact us.');
      } finally {
        button.disabled = false;
      }
    });
  }
  const initAll = rootElement => (rootElement || document).querySelectorAll('[data-cfs2-sku-form]').forEach(init);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => initAll());
  else initAll();
  document.addEventListener('shopify:section:load', event => initAll(event.target));
})();
