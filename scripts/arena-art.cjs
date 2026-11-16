/* Record the actual game renderer as vector cover art; no duplicate illustrations. */
const E = require('../assets/arcade-engine.js');
require('../assets/arena-renderer.js');
const escape = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const matrix = (a, b) => [a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
function recorder() {
  const elements = [], defs = [], stack = []; let transform = [1,0,0,1,0,0], shape = '', path = '';
  const ctx = { fillStyle:'#000',strokeStyle:'#000',lineWidth:1,font:'12px system-ui',textAlign:'left',textBaseline:'middle',dash:[] };
  const paint = (key, value) => { if (typeof value === 'object') return `${key}="url(#${value.id})"`; if (/^#[a-f\d]{8}$/i.test(value)) return `${key}="${value.slice(0,7)}" ${key}-opacity="${parseInt(value.slice(7),16)/255}"`; return `${key}="${escape(value)}"`; };
  const add = (tag, attrs, mode = 'fill') => { const color = mode === 'fill' ? paint('fill', ctx.fillStyle) : `fill="none" ${paint('stroke',ctx.strokeStyle)} stroke-width="${ctx.lineWidth}"${ctx.dash.length ? ` stroke-dasharray="${ctx.dash.join(' ')}"` : ''}`; elements.push(`<${tag} ${attrs} ${color} transform="matrix(${transform.join(' ')})"/>`); };
  ctx.save = () => stack.push({ transform:transform.slice(),fillStyle:ctx.fillStyle,strokeStyle:ctx.strokeStyle,lineWidth:ctx.lineWidth,font:ctx.font,textAlign:ctx.textAlign,textBaseline:ctx.textBaseline,dash:ctx.dash.slice() });
  ctx.restore = () => { const s = stack.pop(); transform = s.transform; Object.assign(ctx, Object.fromEntries(Object.entries(s).filter(([k])=>k!=='transform'))); };
  ctx.translate = (x,y) => transform=matrix(transform,[1,0,0,1,x,y]); ctx.rotate=(a)=>transform=matrix(transform,[Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a),0,0]); ctx.scale=(x,y)=>transform=matrix(transform,[x,0,0,y,0,0]);
  ctx.beginPath = () => { shape='';path=''; }; ctx.moveTo=(x,y)=>path+=`M${x} ${y} `;ctx.lineTo=(x,y)=>path+=`L${x} ${y} `;ctx.closePath=()=>path+='Z ';
  ctx.rect = (x,y,w,h) => { shape=`x="${x}" y="${y}" width="${w}" height="${h}"`; };
  ctx.roundRect = (x,y,w,h,r) => { shape=`x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"`; };
  ctx.ellipse = (x,y,rx,ry) => { shape=`cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"`; };
  ctx.arc = (x,y,r) => ctx.ellipse(x,y,r,r);
  ctx.fill=()=>shape?add(shape.startsWith('cx')?'ellipse':'rect',shape):add('path',`d="${path}"`);
  ctx.stroke=()=>shape?add(shape.startsWith('cx')?'ellipse':'rect',shape,'stroke'):add('path',`d="${path}"`,'stroke');
  ctx.fillRect=(x,y,w,h)=>add('rect',`x="${x}" y="${y}" width="${w}" height="${h}"`);ctx.strokeRect=(x,y,w,h)=>add('rect',`x="${x}" y="${y}" width="${w}" height="${h}"`,'stroke');
  ctx.setLineDash=(dash)=>ctx.dash=dash;
  ctx.fillText=(value,x,y)=>elements.push(`<text x="${x}" y="${y}" font-family="system-ui,sans-serif" font-size="${parseFloat(ctx.font.match(/([\d.]+)px/)[1])}" font-weight="800" text-anchor="${ctx.textAlign==='center'?'middle':ctx.textAlign==='right'?'end':'start'}" dominant-baseline="central" ${paint('fill',ctx.fillStyle)} transform="matrix(${transform.join(' ')})">${escape(value)}</text>`);
  const gradient = (kind, attrs) => { const id='g'+defs.length, entry={id,stops:[],addColorStop(at,color){this.stops.push(`<stop offset="${at}" ${paint('stop-color',color).replace('stop-color-opacity','stop-opacity')}/>`);}}; defs.push({ kind, attrs, entry }); return entry; };
  ctx.createLinearGradient=(x,y,x2,y2)=>gradient('linearGradient',`x1="${x}" y1="${y}" x2="${x2}" y2="${y2}"`);
  ctx.createRadialGradient=(x,y,r,x2,y2,r2)=>gradient('radialGradient',`cx="${x2}" cy="${y2}" r="${r2}" fx="${x}" fy="${y}"`);
  return { ctx, svg:()=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480"><defs>${defs.map(({kind,attrs,entry})=>`<${kind} id="${entry.id}" gradientUnits="userSpaceOnUse" ${attrs}>${entry.stops.join('')}</${kind}>`).join('')}</defs>${elements.join('')}</svg>` };
}
function art(game) {
  const s=E.create(game.id,()=>.42);s.elapsed=6;
  if(['racing','rally'].includes(game.id)){s.distance=920;s.speed=245;s.x=-.28;s.traffic=[{x:.64,z:225,color:1},{x:-.64,z:710,color:2},{x:0,z:940,color:3}];}
  if(game.id==='kart'){s.progress=5;s.angle+=5;s.rivalProgress=4;s.speed=1.3;}
  if(game.id==='flight')s.gates=[{x:320,y:210,passed:false},{x:610,y:270,passed:false}];
  if(game.id==='rhythm'){s.elapsed=8;s.notes.forEach((n,i)=>n.lane=[0,2,1,3,2,0,3,1][i%8]);}
  if(game.id==='tank'){s.aim={x:460,y:145};s.bullets=[{x:405,y:250,vx:170,vy:-300,hostile:false},{x:200,y:190,vx:90,vy:150,hostile:true}];}
  if(game.id==='basket')s.ball={x:423,y:109,vx:290,vy:50,trail:[{x:360,y:120},{x:380,y:113},{x:400,y:110}]};
  const r=recorder();globalThis.ArenaModels=require('../assets/arena-engine.js');globalThis.ArenaRenderer.draw(r.ctx,game.id,s);return r.svg();
}
module.exports={art,recorder};
