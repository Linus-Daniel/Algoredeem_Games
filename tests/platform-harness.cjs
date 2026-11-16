const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
class Node {
 constructor(tag,doc){this.tagName=tag.toUpperCase();this.nodeType=1;this.doc=doc;this.children=[];this.attrs={};this.listeners={};this.style={setProperty(){}};this.hidden=false;this.disabled=false;this.className='';this.value='';this.classList={contains:v=>this.className.split(' ').includes(v),add:(v)=>{this.className+=' '+v;},remove:(v)=>{this.className=this.className.split(' ').filter(n=>n!==v).join(' ');}};}
 setAttribute(k,v){this.attrs[k]=String(v);if(k==='id')this.doc.ids.set(String(v),this);if(k==='class')this.className=String(v);if(k==='disabled')this.disabled=true;if(k==='hidden')this.hidden=true;}
 getAttribute(k){return this.attrs[k]??null;}
 removeAttribute(k){delete this.attrs[k];if(k==='hidden')this.hidden=false;if(k==='disabled')this.disabled=false;}
 get id(){return this.attrs.id;}set id(v){this.setAttribute('id',v);}
 get href(){return this.attrs.href;}set href(v){this.setAttribute('href',v);}
 get firstChild(){return this.children[0]||null;}
 get parentNode(){return this.parent||null;}
 get textContent(){return this.children.map(n=>n.textContent).join('');}set textContent(v){this.replaceChildren(this.doc.createTextNode(String(v)));}
 append(...children){for(const n of children){n.parent=this;this.children.push(n);}}
 replaceChildren(...children){for(const n of this.children)n.parent=null;this.children=[];this.append(...children);}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);this.parent=null;}
 get isConnected(){return this===this.doc.documentElement||!!this.parent?.isConnected;}
 contains(n){return this===n||this.children.some(c=>c.contains?.(n));}
 matches(selector){let s=selector;const id=s.match(/#([\w-]+)/);if(id&&this.id!==id[1])return false;s=s.replace(/#[\w-]+/g,'');if(s.includes(':not(:disabled)')){if(this.disabled)return false;s=s.replace(':not(:disabled)','');}const attr=[...s.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)];for(const [,key,value]of attr){if(value!==undefined?this.getAttribute(key)!==value:this.getAttribute(key)===null)return false;}s=s.replace(/\[[^\]]+\]/g,'');const classes=[...s.matchAll(/\.([\w-]+)/g)];if(classes.some(([,c])=>!this.className.split(' ').includes(c)))return false;s=s.replace(/\.[\w-]+/g,'');return !s||this.tagName.toLowerCase()===s;}
 querySelectorAll(selector){const selectors=selector.split(',').map(s=>s.trim()),found=[];for(const child of this.children)if(child.nodeType===1){if(selectors.some(s=>{const parts=s.split(/\s+/);if(!child.matches(parts.pop()))return false;let p=child.parent;while(parts.length&&p){if(p.matches(parts[parts.length-1]))parts.pop();p=p.parent;}return !parts.length;}))found.push(child);found.push(...child.querySelectorAll(selector));}return found;}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 addEventListener(type,fn){(this.listeners[type]||=[]).push(fn);}
 removeEventListener(type,fn){this.listeners[type]=(this.listeners[type]||[]).filter(v=>v!==fn);}
 async dispatch(type,props={}){const e={target:this,preventDefault(){},...props};for(const fn of this.listeners[type]||[])await fn(e);}
 focus(){this.doc.activeElement=this;}
 getBoundingClientRect(){return {width:720,height:480,left:0,top:0};}
 scrollIntoView(){}setPointerCapture(){}
 getContext(){const gradient={addColorStop(){}};return new Proxy({}, {get:(_,key)=>key.startsWith('create')?()=>gradient:()=>{},set:()=>true});}
}
function platform(options={}){
 const doc={ids:new Map(),hidden:false,listeners:{},createElement(tag){return new Node(tag,this);},createTextNode(text){return {nodeType:3,textContent:String(text)};},getElementById(id){const n=this.ids.get(id);return n?.isConnected?n:null;},querySelector(s){return this.documentElement.querySelector(s);},addEventListener(type,fn){(this.listeners[type]||=[]).push(fn);}};
 doc.documentElement=doc.createElement('html');const stack=[doc.documentElement];
 const html=options.html||fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const voids=new Set(['META','LINK','INPUT','IMG','BR','HR']);
 for(const token of html.match(/<[^>]*>|[^<]+/g)){if(token.startsWith('<!')||/^<html/i.test(token)||/^<\/html/i.test(token))continue;if(token.startsWith('</')){if(stack.length>1)stack.pop();continue;}if(token.startsWith('<')){const tag=token.match(/^<([\w-]+)/)?.[1];if(!tag)continue;const n=doc.createElement(tag);for(const match of token.matchAll(/([\w-]+)(?:="([^"]*)")?/g)){if(match.index<=1)continue;n.setAttribute(match[1],match[2]??'');}stack.at(-1).append(n);if(!voids.has(n.tagName))stack.push(n);}else stack.at(-1).append(doc.createTextNode(token));}
 doc.removeEventListener=(type,fn)=>{doc.listeners[type]=(doc.listeners[type]||[]).filter(v=>v!==fn);};doc.dispatchEvent=e=>{for(const fn of doc.listeners[e.type]||[])fn(e);};
 doc.head=doc.querySelector('head');doc.body=doc.querySelector('body');doc.activeElement=doc.body;
 const timers=new Set(),data=new Map(),events={},frames=new Map();let now=0,frameId=0,hash=options.hash||'#discover';
 const location={protocol:'file:',get hash(){return hash;},set hash(v){hash=v.startsWith('#')?v:'#'+v;}};
 const context={document:doc,location,navigator:{onLine:true},devicePixelRatio:options.density||1,Math,Date,console,performance:{now:()=>now},localStorage:{getItem:(k)=>{if(options.noStorage)throw new Error('Unavailable');return data.get(k)||null;},setItem:(k,v)=>{if(options.noStorage)throw new Error('Unavailable');data.set(k,v);}},
 setTimeout(fn,ms){const t=setTimeout(()=>{timers.delete(t);fn();},ms);timers.add(t);return t;},clearTimeout(t){clearTimeout(t);timers.delete(t);},requestAnimationFrame(fn){frames.set(++frameId,fn);return frameId;},addEventListener(type,fn){(events[type]||=[]).push(fn);},removeEventListener(type,fn){events[type]=(events[type]||[]).filter(v=>v!==fn);},cancelAnimationFrame(id){frames.delete(id);},scrollTo(){}};
 context.window=context;vm.createContext(context);
 if(options.script)vm.runInContext(options.script,context,{filename:'offline-platform.js'});
 else for(const name of (options.modules||['config','ads','catalog','arcade-save','arena-engine','arcade-engine','arena-renderer','arcade']))vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets/'+name+'.js'),'utf8'),context,{filename:name+'.js'});
 return {doc,data,context,frames,events,timers,async route(value){location.hash=value;for(const fn of events.hashchange||[])await fn();},frame(ms=16){now+=ms;const queued=[...frames.values()];frames.clear();for(const fn of queued)fn(now);},key(type,key){for(const fn of doc.listeners[type]||[])fn({key,target:doc.activeElement,preventDefault(){},repeat:false});},close(){frames.clear();for(const t of timers)clearTimeout(t);}};
}
module.exports={platform};
