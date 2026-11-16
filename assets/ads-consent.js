/* Shared Next.js consent bridge. No provider script loads without opt-in. */
(function (root) {
  const KEY = 'gumdrop-grid-ad-choice-v1';
  const optedIn = () => { try { return localStorage.getItem(KEY) === 'yes'; } catch { return false; } };
  const loadScript = (src, attrs = {}) => new Promise((resolve,reject) => {
    const node=document.createElement('script');node.src=src;node.async=true;node.crossOrigin='anonymous';for(const [k,v]of Object.entries(attrs))node.setAttribute(k,v);
    const timer=setTimeout(()=>{node.remove();reject(new Error('Ad service unavailable'));},12000);node.onload=()=>{clearTimeout(timer);resolve();};node.onerror=()=>{clearTimeout(timer);node.remove();reject(new Error('Ad service unavailable'));};document.head.append(node);
  });
  async function consent() {
    if (!optedIn()) return false;
    if (typeof root.GumdropConsentReady==='function') return !!(await root.GumdropConsentReady());
    if (!root.GumdropConfig.cmpUrl) return false;
    if(typeof root.__tcfapi!=='function')await loadScript(root.GumdropConfig.cmpUrl);
    if(typeof root.__tcfapi!=='function')return false;
    return new Promise(resolve=>{
      let done=false;const finish=(allowed,id)=>{if(done)return;done=true;clearTimeout(timer);if(id!=null)root.__tcfapi('removeEventListener',2,()=>{},id);resolve(allowed&&optedIn());};
      const timer=setTimeout(()=>finish(false),20000);
      root.__tcfapi('addEventListener',2,(data,success)=>{if(success&&data&&['tcloaded','useractioncomplete'].includes(data.eventStatus))finish(data.gdprApplies===false||(data.gdprApplies===true&&data.vendor?.consents?.[755]&&data.purpose?.consents?.[1]&&data.purpose?.consents?.[2]),data.listenerId);});
    });
  }
  const ads=root.GumdropAds.create({config:root.GumdropConfig,consent,loadScript});
  root.GameAdService=Object.freeze({available:ads.available,reset:ads.reset,interstitial:(name,hooks)=>optedIn()?ads.interstitial(name,hooks):Promise.resolve(false)});
})(window);
