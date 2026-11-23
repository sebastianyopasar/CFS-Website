(() => {
  const icons = {
    product: '<path d="m3 7 9-5 9 5v10l-9 5-9-5Zm0 0 9 5 9-5m-9 5v10"/>',
    document: '<path d="M5 2h9l5 5v15H5Zm9 0v6h5M8 12h8m-8 4h6"/>',
    collection: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    page: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/>',
    article: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M6 8h12M6 12h5m3 0h4M6 16h5m3 0h4"/>'
  };
  function dilutionProduct(query) {
    const pattern = /\b(?:(?:taux|tasa|proporci[oó]n|ratio)\s+(?:de\s+)?)?dil{1,2}(?:utions?|uci[oó]n(?:es)?|uciones)(?:\s+(?:rates?|ratios?|instructions?))?\b/i;
    if (!pattern.test(query)) return '';
    return query.replace(pattern, ' ').trim().replace(/^(?:for|of|pour|de|del|para)\s+|\s+(?:for|of|pour|de|del|para)$/gi, '').trim();
  }
  function openDilutions() {
    if (location.hash !== '#cfs-dilutions') return;
    const tab = document.querySelector('input[data-cfs-field="dilutions"]');
    if (tab) {
      tab.checked = true;
      tab.focus({preventScroll:true});
      tab.closest('.cfs-description').scrollIntoView({block:'start'});
    }
  }
  openDilutions();
  window.addEventListener('hashchange',openDilutions);
  document.addEventListener('click',event => {
    const link = event.target.closest?.('a[href]');
    if (link && link.href === location.href) openDilutions();
  });
  async function dilutionResult(item, signal, searchAction) {
    try {
      const product = new URL(item.url, location.origin);
      if (product.origin !== location.origin) return null;
      const prefix = new URL(searchAction).pathname.replace(/\/search\/?$/, '');
      if (prefix && product.pathname.startsWith('/products/')) product.pathname = prefix + product.pathname;
      const endpoint = new URL(product);
      endpoint.searchParams.set('view','cfs-dilutions');
      const response = await fetch(endpoint,{signal});
      if (!response.ok) return null;
      const lines = await response.json();
      if (!Array.isArray(lines) || !lines.some(line => typeof line === 'string' && line.trim())) return null;
      product.hash = 'cfs-dilutions';
      return {...item,url:product.href,title:item.title + ' — ' + lines.find(line => typeof line === 'string' && line.trim())};
    } catch { return null; }
  }
  function resultRow(item, type) {
    const link = document.createElement('a');
    link.className = 'cfs2-result';
    link.href = item.url;
    if (!['https:', 'http:'].includes(link.protocol)) return null;
    const media = document.createElement('span');
    media.className = 'cfs2-result-media';
    media.setAttribute('aria-hidden', 'true');
    media.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">' + icons[type] + '</svg>';
    if (type === 'product') {
      const photo = item.featured_image?.url || item.image?.url || item.image;
      if (typeof photo === 'string' && photo) {
        const image = new Image(38, 38);
        image.alt = '';
        image.addEventListener('error', () => image.remove(), { once: true });
        image.src = photo;
        media.append(image);
      }
    }
    const label=document.createElement('span');
    label.textContent=item.title || item.text || '';
    if(item.excerpt){
      const source=document.createElement('small');
      source.style.display='block';
      source.textContent=item.faq ? item.excerpt : 'p. '+item.page+' · '+item.excerpt;
      label.append(source);
    }
    link.append(media,label);
    return link;
  }
  function group(title, items, type) {
    const rows = (items || []).map(item => resultRow(item, type)).filter(Boolean);
    if (!rows.length) return [];
    const section = document.createElement('section');
    const heading = document.createElement('h3');
    heading.textContent = title;
    section.append(heading, ...rows);
    return [section];
  }
  // Every search submission opens the complete results page; suggestions are optional.
  function searchUrl(form, query) {
    const url = new URL(form.action, location.origin);
    url.searchParams.set('q', query);
    url.searchParams.set('options[prefix]', 'last');
    return url.href;
  }
  document.querySelectorAll('[data-cfs2-smart-search]').forEach(form => {
    const input = form.querySelector('input[type="search"]');
    const panel = form.querySelector('[data-cfs2-smart-search-results]');
    let timer;
    let controller;
    let firstMatch;
    form.addEventListener('submit', event => {
      const query = input.value.trim();
      if (!query) { event.preventDefault(); return; }
      // Navigates immediately, even if autocomplete has not finished loading.
      event.preventDefault();
      location.assign(searchUrl(form, query));
    });
    let revision = 0;
    const hide = () => { revision++; firstMatch = null; controller?.abort(); clearTimeout(timer); panel.hidden = true; };
    input.addEventListener('input', () => {
      hide();
      const query = input.value.trim();
      if (query.length < 2) return;
      const current = revision;
      const product = dilutionProduct(query);
      controller = new AbortController();
      const signal = controller.signal;
      timer = setTimeout(async () => {
        const guideRequest = Promise.all([window.CfsGuideSearch.search(query,5), window.CfsGuideSearch.searchFaq(query,3)]);
        let results = {};
        try {
          const url = new URL(form.action.replace(/\/$/, '') + '/suggest.json');
          url.search = new URLSearchParams({q: product || query, 'resources[type]': product ? 'product' : 'product,collection,page,article', 'resources[limit]': '6'});
          const response = await fetch(url,{signal});
          if (response.ok) results = (await response.json()).resources.results;
        } catch { /* Local guides remain searchable when Shopify is unavailable. */ }
        if (current !== revision) return;
        const matches = product ? (await Promise.all((results.products || []).slice(0,4).map(item => dilutionResult(item,signal,form.action)))).filter(Boolean) : [];
        if (current !== revision) return;
        firstMatch = matches.length === 1 ? matches[0] : null;
        const [guides, faqs] = await guideRequest;
        if (current !== revision) return;
        const sections = [
          ...group(form.dataset.dilutions, matches, 'product'),
          ...group('FAQs', faqs, 'page'),
          ...group(form.dataset.guides, guides, 'document'),
          ...group(form.dataset.pages, results.pages, 'page'),
          ...group(form.dataset.articles, results.articles, 'article'),
          ...group(form.dataset.products, results.products, 'product'),
          ...group(form.dataset.collections, results.collections, 'collection')
        ];
        panel.replaceChildren(...sections);
        if (!sections.length) panel.textContent = form.dataset.empty;
        const all = document.createElement('a');
        all.className = 'cfs2-all-search-results';
        all.href = searchUrl(form, query);
        all.textContent = 'View all results for “' + query + '”';
        panel.append(all);
        panel.hidden = false;
      }, 220);
    });
    form.addEventListener('keydown', event => { if (event.key === 'Escape') hide(); });
    document.addEventListener('click', event => { if (!form.contains(event.target)) hide(); });
  });
})();

