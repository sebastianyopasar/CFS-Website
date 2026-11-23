(() => {
  if (window.CfsGuideSearch) return;
  const asset = document.currentScript.dataset.pages;
  const stop = new Set('a an the is are how does do what when can should would i my you for to in of and or with which on use la le les de des que para como'.split(' '));
  function tokens(value) {
    return (value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').match(/[a-z0-9]+/g)||[])
      .filter(word=>word.length>1 && !stop.has(word)).map(word=>word.replace(/(\w)\1ing$/,'$1').replace(/(\w{3,})ing$/,'$1').replace(/(\w{3,})s$/,'$1'));
  }
  let pending;
  function load() {
    if (!pending) pending=fetch(asset).then(response=>{
      if(!response.ok)throw Error('Guide index unavailable');
      return response.json();
    }).catch(()=>{pending=null;return {};});
    return pending;
  }
  function passages(page) {
    const blocks=[];
    let block='';
    for (const line of page.split('\n')) {
      if (block && (/[.!?:]$/.test(block) || /^[•▪●\d]|^[-–] /.test(line) || (block.length<80 && !/[.,;:]$/.test(block) && /^[A-Z]/.test(line)))) {
        blocks.push(block);block='';
      }
      block+=(block?' ':'')+line;
    }
    if(block)blocks.push(block);
    return blocks.flatMap(x=>x.split(/(?<=[.!?])\s+(?=[A-Z])/)).map(x=>x.trim());
  }
  const cache=new Map();
  async function search(query, limit) {
    const words=[...new Set(tokens(query))];
    if(!words.length)return [];
    const pages=await load();
    const matches=[];
    const hits=text=>{const set=new Set(tokens(text));return words.filter(w=>set.has(w)).length;};
    for(const doc of window.CFS_CLEANING_KOLLEGE||[]) {
      const titleHits=hits(doc.title+' '+(doc.keywords||''));
      let best=null, pageHits=0, matchedPage=0;
      if(pages[doc.url] && !cache.has(doc.url)){
        cache.set(doc.url,pages[doc.url].map(text=>({words:new Set(tokens(text)),passages:passages(text).map(text=>({text,words:new Set(tokens(text))}))})));
      }
      (cache.get(doc.url)||[]).forEach((page,i)=>{
        const coverage=words.filter(word=>page.words.has(word)).length;
        if(coverage>pageHits){pageHits=coverage;matchedPage=i+1;}
        for(const passage of page.passages) {
          const text=passage.text;
          if(text.length<26 || text.length>430 || text.endsWith('?') || text.toLowerCase()===doc.title.toLowerCase()) continue;
          const n=words.filter(word=>passage.words.has(word)).length;
          if(n && (!best || n>best.hits)) best={hits:n,text,page:i+1};
        }
      });
      if(!titleHits && pageHits<Math.min(2,words.length))continue;
      const score=titleHits*3+(best?.hits||0)*2+pageHits;
      const excerpt=best && best.hits>=Math.min(words.length,2) ? best:null;
      const url=new URL(doc.url);
      const page=excerpt?.page || (pageHits>=Math.min(2,words.length)?matchedPage:0);
      if(page)url.hash='page='+page;
      matches.push({...doc,url:url.href,score,page,excerpt:excerpt?.text});
    }
    return matches.sort((a,b)=>b.score-a.score || a.title.localeCompare(b.title)).slice(0,limit);
  }
  window.CfsGuideSearch={search};
})();
