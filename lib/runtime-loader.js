const loads = new Map();
function script(src) {
  if (!loads.has(src)) loads.set(src, new Promise((resolve,reject) => {
    const node = document.createElement('script'); node.src = src; node.async = true;
    node.onload = resolve; node.onerror = () => { node.remove(); loads.delete(src); reject(new Error('Game files could not load. Check your connection and try again.')); };
    document.head.append(node);
  }));
  return loads.get(src);
}
export async function loadAds() {
  for (const name of ['config','ads','ads-consent']) await script('/assets/' + name + '.js');
  return window.GameAdService;
}
export async function loadPlayer() {
  await loadAds();
  for (const name of ['catalog','arcade-save','arena-engine','arcade-engine','arena-renderer','player']) await script('/assets/' + name + '.js');
  return window.ArcadePlayer;
}
