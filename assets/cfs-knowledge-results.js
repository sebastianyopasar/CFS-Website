(async () => {
  const root = document.querySelector('[data-cfs-knowledge-results]');
  const query = new URLSearchParams(location.search).get('q')?.trim();
  if (!root || !query) return;
  const docs = await window.CfsGuideSearch.search(query, 12);
  function cards(guides) {
    const list = document.createElement('ul');
    list.className = 'cfs-guide-cards';
    for (const doc of guides) {
      const url = URL.parse(doc.url, location.origin);
      if (!url || !['https:', 'http:'].includes(url.protocol)) continue;
      const row = document.createElement('li');
      const link = document.createElement('a');
      link.href = url.href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      const source = document.createElement('small');
      source.textContent = doc.page ? 'Cleaning Kollege · PDF · p. '+doc.page : 'Cleaning Kollege · PDF';
      const title = document.createElement('strong');
      title.textContent = doc.title;
      link.append(source, title);
      if (doc.excerpt) {
        const excerpt = document.createElement('p');
        excerpt.textContent = doc.excerpt.replace(/^[•·▪]\s*/, '');
        link.append(excerpt);
      }
      row.append(link);
      list.append(row);
    }
    return list;
  }
  if (!docs.length) return;
  const heading = document.createElement('h2');
  heading.textContent = 'Cleaning guides';
  root.replaceChildren(heading, cards(docs.slice(0, 3)));
  if (docs.length > 3) {
    const more = document.createElement('details');
    const label = document.createElement('summary');
    label.textContent = 'More guides ('+(docs.length-3)+')';
    more.append(label, cards(docs.slice(3)));
    root.append(more);
  }
  root.hidden = false;
})();
