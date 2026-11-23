(() => {
  const root = document.querySelector('[data-cfs-knowledge-results]');
  if (!root) return;
  const query = new URLSearchParams(location.search).get('q')?.trim() || '';
  if (!query) return;
  const stop = new Set(['how','do','i','to','the','a','an','of','for','with','what','is','are','can','you','and','my','on','in','de','la','el','los','las','para','como','que','des','les','une','un','comment']);
  const terms = text => (text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').match(/[a-z0-9]+/g)||[])
    .filter(t=>t.length>2&&!stop.has(t)).map(t=>t.replace(/(ing|es|s)$/,''));
  const words = terms(query);
  const docs = (window.CFS_CLEANING_KOLLEGE || []).map(doc => {
    const tokens = terms((doc.title || '') + ' ' + (doc.keywords || ''));
    const score = words.filter(w => tokens.some(t=>t.startsWith(w)||w.startsWith(t))).length;
    return {...doc,score};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,12);
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
    li.append(a);
    list.append(li);
  });
  root.replaceChildren(title,intro,list);
  root.hidden = false;
})();