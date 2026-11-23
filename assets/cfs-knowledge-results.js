(async () => {
  const root = document.querySelector('[data-cfs-knowledge-results]');
  if (!root) return;
  const query = new URLSearchParams(location.search).get('q')?.trim() || '';
  if (!query) return;
  const docs = await window.CfsGuideSearch.search(query,12);
  if (!docs.length) {
    root.hidden = true;
    return;
  }
  const title = document.createElement('h2');
  title.textContent = 'Cleaning guides and related information';
  const intro = document.createElement('p');
  intro.textContent = 'Related documents from Cleaning Kollege. Open each document for full instructions and safety information.';
  const list = document.createElement('ul');
  list.className = 'cfs-knowledge-list';
  docs.forEach(doc => {
    let url;
    try { url = new URL(doc.url,location.origin); } catch { return; }
    if(url.protocol !== 'https:' && url.protocol !== 'http:')return;
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = url.href;
    a.textContent = doc.title;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    if(doc.page)a.textContent+=' · p. '+doc.page;
    li.append(a);
    if(doc.excerpt){const excerpt=document.createElement('p');excerpt.textContent=doc.excerpt;li.append(excerpt);}
    list.append(li);
  });
  root.replaceChildren(title,intro,list);
  root.hidden = false;
})();