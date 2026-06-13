/* eslint-disable */
/**
 * CT-Platform — MD-bank PHYSICS question generator (+ auto-rendered SVG visuals).
 *
 * Source templates: repo-root file "заданияпофизике.md" (гидростатика, динамика,
 *   законы сохранения, кинематика, магнетизм, МКТ/термодинамика, электричество,
 *   оптика, ядерная/квантовая, колебания).
 * Each task family is turned into a parametrized generator:
 *  - answers computed in code AND re-verified by an INDEPENDENT check (chk) before emit
 *  - Part A = SINGLE_CHOICE (5 options A–E), Part B = TEXT_INPUT (INTEGER answers only)
 *  - NON-integer answers are ALWAYS multiple-choice (no typed-compare ambiguity)
 *  - content = plain Russian, math inside $...$ (platform KaTeX rule); units stated in text
 *  - generators that need a picture EMIT an inline SVG → stored as a self-contained
 *    data:URL in Question.imageUrl (v-t graphs, circuits, lens ray diagrams,
 *    inclined planes, bridges). No files / no ephemeral FS needed.
 *  - matched to existing physics subtopics by keyword; unmatched are skipped
 *  - idempotent: deterministic externalId  MDP-<subtopicId>-<i>
 *  - global content de-dup against ALL existing physics questions
 *
 * Run:  node prisma/seed-md-physics.js                (insert into Neon)
 *       node prisma/seed-md-physics.js --selftest     (300 samples per generator, no DB)
 *       node prisma/seed-md-physics.js --introspect   (matching stats, no writes)
 *       node prisma/seed-md-physics.js --dry          (generate+verify+JSON, no DB writes)
 *       node prisma/seed-md-physics.js --audit        (verify MDP- rows in DB)
 *       node prisma/seed-md-physics.js --count=N      (slots per matched subtopic, default 12)
 */
const fs = require('fs');
const path = require('path');

(function loadEnv() {
  if (process.env.DATABASE_URL) return;
  for (const p of [path.join(process.cwd(), '.env'), path.join(__dirname, '..', '.env')]) {
    try {
      const txt = fs.readFileSync(p, 'utf8');
      for (const line of txt.split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
        if (m && !process.env[m[1]]) {
          let v = m[2].trim();
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
          process.env[m[1]] = v;
        }
      }
      if (process.env.DATABASE_URL) return;
    } catch {}
  }
})();

const ARGS = process.argv.slice(2);
const INTROSPECT = ARGS.includes('--introspect');
const SELFTEST = ARGS.includes('--selftest');
const AUDIT = ARGS.includes('--audit');
const DRY = ARGS.includes('--dry') || INTROSPECT;
const PER = (() => { const a = ARGS.find(x => x.startsWith('--count=')); return a ? Math.max(1, parseInt(a.slice(8), 10) || 12) : 12; })();

// ---------- deterministic RNG ----------
function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function makeRng(seed){const r=mulberry32(hashStr(seed));return{f:r,int:(a,b)=>a+Math.floor(r()*(b-a+1)),pick:(arr)=>arr[Math.floor(r()*arr.length)],bool:()=>r()<0.5};}

// ---------- helpers ----------
function chk(cond,msg){ if(!cond) throw new Error('verify-fail:'+msg); }
const G_ACC = 10; // м/с² (указывается в условии)
const round6=(x)=>Math.round(x*1e6)/1e6;
function fmtNum(x){
  if(typeof x!=='number'||!isFinite(x)) return String(x);
  const r=round6(x);
  if(Number.isInteger(r)) return String(r);
  return String(r);
}
const approx=(a,b,eps)=>Math.abs(a-b)<(eps||1e-6);

// ---------- option builders ----------
// Real-valued single choice: physically-motivated distractors via `dis`, formatted cleanly.
function realChoice(rng,V,dis){
  const seen=new Set([fmtNum(V)]);
  const wrongs=[];
  const push=(c,allowNonPos)=>{ if(typeof c!=='number'||!isFinite(c)) return; const r=round6(c);
    if(!allowNonPos && V>0 && r<=0) return; const f=fmtNum(r); if(seen.has(f)) return; seen.add(f); wrongs.push(r); };
  for(const c of (dis||[])) push(c,true);
  const fb=[V*2,V*0.5,V*1.5,V*3,V*0.8,V*1.25,V+(Math.abs(V)>=2?1:0.1),Math.abs(V)>=2?V-1:V*0.9,V*10,V*0.1,V*2.5,V*4];
  for(const c of fb){ if(wrongs.length>=4) break; push(c); }
  let k=2; while(wrongs.length<4){ push(V*k+ (V>=0?1:-1)); k++; if(k>60){ push(V+ (wrongs.length+7)*1.0); } }
  const all=[V,...wrongs.slice(0,4)];
  for(let i=all.length-1;i>0;i--){const j=rng.int(0,i);[all[i],all[j]]=[all[j],all[i]];}
  const ids=['A','B','C','D','E'];
  return { options: all.map((val,i)=>({id:ids[i],text:fmtNum(val)})), correctAnswer: ids[all.indexOf(V)] };
}
function textChoice(rng,correct,wrongs){
  const all=[{t:correct,ok:true},...wrongs.slice(0,4).map(t=>({t,ok:false}))];
  for(let i=all.length-1;i>0;i--){const j=rng.int(0,i);[all[i],all[j]]=[all[j],all[i]];}
  const ids=['A','B','C','D','E'];
  return { options: all.map((o,i)=>({id:ids[i],text:o.t})), correctAnswer: ids[all.findIndex(o=>o.ok)] };
}

// ================= SVG VISUALIZATION HELPERS =================
function makeSvgDataUrl(svg){ return 'data:image/svg+xml;base64,'+Buffer.from(svg,'utf8').toString('base64'); }
const esc=(s)=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

// piecewise-linear v(t) (or any) line graph with axes, grid, ticks, optional shaded area
function svgLineGraph({pts,xmax,ymax,xstep,ystep,xlabel,ylabel,shade,stroke}){
  const W=380,H=250,ML=48,MR=18,MT=20,MB=36,PW=W-ML-MR,PH=H-MT-MB;
  const X=t=>ML+(t/xmax)*PW, Y=v=>MT+PH-(v/ymax)*PH;
  let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Segoe UI,Arial,sans-serif">`;
  s+=`<rect width="${W}" height="${H}" fill="#ffffff"/>`;
  for(let t=xstep;t<=xmax+1e-9;t+=xstep){const x=X(t);s+=`<line x1="${x.toFixed(1)}" y1="${MT}" x2="${x.toFixed(1)}" y2="${MT+PH}" stroke="#eef1f5"/>`;}
  for(let v=ystep;v<=ymax+1e-9;v+=ystep){const y=Y(v);s+=`<line x1="${ML}" y1="${y.toFixed(1)}" x2="${ML+PW}" y2="${y.toFixed(1)}" stroke="#eef1f5"/>`;}
  if(shade){let p=`${X(pts[0][0]).toFixed(1)},${Y(0).toFixed(1)} `+pts.map(([t,v])=>`${X(t).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')+` ${X(pts[pts.length-1][0]).toFixed(1)},${Y(0).toFixed(1)}`;
    s+=`<polygon points="${p}" fill="#2563eb" fill-opacity="0.13"/>`;}
  s+=`<line x1="${ML}" y1="${MT+PH}" x2="${ML+PW+8}" y2="${MT+PH}" stroke="#222" stroke-width="1.4"/>`;
  s+=`<line x1="${ML}" y1="${MT-4}" x2="${ML}" y2="${MT+PH}" stroke="#222" stroke-width="1.4"/>`;
  s+=`<path d="M ${ML+PW+8} ${MT+PH} l -6 -3 v6 z" fill="#222"/><path d="M ${ML} ${MT-4} l -3 6 h6 z" fill="#222"/>`;
  for(let t=xstep;t<=xmax+1e-9;t+=xstep){const x=X(t);s+=`<line x1="${x.toFixed(1)}" y1="${MT+PH}" x2="${x.toFixed(1)}" y2="${MT+PH+4}" stroke="#222"/><text x="${x.toFixed(1)}" y="${MT+PH+16}" font-size="11" text-anchor="middle" fill="#222">${fmtNum(t)}</text>`;}
  for(let v=ystep;v<=ymax+1e-9;v+=ystep){const y=Y(v);s+=`<line x1="${ML-4}" y1="${y.toFixed(1)}" x2="${ML}" y2="${y.toFixed(1)}" stroke="#222"/><text x="${ML-7}" y="${(y+4).toFixed(1)}" font-size="11" text-anchor="end" fill="#222">${fmtNum(v)}</text>`;}
  s+=`<text x="${ML-7}" y="${MT+PH+16}" font-size="11" text-anchor="end" fill="#222">0</text>`;
  const poly=pts.map(([t,v])=>`${X(t).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
  s+=`<polyline points="${poly}" fill="none" stroke="${stroke||'#2563eb'}" stroke-width="2.6"/>`;
  for(const [t,v] of pts) s+=`<circle cx="${X(t).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="2.7" fill="${stroke||'#2563eb'}"/>`;
  s+=`<text x="${ML+PW+6}" y="${MT+PH+30}" font-size="12" text-anchor="end" fill="#222">${esc(xlabel)}</text>`;
  s+=`<text x="${ML-34}" y="${MT-6}" font-size="12" fill="#222">${esc(ylabel)}</text>`;
  s+=`</svg>`; return s;
}

// resistor box (horizontal) centered at (x,y)
function _res(x,y,label){return `<rect x="${x-26}" y="${y-9}" width="52" height="18" fill="#ffffff" stroke="#222" stroke-width="1.4"/><text x="${x}" y="${y+4}" font-size="12" text-anchor="middle" fill="#222">${esc(label)}</text>`;}
function _battery(x,y){ // vertical cell, + long plate on top
  return `<line x1="${x-12}" y1="${y-2}" x2="${x+12}" y2="${y-2}" stroke="#222" stroke-width="3.2"/>`+
         `<line x1="${x-7}" y1="${y+5}" x2="${x+7}" y2="${y+5}" stroke="#222" stroke-width="1.6"/>`+
         `<text x="${x+20}" y="${y+2}" font-size="13" fill="#222">+</text>`;
}
function svgSeries(R1,R2,U){
  const W=360,H=190;let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Segoe UI,Arial,sans-serif"><rect width="${W}" height="${H}" fill="#fff"/>`;
  const L=40,R=320,T=55,B=150;
  s+=`<polyline points="${L},${T} ${R},${T} ${R},${B} ${L},${B} ${L},${T}" fill="none" stroke="#222" stroke-width="1.6"/>`;
  s+=_battery(L, (T+B)/2)+`<text x="${L-30}" y="${(T+B)/2+4}" font-size="12" fill="#222">${esc('U='+U+' В')}</text>`;
  s+=`<rect x="${L-4}" y="${(T+B)/2-2}" width="0" height="0"/>`;
  s+=_res(140,T,'R1='+R1+' Ом')+_res(250,T,'R2='+R2+' Ом');
  s+=`<text x="${(L+R)/2}" y="${B+24}" font-size="12" text-anchor="middle" fill="#475569">Последовательное соединение</text>`;
  s+=`</svg>`;return s;
}
function svgParallel(R1,R2,U){
  const W=360,H=210;let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Segoe UI,Arial,sans-serif"><rect width="${W}" height="${H}" fill="#fff"/>`;
  const L=40,R=320,T=45,B=175,yA=85,yB=140,xa=120,xb=250;
  s+=_battery(L,(T+B)/2)+`<text x="${L-30}" y="${(T+B)/2+4}" font-size="12" fill="#222">${esc('U='+U+' В')}</text>`;
  // left/right vertical rails + top/bottom stubs
  s+=`<line x1="${L}" y1="${T}" x2="${L}" y2="${B}" stroke="#222" stroke-width="1.6"/>`;
  s+=`<line x1="${R}" y1="${T}" x2="${R}" y2="${B}" stroke="#222" stroke-width="1.6"/>`;
  s+=`<line x1="${L}" y1="${T}" x2="${xa}" y2="${T}" stroke="#222" stroke-width="1.6"/>`;
  // two branches between the node-rails
  s+=`<line x1="${xa}" y1="${yA}" x2="${xa-0}" y2="${T}" stroke="#222" stroke-width="1.6"/>`;
  s+=`<line x1="${xa}" y1="${yA}" x2="${xa}" y2="${yA}" stroke="#222"/>`;
  // simplified: node columns at xa and xb
  s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Segoe UI,Arial,sans-serif"><rect width="${W}" height="${H}" fill="#fff"/>`;
  s+=_battery(L,(T+B)/2)+`<text x="${L-32}" y="${(T+B)/2+4}" font-size="12" fill="#222">${esc('U='+U+' В')}</text>`;
  s+=`<line x1="${L}" y1="${T}" x2="${L}" y2="${B}" stroke="#222" stroke-width="1.6"/>`;
  s+=`<line x1="${L}" y1="${T}" x2="${xb+60}" y2="${T}" stroke="#222" stroke-width="1.6"/>`;
  s+=`<line x1="${L}" y1="${B}" x2="${xb+60}" y2="${B}" stroke="#222" stroke-width="1.6"/>`;
  s+=`<line x1="${xb+60}" y1="${T}" x2="${xb+60}" y2="${B}" stroke="#222" stroke-width="1.6"/>`;
  // node verticals
  s+=`<line x1="${xa}" y1="${T}" x2="${xa}" y2="${B}" stroke="#222" stroke-width="1.6"/>`;
  s+=`<line x1="${xb}" y1="${T}" x2="${xb}" y2="${B}" stroke="#222" stroke-width="1.6"/>`;
  s+=_res((xa+xb)/2,yA,'R1='+R1+' Ом')+_res((xa+xb)/2,yB,'R2='+R2+' Ом');
  // connect resistor stubs to node rails
  s+=`<line x1="${xa}" y1="${yA}" x2="${(xa+xb)/2-26}" y2="${yA}" stroke="#222" stroke-width="1.4"/><line x1="${(xa+xb)/2+26}" y1="${yA}" x2="${xb}" y2="${yA}" stroke="#222" stroke-width="1.4"/>`;
  s+=`<line x1="${xa}" y1="${yB}" x2="${(xa+xb)/2-26}" y2="${yB}" stroke="#222" stroke-width="1.4"/><line x1="${(xa+xb)/2+26}" y1="${yB}" x2="${xb}" y2="${yB}" stroke="#222" stroke-width="1.4"/>`;
  s+=`<text x="${W/2}" y="${H-10}" font-size="12" text-anchor="middle" fill="#475569">Параллельное соединение</text>`;
  s+=`</svg>`;return s;
}
function svgEMF(R,r,E){
  const W=360,H=190;let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Segoe UI,Arial,sans-serif"><rect width="${W}" height="${H}" fill="#fff"/>`;
  const L=45,Rg=315,T=55,B=150;
  s+=`<polyline points="${L},${T} ${Rg},${T} ${Rg},${B} ${L},${B} ${L},${T}" fill="none" stroke="#222" stroke-width="1.6"/>`;
  s+=_battery(L,(T+B)/2);
  s+=`<text x="${L+16}" y="${(T+B)/2-6}" font-size="12" fill="#222">${esc('ε='+E+' В')}</text>`;
  s+=`<text x="${L+16}" y="${(T+B)/2+14}" font-size="12" fill="#222">${esc('r='+r+' Ом')}</text>`;
  s+=_res((L+Rg)/2,T,'R='+R+' Ом');
  s+=`<text x="${(L+Rg)/2}" y="${B+24}" font-size="12" text-anchor="middle" fill="#475569">Полная цепь: источник (ε, r) и резистор R</text>`;
  s+=`</svg>`;return s;
}
// converging lens ray diagram: object at -d, focal F, image at +f (real, inverted)
function svgLens(d,f,F){
  const W=380,H=220,cx=190,ay=120;let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Segoe UI,Arial,sans-serif"><rect width="${W}" height="${H}" fill="#fff"/>`;
  const sc=Math.min(150/Math.max(d,f,F+2), 150/Math.max(d,f,F+2));
  const ox=cx-d*sc, ix=cx+f*sc, fLx=cx-F*sc, fRx=cx+F*sc;
  const h=34, ih=h*f/d;
  s+=`<line x1="14" y1="${ay}" x2="${W-12}" y2="${ay}" stroke="#94a3b8" stroke-width="1.2"/>`; // optical axis
  s+=`<path d="M ${W-14} ${ay} l -7 -3 v6 z" fill="#94a3b8"/>`;
  // lens (converging) as vertical line with outward arrows
  s+=`<line x1="${cx}" y1="${ay-72}" x2="${cx}" y2="${ay+72}" stroke="#0f172a" stroke-width="2"/>`;
  s+=`<path d="M ${cx} ${ay-72} l -5 8 h10 z" fill="#0f172a"/><path d="M ${cx} ${ay+72} l -5 -8 h10 z" fill="#0f172a"/>`;
  // focal points
  for(const [fx,nm] of [[fLx,'F'],[fRx,'F']]){ s+=`<circle cx="${fx.toFixed(1)}" cy="${ay}" r="2.6" fill="#0f172a"/><text x="${fx.toFixed(1)}" y="${ay+16}" font-size="11" text-anchor="middle" fill="#0f172a">${nm}</text>`; }
  s+=`<text x="${cx+4}" y="${ay-76}" font-size="11" fill="#0f172a">линза</text>`;
  // object (up, blue)
  s+=`<line x1="${ox.toFixed(1)}" y1="${ay}" x2="${ox.toFixed(1)}" y2="${(ay-h).toFixed(1)}" stroke="#2563eb" stroke-width="2.4"/><path d="M ${ox.toFixed(1)} ${(ay-h).toFixed(1)} l -4 7 h8 z" fill="#2563eb"/>`;
  s+=`<text x="${ox.toFixed(1)}" y="${ay+16}" font-size="11" text-anchor="middle" fill="#2563eb">предмет</text>`;
  // image (down, red)
  s+=`<line x1="${ix.toFixed(1)}" y1="${ay}" x2="${ix.toFixed(1)}" y2="${(ay+ih).toFixed(1)}" stroke="#dc2626" stroke-width="2.4"/><path d="M ${ix.toFixed(1)} ${(ay+ih).toFixed(1)} l -4 -7 h8 z" fill="#dc2626"/>`;
  s+=`<text x="${ix.toFixed(1)}" y="${ay-6}" font-size="11" text-anchor="middle" fill="#dc2626">изобр.</text>`;
  // two principal rays through object top
  const otopY=ay-h;
  s+=`<polyline points="${ox.toFixed(1)},${otopY.toFixed(1)} ${cx},${otopY.toFixed(1)} ${ix.toFixed(1)},${(ay+ih).toFixed(1)}" fill="none" stroke="#16a34a" stroke-width="1.3" stroke-dasharray="4 3"/>`;
  s+=`<line x1="${ox.toFixed(1)}" y1="${otopY.toFixed(1)}" x2="${ix.toFixed(1)}" y2="${(ay+ih).toFixed(1)}" stroke="#f59e0b" stroke-width="1.3" stroke-dasharray="4 3"/>`;
  s+=`</svg>`;return s;
}
// inclined plane with block and force vectors mg, N, friction; angle α at base-left
function svgIncline(angleDeg,withFric){
  const W=360,H=210;let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Segoe UI,Arial,sans-serif"><rect width="${W}" height="${H}" fill="#fff"/>`;
  const a=angleDeg*Math.PI/180, Bx=36,By=178, baseLen=290; let topY=By-baseLen*Math.tan(a);
  if(topY<24){ topY=24; } const Tx=Bx+baseLen, Cx=Tx, Cy=By;
  s+=`<polygon points="${Bx},${By} ${Cx},${Cy} ${Tx},${topY.toFixed(1)}" fill="#eef2f7" stroke="#334155" stroke-width="1.6"/>`;
  // block at midpoint of hypotenuse (from B to T)
  const px=Bx+(Tx-Bx)*0.5, py=By+(topY-By)*0.5;
  const ux=Math.cos(a), uy=-Math.sin(a); // up-slope unit (towards T)
  const nx=Math.sin(a), ny=Math.cos(a);  // outward normal (away from surface, upward)
  const bw=30,bh=20;
  // block rectangle aligned to slope
  const c1=[px-ux*bw/2 - nx*0, py-uy*bw/2 - ny*0];
  s+=`<g transform="translate(${px.toFixed(1)},${py.toFixed(1)}) rotate(${(-angleDeg).toFixed(1)})"><rect x="${-bw/2}" y="${-bh}" width="${bw}" height="${bh}" fill="#fde68a" stroke="#92400e" stroke-width="1.4"/></g>`;
  const cxv=px - nx*bh/2*0 + nx*0, cyv=py - ny*bh/2; // approx block center (just above surface)
  const bcx=px+nx*bh/2, bcy=py-ny*bh/2;
  const arrow=(x1,y1,x2,y2,col,lab,lx,ly)=>`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${col}" stroke-width="2.2"/>`+
    `<path d="M ${x2.toFixed(1)} ${y2.toFixed(1)} l ${(-(x2-x1)/Math.hypot(x2-x1,y2-y1)*9 - (y2-y1)/Math.hypot(x2-x1,y2-y1)*4).toFixed(1)} ${(-(y2-y1)/Math.hypot(x2-x1,y2-y1)*9 + (x2-x1)/Math.hypot(x2-x1,y2-y1)*4).toFixed(1)} l ${((y2-y1)/Math.hypot(x2-x1,y2-y1)*8).toFixed(1)} ${(-(x2-x1)/Math.hypot(x2-x1,y2-y1)*8).toFixed(1)} z" fill="${col}"/>`+
    `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" font-size="12" fill="${col}">${esc(lab)}</text>`;
  // mg straight down (gray)
  s+=arrow(bcx,bcy,bcx,bcy+46,'#475569','mg',bcx+4,bcy+44);
  // N along outward normal (blue)
  s+=arrow(bcx,bcy,bcx+nx*44,bcy-ny*44,'#2563eb','N',bcx+nx*46+2,bcy-ny*46);
  if(withFric){ s+=arrow(bcx,bcy,bcx-ux*40,bcy-uy*40,'#dc2626','Fтр',bcx-ux*44-18,bcy-uy*44); }
  // angle arc + label
  s+=`<path d="M ${Bx+34} ${By} A 34 34 0 0 0 ${(Bx+34*Math.cos(a)).toFixed(1)} ${(By-34*Math.sin(a)).toFixed(1)}" fill="none" stroke="#334155" stroke-width="1.3"/>`;
  s+=`<text x="${Bx+42}" y="${By-10}" font-size="13" fill="#334155">α=${angleDeg}°</text>`;
  s+=`</svg>`;return s;
}
// bridge: convex (hump) or concave (valley) arc with car + N, mg vectors and radius R
function svgBridge(convex,R,v){
  const W=360,H=210;let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Segoe UI,Arial,sans-serif"><rect width="${W}" height="${H}" fill="#fff"/>`;
  const cx=180, topY=convex?70:150, rr=120;
  if(convex){
    s+=`<path d="M 50 ${topY+60} A ${rr} ${rr} 0 0 1 ${W-50} ${topY+60}" fill="none" stroke="#334155" stroke-width="2.4"/>`;
    // car at apex
    s+=`<rect x="${cx-26}" y="${topY-14}" width="52" height="20" rx="4" fill="#fde68a" stroke="#92400e" stroke-width="1.4"/>`;
    s+=`<circle cx="${cx-14}" cy="${topY+8}" r="5" fill="#334155"/><circle cx="${cx+14}" cy="${topY+8}" r="5" fill="#334155"/>`;
    const cyc=topY-4;
    s+=`<line x1="${cx}" y1="${cyc}" x2="${cx}" y2="${cyc-44}" stroke="#2563eb" stroke-width="2.2"/><path d="M ${cx} ${cyc-44} l -4 8 h8 z" fill="#2563eb"/><text x="${cx+6}" y="${cyc-40}" font-size="12" fill="#2563eb">N</text>`;
    s+=`<line x1="${cx}" y1="${cyc}" x2="${cx}" y2="${cyc+48}" stroke="#475569" stroke-width="2.2"/><path d="M ${cx} ${cyc+48} l -4 -8 h8 z" fill="#475569"/><text x="${cx+6}" y="${cyc+46}" font-size="12" fill="#475569">mg</text>`;
    s+=`<text x="${cx+40}" y="${topY-6}" font-size="12" fill="#16a34a">v=${v} м/с →</text>`;
    s+=`<text x="${cx-150}" y="${topY+120}" font-size="12" fill="#334155">R=${R} м</text>`;
    s+=`<text x="${W/2}" y="${H-8}" font-size="12" text-anchor="middle" fill="#475569">Выпуклый мост (верхняя точка)</text>`;
  } else {
    s+=`<path d="M 50 ${topY-50} A ${rr} ${rr} 0 0 0 ${W-50} ${topY-50}" fill="none" stroke="#334155" stroke-width="2.4"/>`;
    s+=`<rect x="${cx-26}" y="${topY-14}" width="52" height="20" rx="4" fill="#fde68a" stroke="#92400e" stroke-width="1.4"/>`;
    s+=`<circle cx="${cx-14}" cy="${topY+8}" r="5" fill="#334155"/><circle cx="${cx+14}" cy="${topY+8}" r="5" fill="#334155"/>`;
    const cyc=topY-4;
    s+=`<line x1="${cx}" y1="${cyc}" x2="${cx}" y2="${cyc-54}" stroke="#2563eb" stroke-width="2.2"/><path d="M ${cx} ${cyc-54} l -4 8 h8 z" fill="#2563eb"/><text x="${cx+6}" y="${cyc-50}" font-size="12" fill="#2563eb">N</text>`;
    s+=`<line x1="${cx}" y1="${cyc}" x2="${cx}" y2="${cyc+40}" stroke="#475569" stroke-width="2.2"/><path d="M ${cx} ${cyc+40} l -4 -8 h8 z" fill="#475569"/><text x="${cx+6}" y="${cyc+38}" font-size="12" fill="#475569">mg</text>`;
    s+=`<text x="${cx+40}" y="${topY-6}" font-size="12" fill="#16a34a">v=${v} м/с →</text>`;
    s+=`<text x="${cx-150}" y="${topY-70}" font-size="12" fill="#334155">R=${R} м</text>`;
    s+=`<text x="${W/2}" y="${H-8}" font-size="12" text-anchor="middle" fill="#475569">Вогнутый мост (нижняя точка)</text>`;
  }
  s+=`</svg>`;return s;
}

// ---------- generator library ----------
// def(key, lvl, kind, title, fn). kind: 'A' always-choice | 'AB' integer→mixed | 'B' integer→prefer-B
const G = {};
function def(key, lvl, kind, title, fn){ G[key]={lvl,kind,title,fn}; }

/* ================= КИНЕМАТИКА ================= */
def('kUniformDist',1,'AB','Равномерное движение: путь',r=>{const v=r.int(5,30),t=r.int(2,12);const s=v*t;chk(s/t===v,'ud');
  return{content:`Тело движется равномерно со скоростью $${v}$ м/с. Какой путь (в метрах) оно пройдёт за $${t}$ с?`,solution:`При равномерном движении $s=v t=${v}\\cdot${t}=${s}$ м.`,explanation:`Путь при равномерном движении равен произведению скорости на время: $s=vt$.`,answer:s,dis:[v+t,2*s,s+v,v*(t+1)]};});
def('kUniformTime',1,'AB','Равномерное движение: время',r=>{const v=r.int(2,15),n=r.int(2,9);const s=v*n,t=n;chk(s/v===t,'ut');
  return{content:`Тело прошло равномерно путь $${s}$ м со скоростью $${v}$ м/с. За какое время (в секундах)?`,solution:`$t=\\dfrac{s}{v}=\\dfrac{${s}}{${v}}=${t}$ с.`,explanation:`Время равно пути, делённому на скорость: $t=s/v$.`,answer:t,dis:[s*v,t+1,s-v]};});
def('kUniformSpeed',1,'AB','Равномерное движение: скорость',r=>{const t=r.int(2,12),v=r.int(3,25);const s=v*t;chk(s/t===v,'us');
  return{content:`За $${t}$ с тело прошло равномерно $${s}$ м. Найдите скорость (в м/с).`,solution:`$v=\\dfrac{s}{t}=\\dfrac{${s}}{${t}}=${v}$ м/с.`,explanation:`$v=s/t$.`,answer:v,dis:[s*t,v+1,s-t]};});
def('kAvgHalfDist',3,'A','Средняя скорость (по пути)',r=>{const t=r.pick([[60,40,48],[30,60,40],[20,30,24],[40,60,48],[12,24,16],[30,20,24],[45,30,36],[20,80,32],[10,15,12],[60,30,40]]);
  chk(approx(2*t[0]*t[1]/(t[0]+t[1]),t[2]),'ahd');
  return{content:`Первую половину пути автомобиль ехал со скоростью $${t[0]}$ км/ч, вторую — со скоростью $${t[1]}$ км/ч. Найдите среднюю путевую скорость (км/ч).`,solution:`Для равных половин пути $v_{ср}=\\dfrac{2v_1 v_2}{v_1+v_2}=\\dfrac{2\\cdot${t[0]}\\cdot${t[1]}}{${t[0]}+${t[1]}}=${t[2]}$ км/ч.`,explanation:`Для равных участков ПУТИ средняя скорость — среднее гармоническое, а не арифметическое.`,answer:t[2],dis:[(t[0]+t[1])/2,t[0]+t[1],Math.round((t[0]+t[1])/2)+2]};});
def('kAvgHalfTime',2,'AB','Средняя скорость (по времени)',r=>{let a=r.int(2,12)*5,b=r.int(2,12)*5;if((a+b)%2)b+=5;const v=(a+b)/2;chk(2*v===a+b,'aht');
  return{content:`Первую половину времени тело двигалось со скоростью $${a}$ км/ч, вторую — со скоростью $${b}$ км/ч. Найдите среднюю скорость (км/ч).`,solution:`Для равных промежутков ВРЕМЕНИ $v_{ср}=\\dfrac{v_1+v_2}{2}=\\dfrac{${a}+${b}}{2}=${v}$ км/ч.`,explanation:`Для равных интервалов времени средняя скорость — среднее арифметическое.`,answer:v,dis:[a+b,Math.round(2*a*b/(a+b)),v+5]};});
def('kAccel',2,'AB','Ускорение из изменения скорости',r=>{const a=r.int(2,8),t=r.int(2,9),v0=r.int(0,6);const v=v0+a*t;chk((v-v0)/t===a,'ka');
  return{content:`Скорость тела за $${t}$ с возросла с $${v0}$ м/с до $${v}$ м/с. Найдите ускорение (в м/с²).`,solution:`$a=\\dfrac{v-v_0}{t}=\\dfrac{${v}-${v0}}{${t}}=${a}$ м/с².`,explanation:`Ускорение — отношение изменения скорости ко времени: $a=(v-v_0)/t$.`,answer:a,dis:[v/t>=1?Math.round(v/t):a+1,a+1,v-v0]};});
def('kVelAfter',2,'AB','Скорость при разгоне',r=>{const v0=r.int(0,8),a=r.int(2,7),t=r.int(2,9);const v=v0+a*t;chk(v===v0+a*t,'kva');
  return{content:`Тело начинает движение со скоростью $${v0}$ м/с и движется с ускорением $${a}$ м/с². Найдите скорость (в м/с) через $${t}$ с.`,solution:`$v=v_0+at=${v0}+${a}\\cdot${t}=${v}$ м/с.`,explanation:`$v=v_0+at$.`,answer:v,dis:[a*t,v0+a,v+a]};});
def('kDistAccel',2,'AB','Путь при разгоне из покоя',r=>{let a=r.pick([2,4,6,8]),t=r.pick([2,3,4,5,6]);const s=a*t*t/2;chk(2*s===a*t*t&&Number.isInteger(s),'kda');
  return{content:`Тело без начальной скорости движется с ускорением $${a}$ м/с². Какой путь (в метрах) оно пройдёт за $${t}$ с?`,solution:`$s=\\dfrac{at^2}{2}=\\dfrac{${a}\\cdot${t*t}}{2}=${s}$ м.`,explanation:`При разгоне из покоя $s=\\frac{at^2}{2}$.`,answer:s,dis:[a*t,a*t*t,s*2]};});
def('kBraking',3,'B','Тормозной путь',r=>{const t=r.pick([[20,4,50],[10,5,10],[30,9,50],[20,5,40],[12,4,18],[30,5,90],[24,4,72],[40,8,100],[18,9,18],[10,2,25]]);
  chk(t[0]*t[0]===2*t[1]*t[2],'kb');
  return{content:`Автомобиль движется со скоростью $${t[0]}$ м/с и тормозит с ускорением $${t[1]}$ м/с². Найдите тормозной путь (в метрах).`,solution:`$s=\\dfrac{v^2}{2a}=\\dfrac{${t[0]*t[0]}}{2\\cdot${t[1]}}=${t[2]}$ м.`,explanation:`Тормозной путь $s=\\frac{v^2}{2a}$.`,answer:t[2],dis:[t[0]/t[1]>=1?Math.round(t[0]/t[1]):t[2]+5,t[2]*2,Math.round(t[0]*t[0]/t[1])]};});
def('kFreeFallTime',2,'AB','Свободное падение: время',r=>{const t=r.pick([[5,1],[20,2],[45,3],[80,4],[125,5],[180,6]]);chk(t[0]===G_ACC*t[1]*t[1]/2,'kft');
  return{content:`Тело свободно падает без начальной скорости с высоты $${t[0]}$ м. Найдите время падения (в секундах). Примите $g=10$ м/с².`,solution:`$h=\\dfrac{gt^2}{2}$, откуда $t=\\sqrt{\\dfrac{2h}{g}}=\\sqrt{\\dfrac{2\\cdot${t[0]}}{10}}=${t[1]}$ с.`,explanation:`Из $h=\\frac{gt^2}{2}$ выразите время: $t=\\sqrt{2h/g}$.`,answer:t[1],dis:[t[0]/10,t[1]+1,2*t[1]]};});
def('kFreeFallVel',2,'AB','Свободное падение: скорость удара',r=>{const t=r.pick([[5,10],[20,20],[45,30],[80,40],[125,50]]);chk(t[1]*t[1]===2*G_ACC*t[0],'kfv');
  return{content:`Тело свободно падает без начальной скорости с высоты $${t[0]}$ м. С какой скоростью (в м/с) оно ударится о землю? $g=10$ м/с².`,solution:`$v=\\sqrt{2gh}=\\sqrt{2\\cdot10\\cdot${t[0]}}=${t[1]}$ м/с.`,explanation:`$v=\\sqrt{2gh}$.`,answer:t[1],dis:[t[0],t[1]+5,t[1]/2]};});
def('kVertUp',2,'AB','Подъём тела, брошенного вверх',r=>{const t=r.pick([[10,5],[20,20],[30,45],[40,80]]);chk(t[0]*t[0]===2*G_ACC*t[1],'kvu');
  return{content:`Тело брошено вертикально вверх со скоростью $${t[0]}$ м/с. На какую максимальную высоту (в метрах) оно поднимется? $g=10$ м/с².`,solution:`$H=\\dfrac{v_0^2}{2g}=\\dfrac{${t[0]*t[0]}}{2\\cdot10}=${t[1]}$ м.`,explanation:`В верхней точке скорость равна нулю: $H=\\frac{v_0^2}{2g}$.`,answer:t[1],dis:[t[0],t[1]+5,t[0]*2]};});
def('kVertUpTime',2,'AB','Время полёта тела вверх',r=>{const v0=r.pick([10,20,30,40,50]);const t=2*v0/G_ACC;chk(t*G_ACC===2*v0,'kvt');
  return{content:`Тело брошено вертикально вверх со скоростью $${v0}$ м/с. Через какое время (в секундах) оно вернётся в точку броска? $g=10$ м/с².`,solution:`Время подъёма $t_1=v_0/g$, полное время $t=\\dfrac{2v_0}{g}=\\dfrac{2\\cdot${v0}}{10}=${t}$ с.`,explanation:`Полное время полёта вдвое больше времени подъёма: $t=2v_0/g$.`,answer:t,dis:[v0/G_ACC,t+1,v0]};});
def('kHorizRange',3,'B','Горизонтальный бросок: дальность',r=>{const hh=r.pick([[5,1],[20,2],[45,3],[80,4]]);const v=r.int(4,20);const x=v*hh[1];chk(x===v*hh[1]&&hh[0]===G_ACC*hh[1]*hh[1]/2,'khr');
  return{content:`Камень брошен горизонтально со скоростью $${v}$ м/с с высоты $${hh[0]}$ м. Найдите дальность полёта (в метрах). $g=10$ м/с².`,solution:`Время падения $t=\\sqrt{2h/g}=${hh[1]}$ с. Дальность $L=v t=${v}\\cdot${hh[1]}=${x}$ м.`,explanation:`По вертикали — свободное падение (находим $t$), по горизонтали — равномерное движение ($L=vt$).`,answer:x,dis:[v,hh[0],v*hh[0]]};});
def('kHorizVel',4,'B','Горизонтальный бросок: скорость при падении',r=>{const t=r.pick([[24,10,26,1],[15,20,25,2],[21,20,29,2],[40,30,50,3],[30,40,50,4],[9,40,41,4]]);
  chk(t[0]*t[0]+t[1]*t[1]===t[2]*t[2]&&t[1]===G_ACC*t[3],'khv');
  return{content:`Тело брошено горизонтально со скоростью $${t[0]}$ м/с. Какова его скорость (в м/с) через $${t[3]}$ с после броска? $g=10$ м/с².`,solution:`Вертикальная скорость $v_y=gt=${t[1]}$ м/с. Полная скорость $v=\\sqrt{v_x^2+v_y^2}=\\sqrt{${t[0]*t[0]}+${t[1]*t[1]}}=${t[2]}$ м/с.`,explanation:`Скорости складываются векторно: $v=\\sqrt{v_x^2+v_y^2}$, где $v_y=gt$.`,answer:t[2],dis:[t[0]+t[1],t[1],t[0]]};});
def('kCircleAccel',2,'AB','Центростремительное ускорение',r=>{const t=r.pick([[20,50,8],[10,20,5],[4,8,2],[6,9,4],[12,36,4],[20,40,10],[8,16,4],[30,90,10],[15,45,5],[10,25,4]]);
  chk(t[0]*t[0]===t[2]*t[1],'kca');
  return{content:`Тело движется по окружности радиусом $${t[1]}$ м со скоростью $${t[0]}$ м/с. Найдите центростремительное ускорение (в м/с²).`,solution:`$a=\\dfrac{v^2}{R}=\\dfrac{${t[0]*t[0]}}{${t[1]}}=${t[2]}$ м/с².`,explanation:`Центростремительное ускорение $a=v^2/R$.`,answer:t[2],dis:[t[0]/t[1]<1?t[2]+2:Math.round(t[0]/t[1]),t[2]*2,t[0]]};});
def('kEquationMotion',3,'B','Уравнение движения x(t)',r=>{const A=r.int(2,9),B=r.int(3,12),C=r.int(1,5);const mode=r.pick(['a','v0']);
  const ans=mode==='a'?2*C:B;chk(ans===(mode==='a'?2*C:B),'kem');
  return{content:`Координата тела меняется по закону $x=${A}+${B}t+${C}t^2$ (м). Найдите ${mode==='a'?'модуль ускорения (в м/с²)':'начальную скорость (в м/с)'}.`,solution:`Сравнивая с $x=x_0+v_0 t+\\dfrac{a}{2}t^2$: $x_0=${A}$, $v_0=${B}$, $\\dfrac{a}{2}=${C}$, значит $a=${2*C}$. Ответ: $${ans}$.`,explanation:`Коэффициент при $t$ — это $v_0$, коэффициент при $t^2$ равен $a/2$.`,answer:ans,dis:[mode==='a'?C:2*B,A,mode==='a'?B:2*C]};});
def('kGraphVTdist',3,'B','График v(t): путь как площадь',r=>{const v1=r.int(2,8),t1=r.int(2,4),a=r.int(1,4),t2=r.int(2,4);const v2=v1+a*t2;
  const s=v1*t1 + (v1+v2)*t2/2;chk(approx(s, v1*t1+v1*t2+a*t2*t2/2),'gvd');if(!Number.isInteger(s))throw 0;
  const pts=[[0,v1],[t1,v1],[t1+t2,v2]];const xmax=t1+t2, ymax=Math.ceil(v2/2)*2+2;
  return{content:`На графике показана зависимость скорости тела от времени. Определите путь (в метрах), пройденный телом за всё показанное время.`,solution:`Путь равен площади под графиком. На участке $[0;${t1}]$ — прямоугольник $${v1}\\cdot${t1}=${v1*t1}$. На участке $[${t1};${t1+t2}]$ — трапеция $\\dfrac{(${v1}+${v2})}{2}\\cdot${t2}=${(v1+v2)*t2/2}$. Итого $s=${s}$ м.`,explanation:`Путь по графику $v(t)$ равен площади фигуры под линией скорости.`,answer:s,dis:[v1*t1,v2*xmax,Math.round((v1+v2)*xmax/2)],svg:svgLineGraph({pts,xmax,ymax,xstep:1,ystep:2,xlabel:'t, с',ylabel:'v, м/с',shade:true})};});
def('kGraphVTaccel',2,'AB','График v(t): ускорение как наклон',r=>{const v0=r.int(0,6),a=r.int(2,6),t=r.int(2,5);const v1=v0+a*t;chk((v1-v0)/t===a,'gva');
  const pts=[[0,v0],[t,v1]];const ymax=Math.ceil(v1/2)*2+2;
  return{content:`По графику зависимости скорости от времени определите ускорение тела (в м/с²).`,solution:`Ускорение — наклон графика: $a=\\dfrac{v_1-v_0}{t}=\\dfrac{${v1}-${v0}}{${t}}=${a}$ м/с².`,explanation:`На графике $v(t)$ ускорение равно угловому коэффициенту (наклону) прямой.`,answer:a,dis:[v1,v1/t>=1&&Number.isInteger(v1/t)?v1/t+1:a+1,v0+a],svg:svgLineGraph({pts,xmax:t,ymax,xstep:1,ystep:2,xlabel:'t, с',ylabel:'v, м/с'})};});

/* ================= ДИНАМИКА ================= */
def('dN2Accel',1,'AB','Второй закон Ньютона: ускорение',r=>{const m=r.int(2,9),a=r.int(2,8);const F=m*a;chk(F/m===a,'na');
  return{content:`На тело массой $${m}$ кг действует сила $${F}$ Н. Найдите ускорение тела (в м/с²).`,solution:`По второму закону Ньютона $a=\\dfrac{F}{m}=\\dfrac{${F}}{${m}}=${a}$ м/с².`,explanation:`$a=F/m$.`,answer:a,dis:[F*m,F+m,F-m]};});
def('dN2Force',1,'AB','Второй закон Ньютона: сила',r=>{const m=r.int(2,12),a=r.int(2,9);const F=m*a;chk(F===m*a,'nf');
  return{content:`Тело массой $${m}$ кг движется с ускорением $${a}$ м/с². Найдите равнодействующую силу (в Н).`,solution:`$F=ma=${m}\\cdot${a}=${F}$ Н.`,explanation:`$F=ma$.`,answer:F,dis:[m+a,Math.round(m/a)||1,F+m]};});
def('dN2Mass',2,'AB','Второй закон Ньютона: масса',r=>{const m=r.int(2,10),a=r.int(2,8);const F=m*a;chk(F/a===m,'nm');
  return{content:`Под действием силы $${F}$ Н тело движется с ускорением $${a}$ м/с². Найдите массу тела (в кг).`,solution:`$m=\\dfrac{F}{a}=\\dfrac{${F}}{${a}}=${m}$ кг.`,explanation:`$m=F/a$.`,answer:m,dis:[F*a,F-a,m+1]};});
def('dFricForce',2,'AB','Сила трения скольжения',r=>{const mu=r.pick([0.1,0.2,0.4,0.5]),m=r.pick([4,5,6,8,10,12,15,20]);const F=mu*m*G_ACC;if(!Number.isInteger(F))throw 0;chk(approx(F,mu*m*10),'ff');
  return{content:`Брусок массой $${m}$ кг скользит по горизонтальной поверхности. Коэффициент трения равен $${fmtNum(mu)}$. Найдите силу трения (в Н). $g=10$ м/с².`,solution:`$F_{тр}=\\mu m g=${fmtNum(mu)}\\cdot${m}\\cdot10=${F}$ Н.`,explanation:`Сила трения скольжения $F_{тр}=\\mu N=\\mu m g$ (на горизонтали).`,answer:F,dis:[m*G_ACC,round6(mu*m),round6(mu*G_ACC)]};});
def('dFricCoef',3,'A','Коэффициент трения',r=>{const mu=r.pick([0.15,0.2,0.25,0.3,0.35,0.4]),m=r.pick([2,4,5,8,10]);const N=m*G_ACC,F=round6(mu*N);chk(approx(F/N,mu),'fc');
  return{content:`Чтобы тащить брусок массой $${m}$ кг равномерно по горизонтали, прикладывают силу $${fmtNum(F)}$ Н. Найдите коэффициент трения. $g=10$ м/с².`,solution:`При равномерном движении $F=F_{тр}=\\mu m g$, откуда $\\mu=\\dfrac{F}{mg}=\\dfrac{${fmtNum(F)}}{${N}}=${fmtNum(mu)}$.`,explanation:`При равномерном движении приложенная сила равна силе трения: $\\mu=F/(mg)$.`,answer:mu,dis:[round6(F/m),round6(mu*2),round6(F/G_ACC)]};});
def('dTraction',3,'B','Сила тяги с учётом трения',r=>{const m=r.pick([2,4,5,8,10]),a=r.int(1,4),mu=r.pick([0.1,0.2,0.5]);const F=m*(a+mu*G_ACC);if(!Number.isInteger(F))throw 0;chk(F===m*a+Math.round(mu*m*G_ACC),'tr');
  return{content:`Тело массой $${m}$ кг разгоняют по горизонтали с ускорением $${a}$ м/с². Коэффициент трения $${fmtNum(mu)}$. Найдите силу тяги (в Н). $g=10$ м/с².`,solution:`$F=ma+\\mu m g=${m}\\cdot${a}+${fmtNum(mu)}\\cdot${m}\\cdot10=${m*a}+${Math.round(mu*m*G_ACC)}=${F}$ Н.`,explanation:`Сила тяги преодолевает трение и сообщает ускорение: $F=ma+\\mu mg$.`,answer:F,dis:[m*a,Math.round(mu*m*G_ACC),F+m]};});
def('dTwoBodies',3,'B','Связанные тела на гладком столе',r=>{const m1=r.int(1,4),m2=r.int(1,5),F=r.pick([10,12,20,24,30,15,18]);if((m1+m2)===0||F%(m1+m2)||(m2*F)%(m1+m2))throw 0;const a=F/(m1+m2),T=m2*a;chk(T===m2*F/(m1+m2),'tb');
  return{content:`Два бруска массами $${m1}$ кг и $${m2}$ кг связаны нитью и лежат на гладком столе. К первому приложена горизонтальная сила $${F}$ Н. Найдите силу натяжения нити (в Н).`,solution:`Ускорение системы $a=\\dfrac{F}{m_1+m_2}=\\dfrac{${F}}{${m1+m2}}=${a}$ м/с². Нить разгоняет второй брусок: $T=m_2 a=${m2}\\cdot${a}=${T}$ Н.`,explanation:`Сначала ускорение всей системы, затем $T=m_2 a$ (нить тянет только второе тело).`,answer:T,dis:[F,a,m1*a]};});
def('dWeightUp',2,'AB','Вес в ускоряющемся лифте (вверх)',r=>{const m=r.int(2,10),a=r.int(1,5);const P=m*(G_ACC+a);chk(P===m*G_ACC+m*a,'wu');
  return{content:`Лифт поднимается с ускорением $${a}$ м/с², направленным вверх. Найдите вес тела массой $${m}$ кг (в Н). $g=10$ м/с².`,solution:`$P=m(g+a)=${m}\\cdot(10+${a})=${P}$ Н.`,explanation:`При ускорении вверх вес больше силы тяжести: $P=m(g+a)$.`,answer:P,dis:[m*G_ACC,m*(G_ACC-a),m*a]};});
def('dWeightDown',2,'AB','Вес в ускоряющемся лифте (вниз)',r=>{const m=r.int(2,10),a=r.int(1,5);const P=m*(G_ACC-a);chk(P===m*G_ACC-m*a,'wd');
  return{content:`Лифт движется с ускорением $${a}$ м/с², направленным вниз. Найдите вес тела массой $${m}$ кг (в Н). $g=10$ м/с².`,solution:`$P=m(g-a)=${m}\\cdot(10-${a})=${P}$ Н.`,explanation:`При ускорении вниз вес меньше силы тяжести: $P=m(g-a)$.`,answer:P,dis:[m*G_ACC,m*(G_ACC+a),m*a]};});
def('dGravityHeight',3,'AB','Тяготение на высоте',r=>{const n=r.pick([1,2,3,4]);const k=(n+1)*(n+1);chk(k===(n+1)**2,'gh');
  return{content:`Во сколько раз уменьшится сила притяжения тела к Земле на высоте, равной $${n}$ радиус${n>1?'ам':'у'} Земли (считая от поверхности)?`,solution:`Расстояние до центра становится $(${n}+1)R=${n+1}R$. Сила $\\sim 1/r^2$, значит уменьшится в $(${n+1})^2=${k}$ раз.`,explanation:`На высоте $h=nR$ расстояние до центра равно $(n+1)R$, а сила обратна квадрату расстояния.`,answer:k,dis:[n+1,(n+1)*2,n*n]};});
def('dGravityMoon',3,'A','Ускорение свободного падения на планете',r=>{const t=r.pick([[4,2,10],[9,3,10],[2,2,20],[8,4,20],[16,4,10],[25,5,10],[4,4,40]]);
  const g=round6(G_ACC*t[1]*t[1]/t[0]);chk(approx(g,t[2]),'gm');
  return{content:`Масса планеты в $${t[0]}$ раз меньше массы Земли, а радиус — в $${t[1]}$ раз${t[1]>4?'':'а'} меньше земного. Найдите ускорение свободного падения на планете (в м/с²). На Земле $g=10$ м/с².`,solution:`$g=\\dfrac{GM}{R^2}$. Масса меньше в $${t[0]}$ раз, $R^2$ меньше в $${t[1]*t[1]}$ раз, поэтому $g'=10\\cdot\\dfrac{${t[1]*t[1]}}{${t[0]}}=${t[2]}$ м/с².`,explanation:`$g=GM/R^2$: учтите изменение и массы, и КВАДРАТА радиуса.`,answer:t[2],dis:[round6(G_ACC*t[1]/t[0]),round6(G_ACC/t[0]),round6(G_ACC*t[0]/(t[1]*t[1]))]};});
def('dCentripForce',3,'B','Центростремительная сила',r=>{const t=r.pick([[20,50,8],[10,20,5],[6,9,4],[12,36,4],[8,16,4],[30,90,10],[15,45,5]]);const m=r.pick([2,3,4,5]);const F=m*t[2];chk(F===m*t[0]*t[0]/t[1],'cf');
  return{content:`Тело массой $${m}$ кг движется по окружности радиусом $${t[1]}$ м со скоростью $${t[0]}$ м/с. Найдите центростремительную силу (в Н).`,solution:`$F=\\dfrac{mv^2}{R}=\\dfrac{${m}\\cdot${t[0]*t[0]}}{${t[1]}}=${F}$ Н.`,explanation:`Центростремительная сила $F=mv^2/R$.`,answer:F,dis:[m*t[0],t[2],m*t[0]*t[0]]};});
def('dBridgeConvex',4,'B','Выпуклый мост: сила давления',r=>{const t=r.pick([[1000,10,40,2.5],[1000,20,80,5],[2000,10,50,2],[1000,30,90,10],[800,10,40,2.5],[1500,20,100,4]]);
  const N=t[0]*(G_ACC-t[3]);chk(approx(t[3],t[1]*t[1]/t[2])&&N===t[0]*G_ACC-t[0]*t[3],'bcx');if(!Number.isInteger(N))throw 0;
  return{content:`Автомобиль массой $${t[0]}$ кг движется по выпуклому мосту радиусом $${t[2]}$ м со скоростью $${t[1]}$ м/с. С какой силой (в Н) он давит на мост в верхней точке? $g=10$ м/с².`,solution:`В верхней точке $mg-N=\\dfrac{mv^2}{R}$, откуда $N=m\\left(g-\\dfrac{v^2}{R}\\right)=${t[0]}\\cdot(10-${fmtNum(t[3])})=${N}$ Н. По 3-му закону Ньютона давление равно $N$.`,explanation:`В верхней точке $N=m(g-v^2/R)$ — давление меньше веса.`,answer:N,dis:[t[0]*G_ACC,t[0]*(G_ACC+t[3]),Math.round(t[0]*t[3])],svg:svgBridge(true,t[2],t[1])};});
def('dBridgeConcave',4,'B','Вогнутый мост: сила давления',r=>{const t=r.pick([[1000,10,40,2.5],[1500,20,100,4],[1000,20,80,5],[2000,10,50,2],[800,10,40,2.5]]);
  const N=t[0]*(G_ACC+t[3]);chk(approx(t[3],t[1]*t[1]/t[2])&&N===t[0]*G_ACC+t[0]*t[3],'bcc');if(!Number.isInteger(N))throw 0;
  return{content:`Автомобиль массой $${t[0]}$ кг проезжает нижнюю точку вогнутого моста радиусом $${t[2]}$ м со скоростью $${t[1]}$ м/с. С какой силой (в Н) он давит на мост? $g=10$ м/с².`,solution:`В нижней точке $N-mg=\\dfrac{mv^2}{R}$, откуда $N=m\\left(g+\\dfrac{v^2}{R}\\right)=${t[0]}\\cdot(10+${fmtNum(t[3])})=${N}$ Н.`,explanation:`В нижней точке $N=m(g+v^2/R)$ — давление больше веса.`,answer:N,dis:[t[0]*G_ACC,t[0]*(G_ACC-t[3]),Math.round(t[0]*t[3])],svg:svgBridge(false,t[2],t[1])};});
def('dLoopTop',3,'B','Минимальная скорость в верхней точке петли',r=>{const t=r.pick([[10,10],[40,20],[90,30],[160,40],[250,50]]);chk(t[1]*t[1]===G_ACC*t[0],'lt');
  return{content:`Тело движется по окружности радиусом $${t[0]}$ м в вертикальной плоскости. Какова минимальная скорость (в м/с) в верхней точке, чтобы нить не провисала? $g=10$ м/с².`,solution:`В верхней точке при минимальной скорости вся сила тяжести центростремительна: $mg=\\dfrac{mv^2}{R}$, откуда $v=\\sqrt{gR}=\\sqrt{10\\cdot${t[0]}}=${t[1]}$ м/с.`,explanation:`Минимум: натяжение нуль, $v=\\sqrt{gR}$.`,answer:t[1],dis:[t[0],t[1]+5,2*t[1]]};});
def('dIncline',3,'A','Ускорение на гладкой наклонной плоскости',r=>{const t=r.pick([[30,0.5,5],[37,0.6,6],[53,0.8,8]]);chk(approx(G_ACC*t[1],t[2]),'in');
  return{content:`Тело скользит без трения по наклонной плоскости с углом наклона $${t[0]}°$ ($\\sin${t[0]}°=${fmtNum(t[1])}$). Найдите ускорение тела (в м/с²). $g=10$ м/с².`,solution:`Вдоль гладкой плоскости $a=g\\sin\\alpha=10\\cdot${fmtNum(t[1])}=${t[2]}$ м/с².`,explanation:`На гладкой наклонной плоскости $a=g\\sin\\alpha$.`,answer:t[2],dis:[G_ACC,round6(G_ACC*(1-t[1])),round6(t[1])],svg:svgIncline(t[0],false)};});
def('dInclineComp',3,'A','Скатывающая сила на наклонной плоскости',r=>{const t=r.pick([[30,0.5],[37,0.6],[53,0.8]]);const m=r.pick([2,4,5,10]);const F=round6(m*G_ACC*t[1]);chk(approx(F,m*10*t[1]),'ic');
  return{content:`Тело массой $${m}$ кг лежит на наклонной плоскости с углом $${t[0]}°$ ($\\sin${t[0]}°=${fmtNum(t[1])}$). Найдите проекцию силы тяжести на направление вдоль плоскости (скатывающую силу, в Н). $g=10$ м/с².`,solution:`$F=mg\\sin\\alpha=${m}\\cdot10\\cdot${fmtNum(t[1])}=${fmtNum(F)}$ Н.`,explanation:`Скатывающая составляющая силы тяжести равна $mg\\sin\\alpha$.`,answer:F,dis:[m*G_ACC,round6(m*G_ACC*(1-t[1])),round6(m*t[1])],svg:svgIncline(t[0],true)};});
def('dHookeForce',1,'AB','Закон Гука: сила упругости',r=>{const k=r.pick([100,200,300,400,500,50,150]),x=r.pick([0.02,0.04,0.05,0.06,0.1,0.08]);const F=round6(k*x);if(!Number.isInteger(F))throw 0;chk(approx(F,k*x),'hk');
  return{content:`Пружину жёсткостью $${k}$ Н/м растянули на $${fmtNum(x*100)}$ см. Найдите силу упругости (в Н).`,solution:`$F=kx=${k}\\cdot${fmtNum(x)}=${F}$ Н (перевели см в метры).`,explanation:`Закон Гука $F=kx$; растяжение — в метрах.`,answer:F,dis:[round6(k*x*100),round6(k*x/10),k]};});
def('dHookeK',2,'AB','Закон Гука: жёсткость',r=>{const k=r.pick([100,200,250,400,500]),x=r.pick([0.02,0.04,0.05,0.1]);const F=round6(k*x);if(!Number.isInteger(F))throw 0;chk(approx(F/x,k),'hkk');
  return{content:`Под действием силы $${F}$ Н пружина удлинилась на $${fmtNum(x*100)}$ см. Найдите жёсткость пружины (в Н/м).`,solution:`$k=\\dfrac{F}{x}=\\dfrac{${F}}{${fmtNum(x)}}=${k}$ Н/м.`,explanation:`$k=F/x$; удлинение в метрах.`,answer:k,dis:[round6(F*x),round6(F/(x*100)),k+50]};});

/* ================= ЗАКОНЫ СОХРАНЕНИЯ ================= */
def('cMomentum',1,'AB','Импульс тела',r=>{const m=r.pick([0.5,1,2,3,4,5,10]),v=r.int(2,12);const p=round6(m*v);if(!Number.isInteger(p))throw 0;chk(approx(p,m*v),'mom');
  return{content:`Тело массой $${fmtNum(m)}$ кг движется со скоростью $${v}$ м/с. Найдите импульс тела (в кг·м/с).`,solution:`$p=mv=${fmtNum(m)}\\cdot${v}=${p}$ кг·м/с.`,explanation:`Импульс $p=mv$.`,answer:p,dis:[round6(m+v),round6(m*v*2),v]};});
def('cMomentumKmh',2,'AB','Импульс (скорость в км/ч)',r=>{const t=r.pick([[72,20],[36,10],[54,15],[90,25],[108,30]]);const m=r.pick([1000,1500,2000,500,800]);const p=m*t[1];chk(t[1]===t[0]/3.6,'mk');
  return{content:`Автомобиль массой $${m}$ кг движется со скоростью $${t[0]}$ км/ч. Найдите импульс (в кг·м/с).`,solution:`Переведём скорость: $${t[0]}$ км/ч $=${t[1]}$ м/с. Тогда $p=mv=${m}\\cdot${t[1]}=${p}$ кг·м/с.`,explanation:`Сначала км/ч → м/с (делим на 3,6), затем $p=mv$.`,answer:p,dis:[m*t[0],round6(m*t[0]/3.6/10),t[1]]};});
def('cKinetic',2,'AB','Кинетическая энергия',r=>{const m=r.pick([1,2,4,5,0.5]),v=r.int(2,12);const E=round6(m*v*v/2);if(!Number.isInteger(E))throw 0;chk(approx(2*E,m*v*v),'ke');
  return{content:`Тело массой $${fmtNum(m)}$ кг движется со скоростью $${v}$ м/с. Найдите его кинетическую энергию (в Дж).`,solution:`$E_к=\\dfrac{mv^2}{2}=\\dfrac{${fmtNum(m)}\\cdot${v*v}}{2}=${E}$ Дж.`,explanation:`$E_к=\\frac{mv^2}{2}$.`,answer:E,dis:[round6(m*v/2),round6(m*v*v),round6(m*v)]};});
def('cPotential',1,'AB','Потенциальная энергия',r=>{const m=r.pick([0.5,1,2,3,5,10]),h=r.int(2,15);const E=round6(m*G_ACC*h);if(!Number.isInteger(E))throw 0;chk(approx(E,m*10*h),'pe');
  return{content:`Тело массой $${fmtNum(m)}$ кг поднято на высоту $${h}$ м. Найдите потенциальную энергию относительно земли (в Дж). $g=10$ м/с².`,solution:`$E_п=mgh=${fmtNum(m)}\\cdot10\\cdot${h}=${E}$ Дж.`,explanation:`$E_п=mgh$.`,answer:E,dis:[round6(m*h),round6(m*G_ACC),round6(G_ACC*h)]};});
def('cSpringE',3,'A','Энергия сжатой пружины',r=>{const k=r.pick([200,100,400,800,50,1000,500]),x=r.pick([0.05,0.1,0.2,0.04]);const E=round6(k*x*x/2);chk(approx(2*E,k*x*x),'spe');
  return{content:`Пружину жёсткостью $${k}$ Н/м сжали на $${fmtNum(x*100)}$ см. Найдите потенциальную энергию пружины (в Дж).`,solution:`$E=\\dfrac{kx^2}{2}=\\dfrac{${k}\\cdot${fmtNum(round6(x*x))}}{2}=${fmtNum(E)}$ Дж.`,explanation:`$E=\\frac{kx^2}{2}$; сжатие в метрах.`,answer:E,dis:[round6(k*x/2),round6(k*x*x),round6(k*x*x*100)]};});
def('cBulletE',3,'B','Кинетическая энергия пули',r=>{const t=r.pick([[0.009,800,2880],[0.01,600,1800],[0.02,500,2500],[0.01,400,800],[0.005,400,400]]);
  chk(approx(t[0]*t[1]*t[1]/2,t[2]),'bе');
  return{content:`Пуля массой $${fmtNum(t[0]*1000)}$ г вылетает со скоростью $${t[1]}$ м/с. Найдите её кинетическую энергию (в Дж).`,solution:`$E_к=\\dfrac{mv^2}{2}=\\dfrac{${fmtNum(t[0])}\\cdot${t[1]*t[1]}}{2}=${t[2]}$ Дж.`,explanation:`$E_к=\\frac{mv^2}{2}$; массу перевести в кг.`,answer:t[2],dis:[round6(t[0]*t[1]/2),round6(t[0]*t[1]*t[1]),t[2]*2]};});
def('cInelastic',3,'B','Неупругий удар: общая скорость',r=>{const t=r.pick([[1,3,8,2],[2,2,10,5],[1,4,10,2],[3,1,8,6],[2,3,10,4],[4,1,10,8],[1,1,12,6]]);
  const v=t[0]*t[2]/(t[0]+t[1]);chk(v===t[3]&&Number.isInteger(v),'in');
  return{content:`Тело массой $${t[0]}$ кг движется со скоростью $${t[2]}$ м/с и сталкивается с неподвижным телом массой $${t[1]}$ кг. После неупругого удара они движутся вместе. Найдите их общую скорость (в м/с).`,solution:`По закону сохранения импульса $m_1 v=(m_1+m_2)u$, откуда $u=\\dfrac{${t[0]}\\cdot${t[2]}}{${t[0]+t[1]}}=${v}$ м/с.`,explanation:`Импульс сохраняется: $u=\\frac{m_1 v}{m_1+m_2}$.`,answer:v,dis:[t[2],Math.round(t[2]/2),t[0]+t[1]]};});
def('cCatchUp',3,'B','Догоняющий неупругий удар',r=>{const t=r.pick([[2,6,4,3,4],[3,8,1,4,7],[1,10,4,5,6],[2,9,1,3,7],[1,8,3,4,5]]);
  const u=(t[0]*t[1]+t[2]*t[3])/(t[0]+t[2]);chk(u===t[4]&&Number.isInteger(u),'cu');
  return{content:`Человек массой $${t[0]*10}$ кг бежит со скоростью $${t[1]}$ м/с и запрыгивает на тележку массой $${t[2]*10}$ кг, которая катится в ту же сторону со скоростью $${t[3]}$ м/с. Найдите общую скорость (в м/с).`,solution:`По закону сохранения импульса $u=\\dfrac{m_1 v_1+m_2 v_2}{m_1+m_2}=\\dfrac{${t[0]*10}\\cdot${t[1]}+${t[2]*10}\\cdot${t[3]}}{${(t[0]+t[2])*10}}=${u}$ м/с.`,explanation:`Импульсы складываются (одно направление): $u=\\frac{m_1v_1+m_2v_2}{m_1+m_2}$.`,answer:u,dis:[t[1],t[3],Math.round((t[1]+t[3])/2)]};});
def('cExplosion',4,'B','Разрыв снаряда',r=>{
  const cfg=r.pick([[1,200,2,400,200],[1,100,1,300,100],[2,150,1,600,100],[1,300,2,300,100],[1,200,3,200,100]]);
  const M=cfg[0]+cfg[2];const V=(cfg[3]*cfg[2]-cfg[1]*cfg[0])/M;chk(V===cfg[4]&&Number.isInteger(V),'ex');
  return{content:`Снаряд массой $${M}$ кг разрывается в полёте на два осколка. Осколок массой $${cfg[0]}$ кг летит назад со скоростью $${cfg[1]}$ м/с, осколок массой $${cfg[2]}$ кг — вперёд со скоростью $${cfg[3]}$ м/с. Найдите скорость снаряда (в м/с) до разрыва.`,solution:`Импульс сохраняется: $MV=-m_1 v_1+m_2 v_2=-${cfg[0]}\\cdot${cfg[1]}+${cfg[2]}\\cdot${cfg[3]}=${cfg[3]*cfg[2]-cfg[1]*cfg[0]}$. Тогда $V=\\dfrac{${cfg[3]*cfg[2]-cfg[1]*cfg[0]}}{${M}}=${V}$ м/с.`,explanation:`Векторная сумма импульсов осколков равна импульсу снаряда (назад — со знаком минус).`,answer:V,dis:[cfg[1],cfg[3],Math.round((cfg[1]+cfg[3])/2)]};});
def('cEnergyFall',2,'AB','Скорость из закона сохранения энергии',r=>{const t=r.pick([[5,10],[20,20],[45,30],[80,40],[125,50]]);chk(t[1]*t[1]===2*G_ACC*t[0],'ef');
  return{content:`Тело падает с высоты $${t[0]}$ м без начальной скорости. Используя закон сохранения энергии, найдите скорость у земли (в м/с). $g=10$ м/с².`,solution:`$mgh=\\dfrac{mv^2}{2}$, откуда $v=\\sqrt{2gh}=\\sqrt{2\\cdot10\\cdot${t[0]}}=${t[1]}$ м/с.`,explanation:`Потенциальная энергия переходит в кинетическую: $v=\\sqrt{2gh}$.`,answer:t[1],dis:[t[0],t[1]+5,t[1]/2]};});
def('cWorkGravity',1,'AB','Работа силы тяжести',r=>{const m=r.pick([0.5,1,2,4,5]),h=r.int(3,15);const A=round6(m*G_ACC*h);if(!Number.isInteger(A))throw 0;chk(approx(A,m*10*h),'wg');
  return{content:`Камень массой $${fmtNum(m)}$ кг падает с высоты $${h}$ м. Какую работу (в Дж) совершает сила тяжести? $g=10$ м/с².`,solution:`$A=mgh=${fmtNum(m)}\\cdot10\\cdot${h}=${A}$ Дж.`,explanation:`Работа силы тяжести $A=mgh$.`,answer:A,dis:[round6(m*h),round6(G_ACC*h),round6(m*G_ACC)]};});
def('cPower',2,'AB','Мощность',r=>{const t=r.int(2,10);const P=r.int(5,40);const A=P*t;chk(A/t===P,'pw');
  return{content:`За $${t}$ с совершена работа $${A}$ Дж. Найдите мощность (в Вт).`,solution:`$P=\\dfrac{A}{t}=\\dfrac{${A}}{${t}}=${P}$ Вт.`,explanation:`Мощность $P=A/t$.`,answer:P,dis:[A*t,A+t,P+t]};});
def('cPowerFv',2,'AB','Мощность через силу и скорость',r=>{const F=r.int(10,80),v=r.int(2,12);const P=F*v;chk(P===F*v,'pfv');
  return{content:`Сила тяги $${F}$ Н, скорость движения $${v}$ м/с. Найдите мощность (в Вт).`,solution:`$P=Fv=${F}\\cdot${v}=${P}$ Вт.`,explanation:`При постоянной скорости $P=Fv$.`,answer:P,dis:[F+v,Math.round(F/v),P+F]};});
def('cEfficiency',2,'AB','КПД механизма',r=>{const t=r.pick([[60,100,60],[40,50,80],[150,200,75],[30,50,60],[80,100,80],[45,90,50],[20,25,80]]);
  chk(Math.round(t[0]/t[1]*100)===t[2],'eff');
  return{content:`Полезная работа механизма $${t[0]}$ Дж, затраченная — $${t[1]}$ Дж. Найдите КПД (в %).`,solution:`$\\eta=\\dfrac{A_{пол}}{A_{затр}}\\cdot100\\%=\\dfrac{${t[0]}}{${t[1]}}\\cdot100\\%=${t[2]}\\%$.`,explanation:`КПД $=\\frac{A_{полезн}}{A_{затрач}}\\cdot100\\%$.`,answer:t[2],dis:[t[1]-t[0],100-t[2],t[0]]};});
def('cPendulumT',4,'B','Натяжение нити в нижней точке',r=>{const t=r.pick([[0.5,6,1,23],[1,4,2,18],[0.5,4,1,13],[2,3,3,26],[1,6,3,22]]);
  const T=t[0]*G_ACC+t[0]*t[1]*t[1]/t[2];chk(T===t[3]&&Number.isInteger(T),'pt');
  return{content:`Груз массой $${fmtNum(t[0])}$ кг на нити длиной $${t[2]}$ м проходит нижнюю точку со скоростью $${t[1]}$ м/с. Найдите силу натяжения нити (в Н). $g=10$ м/с².`,solution:`В нижней точке $T-mg=\\dfrac{mv^2}{L}$, откуда $T=mg+\\dfrac{mv^2}{L}=${fmtNum(t[0])}\\cdot10+\\dfrac{${fmtNum(t[0])}\\cdot${t[1]*t[1]}}{${t[2]}}=${T}$ Н.`,explanation:`$T=mg+\\frac{mv^2}{L}$ — натяжение больше веса на центростремительную силу.`,answer:T,dis:[Math.round(t[0]*G_ACC),Math.round(t[0]*t[1]*t[1]/t[2]),T+5]};});
def('cInclineFricE',4,'A','Скорость у подножия (с трением)',r=>{const t=r.pick([[7,0.2,10,10],[4,0.2,4,8],[2,0.2,1,6],[8,0.1,8,12]]);
  const inside=t[0]-t[1]*t[2];const v=Math.sqrt(2*G_ACC*inside);chk(approx(v,t[3]),'ife');
  return{content:`Санки спускаются с горки высотой $${t[0]}$ м. Длина горизонтального участка торможения $${t[2]}$ м, коэффициент трения $${fmtNum(t[1])}$. Найдите скорость (в м/с) в конце спуска. $g=10$ м/с².`,solution:`Энергия: $mgh-\\mu mg L=\\dfrac{mv^2}{2}$, откуда $v=\\sqrt{2g(h-\\mu L)}=\\sqrt{2\\cdot10\\cdot(${t[0]}-${fmtNum(t[1])}\\cdot${t[2]})}=${t[3]}$ м/с.`,explanation:`Часть потенциальной энергии тратится на трение: $\\frac{mv^2}{2}=mgh-\\mu mgL$.`,answer:t[3],dis:[round6(Math.sqrt(2*G_ACC*t[0])),t[3]+2,Math.round(t[3]/2)]};});

/* ================= ГИДРОСТАТИКА ================= */
def('hPressureDepth',1,'AB','Гидростатическое давление',r=>{const h=r.int(2,30);const p=10*h;chk(p===1000*G_ACC*h/1000,'hpd');
  return{content:`Найдите давление воды (в кПа) на глубине $${h}$ м. Плотность воды $1000$ кг/м³, $g=10$ м/с².`,solution:`$p=\\rho g h=1000\\cdot10\\cdot${h}=${p*1000}$ Па $=${p}$ кПа.`,explanation:`Гидростатическое давление $p=\\rho g h$.`,answer:p,dis:[h,p*10,1000*h]};});
def('hTwoLiquids',3,'B','Давление двух слоёв жидкости',r=>{const t=r.pick([[0.1,0.5,800,5],[0.2,0.5,800,6],[0.3,0.5,800,7],[0.2,0.25,800,4],[0.4,0.5,800,8],[0.5,0.5,800,9],[0.3,0.25,800,5]]);
  const h1=t[0],h2=t[1],rho2=t[2];const pk=(1000*h1+rho2*h2)*G_ACC/1000;chk(pk===t[3]&&Number.isInteger(pk),'h2l');
  return{content:`В сосуд налиты слой воды (плотность $1000$ кг/м³) высотой $${fmtNum(h1*100)}$ см и слой жидкости плотностью $${rho2}$ кг/м³ высотой $${fmtNum(h2*100)}$ см. Найдите давление на дно (в кПа). $g=10$ м/с².`,solution:`$p=\\rho_1 g h_1+\\rho_2 g h_2=10\\cdot(1000\\cdot${fmtNum(h1)}+${rho2}\\cdot${fmtNum(h2)})=${pk*1000}$ Па $=${pk}$ кПа.`,explanation:`Давления слоёв складываются: $p=g(\\rho_1 h_1+\\rho_2 h_2)$.`,answer:pk,dis:[round6(1000*h1*G_ACC/1000),round6(rho2*h2*G_ACC/1000),pk+5]};});
def('hDepth',2,'AB','Глубина по давлению',r=>{const h=r.int(2,25);const p=10*h;chk(p/10===h,'hd');
  return{content:`На какой глубине (в метрах) давление воды равно $${p}$ кПа? Плотность воды $1000$ кг/м³, $g=10$ м/с².`,solution:`$h=\\dfrac{p}{\\rho g}=\\dfrac{${p*1000}}{1000\\cdot10}=${h}$ м.`,explanation:`Из $p=\\rho g h$: $h=p/(\\rho g)$.`,answer:h,dis:[p,p*10,Math.round(p/100)||1]};});
def('hHydraulic',2,'AB','Гидравлический пресс',r=>{const S1=r.pick([2,4,5,10]),k=r.pick([10,20,50,100]);const S2=S1*k;const F1=r.int(20,80);const F2=F1*k;chk(F2===F1*S2/S1,'hh');
  return{content:`Площадь малого поршня гидравлического пресса $${S1}$ см², большого — $${S2}$ см². На малый поршень действует сила $${F1}$ Н. Найдите силу (в Н) на большом поршне.`,solution:`$\\dfrac{F_1}{S_1}=\\dfrac{F_2}{S_2}$, откуда $F_2=F_1\\dfrac{S_2}{S_1}=${F1}\\cdot${k}=${F2}$ Н.`,explanation:`Давление одинаково: $F_2=F_1\\cdot S_2/S_1$.`,answer:F2,dis:[F1,Math.round(F1/k)||1,F1*S1]};});
def('hArchimedes',1,'AB','Сила Архимеда',r=>{const V=r.pick([0.01,0.02,0.03,0.05,0.005,0.1]),rho=r.pick([1000,800]);const Fa=round6(rho*G_ACC*V);if(!Number.isInteger(Fa))throw 0;chk(approx(Fa,rho*10*V),'ar');
  return{content:`Тело объёмом $${fmtNum(V)}$ м³ полностью погружено в жидкость плотностью $${rho}$ кг/м³. Найдите выталкивающую силу (в Н). $g=10$ м/с².`,solution:`$F_A=\\rho g V=${rho}\\cdot10\\cdot${fmtNum(V)}=${Fa}$ Н.`,explanation:`Сила Архимеда $F_A=\\rho_{ж} g V$.`,answer:Fa,dis:[round6(rho*V),round6(G_ACC*V),Fa*2]};});
def('hFloatDensity',2,'AB','Плотность плавающего тела',r=>{const t=r.pick([[3,4,750],[1,2,500],[4,5,800],[9,10,900],[3,5,600],[7,10,700]]);const rho=1000*t[0]/t[1];chk(rho===t[2],'fd');
  return{content:`Деревянный брусок плавает в воде, погрузившись на $${t[0]}/${t[1]}$ своего объёма. Найдите плотность дерева (в кг/м³). Плотность воды $1000$ кг/м³.`,solution:`При плавании $\\rho_{т} V=\\rho_{в}V_{подв}$, значит $\\rho_{т}=1000\\cdot\\dfrac{${t[0]}}{${t[1]}}=${rho}$ кг/м³.`,explanation:`Условие плавания: $\\rho_{тела}=\\rho_{жидк}\\cdot\\frac{V_{подв}}{V}$.`,answer:rho,dis:[1000,1000-rho,Math.round(1000*t[1]/t[0])]};});
def('hIceberg',3,'B','Объём льдины',r=>{const Vs=r.pick([9,18,27,36,45]);const V=Vs*1000/900;chk(900*V===1000*Vs&&Number.isInteger(V),'ib');
  return{content:`Льдина плавает в воде. Объём подводной части $${Vs}$ м³. Найдите полный объём льдины (в м³). Плотность льда $900$ кг/м³, воды $1000$ кг/м³.`,solution:`Условие плавания: $\\rho_{лёд}V=\\rho_{вода}V_{подв}$, откуда $V=V_{подв}\\dfrac{\\rho_{вода}}{\\rho_{лёд}}=${Vs}\\cdot\\dfrac{1000}{900}=${V}$ м³.`,explanation:`$V=V_{подв}\\cdot\\rho_{воды}/\\rho_{льда}$.`,answer:V,dis:[Vs,V+Vs,Math.round(Vs*900/1000)]};});
def('hBarometer',2,'AB','Высота по барометру',r=>{const dmm=r.int(2,8)*5;const h=dmm*12;chk(h/12===dmm,'bar');
  return{content:`При подъёме барометр показал уменьшение давления на $${dmm}$ мм рт. ст. Давление падает на $1$ мм рт. ст. каждые $12$ м. На какую высоту (в метрах) поднялись?`,solution:`$h=${dmm}\\cdot12=${h}$ м.`,explanation:`Высота = (изменение давления в мм)·12 м.`,answer:h,dis:[dmm,Math.round(dmm/12)||1,dmm*10]};});

/* ================= МКТ И ТЕРМОДИНАМИКА ================= */
def('tAmount',1,'AB','Количество вещества',r=>{const t=r.pick([[44,'углекислого газа CO₂',88,2],[18,'воды H₂O',36,2],[2,'водорода H₂',6,3],[32,'кислорода O₂',96,3],[28,'азота N₂',56,2],[44,'CO₂',132,3],[18,'воды',90,5]]);
  const n=t[2]/t[0];chk(n===t[3],'am');
  return{content:`Найдите количество вещества (в молях) в $${t[2]}$ г ${t[1]} (молярная масса $${t[0]}$ г/моль).`,solution:`$\\nu=\\dfrac{m}{M}=\\dfrac{${t[2]}}{${t[0]}}=${n}$ моль.`,explanation:`Количество вещества $\\nu=m/M$.`,answer:n,dis:[t[2]*t[0],t[2]+t[0],n+1]};});
def('tIsobaric',2,'AB','Изобарный процесс (закон Гей-Люссака)',r=>{const t=r.pick([[300,400,6,8],[300,600,5,10],[200,300,10,15],[300,400,9,12],[400,500,8,10],[300,450,4,6]]);
  const V2=t[2]*t[1]/t[0];chk(V2===t[3]&&Number.isInteger(V2),'ib');
  return{content:`При постоянном давлении газ объёмом $${t[2]}$ л нагрели от $${t[0]}$ К до $${t[1]}$ К. Найдите новый объём (в литрах).`,solution:`$\\dfrac{V_1}{T_1}=\\dfrac{V_2}{T_2}$, откуда $V_2=V_1\\dfrac{T_2}{T_1}=${t[2]}\\cdot\\dfrac{${t[1]}}{${t[0]}}=${V2}$ л.`,explanation:`Изобара: $V/T=const$ (T в Кельвинах).`,answer:V2,dis:[t[2],Math.round(t[2]*t[0]/t[1]),V2+t[2]]};});
def('tIsochoric',2,'AB','Изохорный процесс (закон Шарля)',r=>{const t=r.pick([[300,400,6,8],[300,600,5,10],[200,300,10,15],[300,450,4,6]]);
  const p2=t[2]*t[1]/t[0];chk(p2===t[3],'ix');
  return{content:`При постоянном объёме давление газа было $${t[2]}$ кПа при температуре $${t[0]}$ К. Найдите давление (в кПа) при $${t[1]}$ К.`,solution:`$\\dfrac{p_1}{T_1}=\\dfrac{p_2}{T_2}$, откуда $p_2=p_1\\dfrac{T_2}{T_1}=${t[2]}\\cdot\\dfrac{${t[1]}}{${t[0]}}=${p2}$ кПа.`,explanation:`Изохора: $p/T=const$.`,answer:p2,dis:[t[2],Math.round(t[2]*t[0]/t[1]),p2+t[2]]};});
def('tIsothermal',2,'AB','Изотермический процесс (закон Бойля)',r=>{const p1=r.pick([200,300,400,600]),k=r.pick([2,3,4]);const V1=r.pick([2,3,4,6,12]);const V2=V1*k;const p2=p1/k;if(!Number.isInteger(p2))throw 0;chk(p1*V1===p2*V2,'it');
  return{content:`При постоянной температуре газ объёмом $${V1}$ л под давлением $${p1}$ кПа расширили до $${V2}$ л. Найдите новое давление (в кПа).`,solution:`$p_1 V_1=p_2 V_2$, откуда $p_2=\\dfrac{p_1 V_1}{V_2}=\\dfrac{${p1}\\cdot${V1}}{${V2}}=${p2}$ кПа.`,explanation:`Изотерма: $pV=const$.`,answer:p2,dis:[p1,p1*k,Math.round(p1/2)]};});
def('tHeatWarm',2,'AB','Количество теплоты при нагревании',r=>{const c=r.pick([[4200,'воды'],[2100,'льда'],[920,'алюминия'],[400,'меди'],[460,'стали']]);const m=r.pick([0.5,1,2,0.2,5]),dT=r.pick([10,20,40,50,80,100]);
  const Q=round6(c[0]*m*dT/1000);if(!Number.isInteger(Q))throw 0;chk(approx(Q*1000,c[0]*m*dT),'hw');
  return{content:`Сколько теплоты (в кДж) нужно, чтобы нагреть $${fmtNum(m)}$ кг ${c[1]} на $${dT}$ °C? Удельная теплоёмкость $${c[0]}$ Дж/(кг·°C).`,solution:`$Q=cm\\Delta T=${c[0]}\\cdot${fmtNum(m)}\\cdot${dT}=${Q*1000}$ Дж $=${Q}$ кДж.`,explanation:`$Q=cm\\Delta T$.`,answer:Q,dis:[round6(c[0]*m/1000),Q*2,round6(c[0]*dT/1000)]};});
def('tHeatVapor',2,'AB','Теплота парообразования/конденсации',r=>{const m=r.pick([0.1,0.2,0.5,1,2]),L=r.pick([[2300000,'воды',2300]]);const Q=round6(L[0]*m/1000);if(!Number.isInteger(Q))throw 0;chk(approx(Q*1000,L[0]*m),'hv');
  return{content:`Какое количество теплоты (в кДж) выделится при конденсации $${fmtNum(m)}$ кг водяного пара? Удельная теплота парообразования $2{,}3\\cdot10^6$ Дж/кг.`,solution:`$Q=Lm=2{,}3\\cdot10^6\\cdot${fmtNum(m)}=${Q*1000}$ Дж $=${Q}$ кДж.`,explanation:`$Q=Lm$.`,answer:Q,dis:[round6(L[0]/1000),Q*2,round6(m*1000)]};});
def('tEffEngine',2,'AB','КПД тепловой машины',r=>{const t=r.pick([[500,300,40],[500,200,60],[1000,600,40],[800,200,75],[400,100,75],[600,300,50],[1000,250,75]]);
  const eta=Math.round((t[0]-t[1])/t[0]*100);chk(eta===t[2],'te');
  return{content:`Нагреватель передал газу $${t[0]}$ Дж теплоты, холодильнику отдано $${t[1]}$ Дж. Найдите КПД тепловой машины (в %).`,solution:`$\\eta=\\dfrac{Q_1-Q_2}{Q_1}\\cdot100\\%=\\dfrac{${t[0]}-${t[1]}}{${t[0]}}\\cdot100\\%=${t[2]}\\%$.`,explanation:`$\\eta=\\frac{Q_1-Q_2}{Q_1}\\cdot100\\%$.`,answer:t[2],dis:[Math.round(t[1]/t[0]*100),t[0]-t[1],100-t[2]]};});
def('tCarnot',3,'AB','КПД цикла Карно',r=>{const t=r.pick([[400,300,25],[500,300,40],[600,300,50],[1000,300,70],[500,400,20],[800,200,75],[600,150,75]]);
  const eta=Math.round((1-t[1]/t[0])*100);chk(eta===t[2],'tc');
  return{content:`Тепловая машина работает по циклу Карно: температура нагревателя $${t[0]}$ К, холодильника $${t[1]}$ К. Найдите КПД (в %).`,solution:`$\\eta=\\left(1-\\dfrac{T_х}{T_н}\\right)\\cdot100\\%=\\left(1-\\dfrac{${t[1]}}{${t[0]}}\\right)\\cdot100\\%=${t[2]}\\%$.`,explanation:`Для цикла Карно $\\eta=1-T_х/T_н$ (в Кельвинах).`,answer:t[2],dis:[Math.round(t[1]/t[0]*100),100-t[2],t[0]-t[1]]};});
def('tWorkIsobaric',3,'B','Работа газа при изобарном расширении',r=>{const p=r.pick([100,200,150,50,300])*1000;const dV=r.pick([0.01,0.02,0.05,0.1]);const A=round6(p*dV);if(!Number.isInteger(A))throw 0;chk(approx(A,p*dV),'wi');
  return{content:`Газ при постоянном давлении $${p/1000}$ кПа расширился на $${fmtNum(dV)}$ м³. Какую работу (в Дж) совершил газ?`,solution:`$A=p\\Delta V=${p}\\cdot${fmtNum(dV)}=${A}$ Дж.`,explanation:`Работа газа при изобарном процессе $A=p\\Delta V$.`,answer:A,dis:[round6(p*dV*10),round6(p/dV),A*2]};});
def('tHeatToWork',3,'B','Работа двигателя по КПД',r=>{const eta=r.pick([20,25,40,50,75]),Q1=r.pick([2000,4000,800,1000,2400]);const A=eta*Q1/100;if(!Number.isInteger(A))throw 0;chk(A===eta*Q1/100,'htw');
  return{content:`КПД теплового двигателя $${eta}\\%$. От нагревателя получено $${Q1}$ Дж. Какую работу (в Дж) совершил двигатель?`,solution:`$A=\\eta Q_1=${eta/100}\\cdot${Q1}=${A}$ Дж.`,explanation:`$A=\\eta\\cdot Q_1$.`,answer:A,dis:[Q1-A,Q1,Math.round(Q1*eta)]};});
def('tHumidity',2,'AB','Относительная влажность',r=>{const cfg=r.pick([[12,20,60],[9,18,50],[15,20,75],[8,16,50],[17,20,85],[6,15,40]]);
  const phi=Math.round(cfg[0]/cfg[1]*100);chk(phi===cfg[2],'hum');
  return{content:`Абсолютная влажность воздуха $${cfg[0]}$ г/м³, плотность насыщенного пара при этой температуре $${cfg[1]}$ г/м³. Найдите относительную влажность (в %).`,solution:`$\\varphi=\\dfrac{\\rho}{\\rho_{нас}}\\cdot100\\%=\\dfrac{${cfg[0]}}{${cfg[1]}}\\cdot100\\%=${phi}\\%$.`,explanation:`Относительная влажность $=\\frac{\\rho}{\\rho_{нас}}\\cdot100\\%$.`,answer:phi,dis:[cfg[1]-cfg[0],100-phi,cfg[0]]};});

/* ================= ЭЛЕКТРИЧЕСТВО ================= */
def('eOhm',1,'AB','Закон Ома для участка цепи',r=>{const R=r.int(2,20),I=r.int(1,9);const U=R*I;chk(U/R===I,'ohm');
  return{content:`К резистору сопротивлением $${R}$ Ом приложено напряжение $${U}$ В. Найдите силу тока (в А).`,solution:`$I=\\dfrac{U}{R}=\\dfrac{${U}}{${R}}=${I}$ А.`,explanation:`Закон Ома $I=U/R$.`,answer:I,dis:[U*R,U+R,U-R]};});
def('eOhmR',1,'AB','Сопротивление по закону Ома',r=>{const I=r.int(1,8),R=r.int(2,15);const U=I*R;chk(U/I===R,'ohmr');
  return{content:`При напряжении $${U}$ В через резистор течёт ток $${I}$ А. Найдите сопротивление (в Ом).`,solution:`$R=\\dfrac{U}{I}=\\dfrac{${U}}{${I}}=${R}$ Ом.`,explanation:`$R=U/I$.`,answer:R,dis:[U*I,U+I,R+1]};});
def('eSeries',2,'AB','Последовательное соединение',r=>{const R1=r.int(2,12),R2=r.int(2,15);const R=R1+R2;const I=r.int(1,5);const U=I*R;chk(U/R===I,'es');
  return{content:`Два резистора $${R1}$ Ом и $${R2}$ Ом соединены последовательно и подключены к напряжению $${U}$ В. Найдите силу тока в цепи (в А).`,solution:`Общее сопротивление $R=R_1+R_2=${R}$ Ом. Ток $I=\\dfrac{U}{R}=\\dfrac{${U}}{${R}}=${I}$ А.`,explanation:`Последовательно: $R=R_1+R_2$, ток одинаков.`,answer:I,dis:[Math.round(U/R1),U,R+1],svg:svgSeries(R1,R2,U)};});
def('eSeriesU',2,'AB','Напряжение на резисторе (последовательно)',r=>{const R1=r.int(2,10),R2=r.int(2,12);const R=R1+R2;const I=r.int(1,5);const U=I*R;const U1=I*R1;chk(U1===I*R1,'esu');
  return{content:`Резисторы $${R1}$ Ом и $${R2}$ Ом соединены последовательно, напряжение источника $${U}$ В. Найдите напряжение (в В) на первом резисторе.`,solution:`Ток $I=\\dfrac{U}{R_1+R_2}=\\dfrac{${U}}{${R}}=${I}$ А. Напряжение $U_1=IR_1=${I}\\cdot${R1}=${U1}$ В.`,explanation:`Сначала общий ток, затем $U_1=IR_1$.`,answer:U1,dis:[U,I*R2,U-U1],svg:svgSeries(R1,R2,U)};});
def('eParallel',3,'B','Параллельное соединение',r=>{const t=r.pick([[6,12,4],[4,4,2],[3,6,2],[2,2,1],[4,12,3],[6,3,2],[10,15,6],[20,30,12],[8,8,4]]);
  const R=t[2];const I=r.int(2,6);const U=I*R;chk(approx(t[0]*t[1]/(t[0]+t[1]),R),'ep');
  return{content:`Два резистора $${t[0]}$ Ом и $${t[1]}$ Ом соединены параллельно, к ним приложено напряжение $${U}$ В. Найдите общий ток (в А).`,solution:`Общее сопротивление $R=\\dfrac{R_1 R_2}{R_1+R_2}=\\dfrac{${t[0]}\\cdot${t[1]}}{${t[0]+t[1]}}=${R}$ Ом. Ток $I=\\dfrac{U}{R}=\\dfrac{${U}}{${R}}=${I}$ А.`,explanation:`Параллельно: $R=\\frac{R_1R_2}{R_1+R_2}$, напряжение одинаково.`,answer:I,dis:[Math.round(U/(t[0]+t[1]))||1,U,t[0]+t[1]],svg:svgParallel(t[0],t[1],U)};});
def('eEMF',3,'B','Закон Ома для полной цепи',r=>{const t=r.pick([[12,10,2,1],[24,4,2,4],[10,3,2,2],[12,4,2,2],[9,1,2,3],[20,8,2,2],[12,5,1,2]]);
  const I=t[0]/(t[1]+t[2]);chk(I===t[3]&&Number.isInteger(I),'emf');
  return{content:`ЭДС источника $${t[0]}$ В, внутреннее сопротивление $${t[2]}$ Ом, внешнее сопротивление $${t[1]}$ Ом. Найдите силу тока (в А).`,solution:`$I=\\dfrac{\\varepsilon}{R+r}=\\dfrac{${t[0]}}{${t[1]}+${t[2]}}=${I}$ А.`,explanation:`Закон Ома для полной цепи $I=\\frac{\\varepsilon}{R+r}$.`,answer:I,dis:[Math.round(t[0]/t[1]),t[0],I+1],svg:svgEMF(t[1],t[2],t[0])};});
def('eEMFvoltage',3,'B','Напряжение на зажимах источника',r=>{const t=r.pick([[12,10,2,1],[24,4,2,4],[10,3,2,2],[12,4,2,2],[20,8,2,2]]);
  const I=t[0]/(t[1]+t[2]);const U=I*t[1];chk(U===t[0]-I*t[2],'emfu');
  return{content:`ЭДС источника $${t[0]}$ В, внутреннее сопротивление $${t[2]}$ Ом. К нему подключён резистор $${t[1]}$ Ом. Найдите напряжение (в В) на зажимах источника.`,solution:`Ток $I=\\dfrac{\\varepsilon}{R+r}=${I}$ А. Напряжение на зажимах $U=IR=${I}\\cdot${t[1]}=${U}$ В.`,explanation:`$U=\\varepsilon-Ir=IR$.`,answer:U,dis:[t[0],I*t[2],t[0]-U],svg:svgEMF(t[1],t[2],t[0])};});
def('ePowerHeater',2,'AB','Мощность и сопротивление нагревателя',r=>{const t=r.pick([[120,60,240],[60,30,120],[100,50,200],[200,100,400],[40,20,80],[60,20,180]]);
  const R=t[0]*t[0]/t[1];chk(R===t[2],'ph');
  return{content:`Электронагреватель мощностью $${t[1]}$ Вт работает при напряжении $${t[0]}$ В. Найдите его сопротивление (в Ом).`,solution:`$P=\\dfrac{U^2}{R}$, откуда $R=\\dfrac{U^2}{P}=\\dfrac{${t[0]*t[0]}}{${t[1]}}=${R}$ Ом.`,explanation:`$R=U^2/P$.`,answer:R,dis:[Math.round(t[0]/t[1]*10),t[0],t[1]]};});
def('eJoule',2,'AB','Закон Джоуля–Ленца',r=>{const I=r.int(1,5),R=r.int(2,12),tt=r.int(2,10);const Q=I*I*R*tt;chk(Q===I*I*R*tt,'jl');
  return{content:`По резистору $${R}$ Ом течёт ток $${I}$ А в течение $${tt}$ с. Сколько теплоты (в Дж) выделится?`,solution:`$Q=I^2 R t=${I*I}\\cdot${R}\\cdot${tt}=${Q}$ Дж.`,explanation:`Закон Джоуля–Ленца $Q=I^2 R t$.`,answer:Q,dis:[I*R*tt,I*I*R,Q*2]};});
def('eCoulomb',3,'B','Закон Кулона',r=>{const t=r.pick([[10,10,3,1],[20,20,3,4],[30,30,3,9],[10,40,2,9],[10,10,1,9],[50,50,3,25],[20,20,6,1]]);
  const F=round6(0.09*t[0]*t[1]/(t[2]*t[2]));chk(approx(F,t[3]),'cl');
  return{content:`Два точечных заряда $${t[0]}$ нКл и $${t[1]}$ нКл находятся на расстоянии $${t[2]}$ см. Найдите силу взаимодействия (в мН). $k=9\\cdot10^9$ Н·м²/Кл².`,solution:`$F=k\\dfrac{q_1 q_2}{r^2}=9\\cdot10^9\\cdot\\dfrac{${t[0]}\\cdot${t[1]}\\cdot10^{-18}}{(${fmtNum(t[2]/100)})^2}=${t[3]}\\cdot10^{-3}$ Н $=${t[3]}$ мН.`,explanation:`Закон Кулона $F=k\\frac{q_1 q_2}{r^2}$; переведите нКл→Кл и см→м.`,answer:t[3],dis:[t[3]*2,Math.max(1,Math.round(t[3]/2)),t[3]+1]};});
def('eFieldForce',2,'AB','Напряжённость через силу',r=>{const q=r.pick([2,4,5,10]),E=r.int(2,9);const F=round6(q*1e-6*E*1000);const ans=E;chk(approx(F/(q*1e-6),E*1000),'eff2');
  return{content:`На заряд $${q}$ мкКл в электрическом поле действует сила $${fmtNum(round6(q*E/1000))}$ Н. Найдите напряжённость поля (в кВ/м).`,solution:`$E=\\dfrac{F}{q}=\\dfrac{${fmtNum(round6(q*E/1000))}}{${q}\\cdot10^{-6}}=${E}\\cdot10^{3}$ В/м $=${E}$ кВ/м.`,explanation:`$E=F/q$ (заряд в Кл).`,answer:ans,dis:[q*E,Math.round(E/q)||1,q]};});
def('eCapacitorQ',2,'AB','Заряд конденсатора',r=>{const C=r.int(2,10),U=r.pick([50,100,200,20,10]);const q=C*U;chk(q===C*U,'cq');
  return{content:`Конденсатор ёмкостью $${C}$ мкФ заряжён до напряжения $${U}$ В. Найдите заряд (в мкКл).`,solution:`$q=CU=${C}\\cdot${U}=${q}$ мкКл.`,explanation:`$q=CU$ (в мкФ·В получаем мкКл).`,answer:q,dis:[Math.round(U/C)||1,C+U,q*2]};});
def('eCapacitorE',3,'B','Энергия конденсатора',r=>{const C=r.pick([2,4,8,10,1]),U=r.pick([100,200,50,10]);const W=round6(C*U*U/2);chk(approx(2*W,C*U*U),'cqe');
  return{content:`Конденсатор ёмкостью $${C}$ мкФ заряжён до $${U}$ В. Найдите энергию (в мкДж).`,solution:`$W=\\dfrac{CU^2}{2}=\\dfrac{${C}\\cdot${U*U}}{2}=${W}$ мкДж.`,explanation:`$W=\\frac{CU^2}{2}$.`,answer:W,dis:[round6(C*U/2),round6(C*U*U),round6(C*U)]};});

/* ================= МАГНЕТИЗМ ================= */
def('mAmpere',2,'AB','Сила Ампера',r=>{const t=r.pick([[0.2,10,0.5,1],[0.5,10,0.2,1],[0.4,5,1,2],[0.5,4,1,2],[0.8,5,0.5,2],[0.5,12,0.5,3],[0.2,5,1,1],[0.4,10,0.5,2]]);
  const B=t[0],I=t[1],L=t[2];const F=round6(B*I*L);chk(F===t[3]&&Number.isInteger(F),'amp');
  return{content:`Прямой проводник длиной $${fmtNum(L)}$ м с током $${I}$ А находится в однородном магнитном поле с индукцией $${fmtNum(B)}$ Тл перпендикулярно линиям. Найдите силу Ампера (в Н).`,solution:`$F=BIL=${fmtNum(B)}\\cdot${I}\\cdot${fmtNum(L)}=${F}$ Н.`,explanation:`Сила Ампера $F=BIL\\sin\\alpha$, при $\\alpha=90°$ $F=BIL$.`,answer:F,dis:[round6(B*I),round6(I*L),round6(B*L)]};});
def('mInduction',2,'AB','Индукция через силу Ампера',r=>{const I=r.int(2,10),L=r.pick([0.2,0.5,0.4,1]),B=r.pick([0.2,0.5,1,2]);const F=round6(B*I*L);if(!Number.isInteger(F))throw 0;chk(approx(F/(I*L),B),'mind');
  return{content:`На проводник длиной $${fmtNum(L)}$ м с током $${I}$ А магнитное поле действует с силой $${F}$ Н (поле перпендикулярно току). Найдите индукцию поля (в Тл).`,solution:`$B=\\dfrac{F}{IL}=\\dfrac{${F}}{${I}\\cdot${fmtNum(L)}}=${fmtNum(B)}$ Тл.`,explanation:`Из $F=BIL$: $B=F/(IL)$.`,answer:B,dis:[round6(F*I),round6(F/I),round6(B*2)]};});
def('mFlux',2,'AB','Магнитный поток',r=>{const B=r.pick([0.5,0.2,0.4,1,2]),S=r.pick([0.02,0.05,0.01,0.1,0.04]);const Phi=round6(B*S*1000);if(!Number.isInteger(Phi))throw 0;chk(approx(Phi/1000,B*S),'flux');
  return{content:`Контур площадью $${fmtNum(S)}$ м² расположен перпендикулярно однородному полю индукцией $${fmtNum(B)}$ Тл. Найдите магнитный поток (в мВб).`,solution:`$\\Phi=BS=${fmtNum(B)}\\cdot${fmtNum(S)}=${fmtNum(round6(B*S))}$ Вб $=${Phi}$ мВб.`,explanation:`$\\Phi=BS\\cos\\alpha$; при перпендикулярном поле $\\Phi=BS$.`,answer:Phi,dis:[round6(B*S),round6(B+S),Phi*2]};});
def('mEMFflux',3,'B','ЭДС индукции',r=>{const t=r.pick([[0.8,0.2,0.2,3],[0.6,0.2,0.2,2],[1,0.4,0.3,2],[0.5,0.1,0.2,2],[0.9,0.3,0.2,3]]);
  const eps=round6((t[0]-t[1])/t[2]);chk(approx(eps,t[3]),'emff');
  return{content:`Магнитный поток через контур изменился с $${fmtNum(t[0])}$ Вб до $${fmtNum(t[1])}$ Вб за $${fmtNum(t[2])}$ с. Найдите ЭДС индукции (в В).`,solution:`$\\varepsilon=\\left|\\dfrac{\\Delta\\Phi}{\\Delta t}\\right|=\\dfrac{${fmtNum(t[0])}-${fmtNum(t[1])}}{${fmtNum(t[2])}}=${t[3]}$ В.`,explanation:`Закон Фарадея $\\varepsilon=|\\Delta\\Phi/\\Delta t|$.`,answer:t[3],dis:[round6(t[0]-t[1]),round6((t[0]+t[1])/t[2]),t[3]+1]};});
def('mSelfInd',3,'B','ЭДС самоиндукции',r=>{const L=r.pick([0.2,0.5,0.1,0.4,1]),dI=r.int(2,8),dt=r.pick([0.1,0.2,0.5,0.05]);const eps=round6(L*dI/dt);if(!Number.isInteger(eps))throw 0;chk(approx(eps,L*dI/dt),'si');
  return{content:`В катушке индуктивностью $${fmtNum(L)}$ Гн ток за $${fmtNum(dt)}$ с изменился на $${dI}$ А. Найдите ЭДС самоиндукции (в В).`,solution:`$\\varepsilon=L\\dfrac{\\Delta I}{\\Delta t}=${fmtNum(L)}\\cdot\\dfrac{${dI}}{${fmtNum(dt)}}=${eps}$ В.`,explanation:`$\\varepsilon=L\\frac{\\Delta I}{\\Delta t}$.`,answer:eps,dis:[round6(L*dI),round6(L/dt),eps+1]};});
def('mLorentzVel',4,'B','Скорость частицы (сила Лоренца)',r=>{const qm=r.pick([1,2,5]),B=r.pick([0.1,0.2,0.5]),rcm=r.pick([10,20,5]);
  const v=round6(qm*1e8*B*(rcm/100)/1e6);if(!Number.isInteger(v))throw 0;chk(approx(v*1e6,qm*1e8*B*rcm/100),'lv');
  return{content:`Заряженная частица движется по окружности радиусом $${rcm}$ см в однородном магнитном поле индукцией $${fmtNum(B)}$ Тл. Удельный заряд частицы $q/m=${qm}\\cdot10^{8}$ Кл/кг. Найдите скорость частицы (в $10^6$ м/с).`,solution:`Радиус $r=\\dfrac{mv}{qB}$, откуда $v=\\dfrac{q}{m}Br=${qm}\\cdot10^{8}\\cdot${fmtNum(B)}\\cdot${fmtNum(rcm/100)}=${v}\\cdot10^{6}$ м/с.`,explanation:`Из $r=\\frac{mv}{qB}$: $v=\\frac{q}{m}Br$.`,answer:v,dis:[v*2,Math.max(1,Math.round(v/2)),v+2]};});
def('mCrossed',3,'B','Скрещённые поля (скорость без отклонения)',r=>{const t=r.pick([[1000,0.1,10000],[2000,0.1,20000],[500,0.1,5000],[1000,0.2,5000],[600,0.2,3000]]);
  const v=t[0]/t[1];chk(v===t[2],'cf2');
  return{content:`Заряженная частица движется без отклонения в скрещённых электрическом ($E=${t[0]}$ В/м) и магнитном ($B=${fmtNum(t[1])}$ Тл) полях. Найдите скорость частицы (в м/с).`,solution:`Условие отсутствия отклонения: $qE=qvB$, откуда $v=\\dfrac{E}{B}=\\dfrac{${t[0]}}{${fmtNum(t[1])}}=${v}$ м/с.`,explanation:`Силы уравновешены: $v=E/B$.`,answer:v,dis:[t[0]*t[1],t[0],Math.round(v/2)]};});
def('mTorque',3,'B','Вращающий момент рамки с током',r=>{const N=r.pick([100,50,200,10]),B=r.pick([0.5,0.2,1]),I=r.int(1,5),S=r.pick([0.04,0.02,0.05,0.01]);
  const M=round6(N*B*I*S);if(!Number.isInteger(M))throw 0;chk(approx(M,N*B*I*S),'tq');
  return{content:`Прямоугольная рамка из $${N}$ витков площадью $${fmtNum(S)}$ м² с током $${I}$ А находится в поле $${fmtNum(B)}$ Тл. Найдите максимальный вращающий момент (в Н·м).`,solution:`$M=NBIS=${N}\\cdot${fmtNum(B)}\\cdot${I}\\cdot${fmtNum(S)}=${M}$ Н·м.`,explanation:`Максимальный момент $M=NBIS$.`,answer:M,dis:[round6(B*I*S),round6(N*B*I),M*2]};});
def('mPeriodRatio',4,'B','Отношение периодов в магнитном поле',r=>{const t=r.pick([[2,'α-частицы','протона',2]]);chk(t[3]===2,'pr2');
  return{content:`Протон и α-частица влетают в одно и то же магнитное поле перпендикулярно линиям индукции. Во сколько раз период обращения α-частицы больше периода протона? (масса α-частицы в $4$ раза, заряд в $2$ раза больше, чем у протона).`,solution:`$T=\\dfrac{2\\pi m}{qB}$, значит $\\dfrac{T_\\alpha}{T_p}=\\dfrac{m_\\alpha/q_\\alpha}{m_p/q_p}=\\dfrac{4/2}{1/1}=2$.`,explanation:`$T=\\frac{2\\pi m}{qB}$ зависит от отношения $m/q$: для α это $4/2=2$.`,answer:2,dis:[4,1,8]};});

/* ================= ОПТИКА ================= */
def('oLensPower',1,'AB','Оптическая сила линзы',r=>{const t=r.pick([[0.5,2],[0.25,4],[0.2,5],[0.1,10],[0.4,2.5],[0.05,20]]);const D=round6(1/t[0]);chk(approx(D,t[1]),'lp');
  return{content:`Фокусное расстояние линзы равно $${fmtNum(t[0]*100)}$ см. Найдите оптическую силу (в дптр).`,solution:`$D=\\dfrac{1}{F}=\\dfrac{1}{${fmtNum(t[0])}}=${fmtNum(t[1])}$ дптр (F в метрах).`,explanation:`Оптическая сила $D=1/F$, $F$ — в метрах.`,answer:t[1],dis:[round6(t[0]*100),round6(1/(t[0]*100)),round6(t[1]*2)]};});
def('oLensPowerInv',1,'AB','Фокусное расстояние по оптической силе',r=>{const t=r.pick([[2,50],[4,25],[5,20],[10,10],[2.5,40]]);const Fcm=round6(100/t[0]);chk(approx(Fcm,t[1]),'lpi');
  return{content:`Оптическая сила собирающей линзы $${fmtNum(t[0])}$ дптр. Найдите фокусное расстояние (в см).`,solution:`$F=\\dfrac{1}{D}=\\dfrac{1}{${fmtNum(t[0])}}=${fmtNum(round6(1/t[0]))}$ м $=${t[1]}$ см.`,explanation:`$F=1/D$ (в метрах), затем перевести в см.`,answer:t[1],dis:[round6(t[0]),round6(t[0]*10),t[1]+10]};});
def('oLensFormula',3,'B','Формула тонкой линзы',r=>{const t=r.pick([[30,20,60],[15,10,30],[60,20,30],[20,15,60],[12,8,24],[18,9,18],[40,24,60]]);
  const f=t[0]*t[1]/(t[0]-t[1]);chk(f===t[2]&&Number.isInteger(f),'lf');
  return{content:`Предмет находится на расстоянии $${t[0]}$ см от собирающей линзы с фокусным расстоянием $${t[1]}$ см. Найдите расстояние (в см) от линзы до изображения.`,solution:`$\\dfrac{1}{F}=\\dfrac{1}{d}+\\dfrac{1}{f}$, откуда $f=\\dfrac{dF}{d-F}=\\dfrac{${t[0]}\\cdot${t[1]}}{${t[0]}-${t[1]}}=${f}$ см.`,explanation:`Формула линзы $\\frac{1}{F}=\\frac{1}{d}+\\frac{1}{f}$.`,answer:f,dis:[t[0]+t[1],Math.round(t[0]*t[1]/(t[0]+t[1])),t[1]],svg:svgLens(t[0],t[2],t[1])};});
def('oMagnification',3,'B','Увеличение линзы',r=>{const t=r.pick([[30,20,60,2],[15,10,30,2],[20,15,60,3],[12,8,24,2],[40,24,60,1.5]]);
  const f=t[0]*t[1]/(t[0]-t[1]);const G=round6(f/t[0]);chk(approx(G,t[3]),'mg');
  return{content:`Предмет на расстоянии $${t[0]}$ см от собирающей линзы с фокусом $${t[1]}$ см. Найдите линейное увеличение.`,solution:`Изображение на расстоянии $f=\\dfrac{dF}{d-F}=${f}$ см. Увеличение $\\Gamma=\\dfrac{f}{d}=\\dfrac{${f}}{${t[0]}}=${fmtNum(t[3])}$.`,explanation:`$\\Gamma=f/d$.`,answer:G,dis:[round6(t[0]/f),round6(G*2),round6(t[1]/t[0])],svg:svgLens(t[0],round6(f),t[1])};});
def('oRefractN',3,'A','Показатель преломления по углу ПВО',r=>{const t=r.pick([[30,2],[37,1.667],[53,1.25],[45,1.414]]);const n=round6(1/Math.sin(t[0]*Math.PI/180));chk(approx(n,t[1],0.01),'rn');
  return{content:`Предельный угол полного внутреннего отражения на границе стекло–воздух равен $${t[0]}°$ ($\\sin${t[0]}°≈${fmtNum(round6(Math.sin(t[0]*Math.PI/180)))}$). Найдите показатель преломления стекла.`,solution:`$\\sin\\alpha_{пр}=\\dfrac{1}{n}$, откуда $n=\\dfrac{1}{\\sin${t[0]}°}=${fmtNum(t[1])}$.`,explanation:`При полном внутреннем отражении $\\sin\\alpha_{пр}=1/n$.`,answer:t[1],dis:[round6(Math.sin(t[0]*Math.PI/180)),round6(t[1]*1.5),round6(2*t[1])]};});
def('oTIR',2,'AB','Предельный угол по показателю преломления',r=>{const t=r.pick([[2,30],[1.414,45]]);const sc=round6(Math.asin(1/t[0])*180/Math.PI);chk(approx(sc,t[1],0.5),'tir');
  return{content:`Показатель преломления стекла равен $${fmtNum(t[0])}$. Найдите предельный угол полного внутреннего отражения (в градусах).`,solution:`$\\sin\\alpha_{пр}=\\dfrac{1}{n}=\\dfrac{1}{${fmtNum(t[0])}}$, откуда $\\alpha_{пр}=${t[1]}°$.`,explanation:`$\\sin\\alpha_{пр}=1/n$.`,answer:t[1],dis:[Math.round(t[1]*2),Math.round(90-t[1]),60]};});
def('oFreqWave',2,'AB','Частота электромагнитной волны',r=>{const t=r.pick([[600,5],[500,6],[750,4],[300,10],[1000,3]]);const nu=round6(3e8/(t[0]*1e-9)/1e14);chk(approx(nu,t[1],0.01),'fw');
  return{content:`Длина волны света равна $${t[0]}$ нм. Найдите частоту (в $10^{14}$ Гц). Скорость света $c=3\\cdot10^8$ м/с.`,solution:`$\\nu=\\dfrac{c}{\\lambda}=\\dfrac{3\\cdot10^8}{${t[0]}\\cdot10^{-9}}=${t[1]}\\cdot10^{14}$ Гц.`,explanation:`$\\nu=c/\\lambda$.`,answer:t[1],dis:[round6(t[0]/100),round6(t[1]*2),Math.round(t[0]/2)]};});
def('oGratingPeriod',2,'AB','Период дифракционной решётки',r=>{const N=r.pick([500,200,100,250,1000]);const d=round6(1e6/N);chk(approx(d,1e6/N)&&Number.isInteger(d),'gp');
  return{content:`Дифракционная решётка имеет $${N}$ штрихов на $1$ мм. Найдите период решётки (в нм).`,solution:`$d=\\dfrac{1}{N}=\\dfrac{1}{${N}}$ мм $=\\dfrac{10^6}{${N}}$ нм $=${d}$ нм.`,explanation:`Период $d=1/N$ (на единицу длины).`,answer:d,dis:[N,round6(d/2),round6(d*2)]};});
def('oGratingAngle',3,'A','Угол дифракционного максимума',r=>{const cfg=r.pick([[2000,500,2],[4000,2000,1],[2000,1000,1],[3000,1500,1]]);
  const sinT=cfg[2]*cfg[1]/cfg[0];const ang=round6(Math.asin(sinT)*180/Math.PI);chk(approx(ang,30,0.5),'ga');
  return{content:`На дифракционную решётку с периодом $${cfg[0]}$ нм нормально падает свет с длиной волны $${cfg[1]}$ нм. Под каким углом (в градусах) наблюдается максимум $${cfg[2]}$-го порядка? ($\\sin${30}°=0{,}5$)`,solution:`$d\\sin\\varphi=k\\lambda$, откуда $\\sin\\varphi=\\dfrac{k\\lambda}{d}=\\dfrac{${cfg[2]}\\cdot${cfg[1]}}{${cfg[0]}}=0{,}5$, значит $\\varphi=30°$.`,explanation:`Условие максимума $d\\sin\\varphi=k\\lambda$.`,answer:30,dis:[60,45,15]};});
def('oYoung',3,'A','Ширина интерференционной полосы',r=>{const t=r.pick([[600,2,1,1.2],[500,2,1,1],[500,4,1,2],[600,1,1,0.6],[400,2,1,0.8]]);
  const dx=round6(t[0]*1e-9*t[1]/(t[2]*1e-3)*1000);chk(approx(dx,t[3],0.001),'yng');
  return{content:`В опыте Юнга расстояние между щелями $${t[2]}$ мм, экран удалён на $${t[1]}$ м, длина волны $${t[0]}$ нм. Найдите расстояние (в мм) между соседними интерференционными полосами.`,solution:`$\\Delta x=\\dfrac{\\lambda L}{d}=\\dfrac{${t[0]}\\cdot10^{-9}\\cdot${t[1]}}{${t[2]}\\cdot10^{-3}}=${fmtNum(t[3])}$ мм.`,explanation:`Ширина полосы $\\Delta x=\\lambda L/d$.`,answer:t[3],dis:[round6(t[3]*2),round6(t[3]/2),round6(t[3]+1)]};});

/* ================= ЯДЕРНАЯ И КВАНТОВАЯ ФИЗИКА ================= */
def('nHalfFraction',1,'AB','Период полураспада: число периодов',r=>{const k=r.int(2,5);const frac=Math.pow(2,k);const T=r.pick([2,3,4,5,8,10]);const t=k*T;chk(Math.pow(2,k)===frac,'hf');
  return{content:`Период полураспада изотопа равен $${T}$ сут. Через сколько суток останется $1/${frac}$ часть начального количества?`,solution:`$\\dfrac{1}{${frac}}=\\left(\\dfrac12\\right)^{${k}}$, значит прошло $${k}$ периода$${k>4?'':'(ов)'}$: $t=${k}\\cdot${T}=${t}$ сут.`,explanation:`$1/2^k$ остаётся через $k$ периодов полураспада: $t=kT$.`,answer:t,dis:[T,frac,k]};});
def('nHalfMass',2,'AB','Период полураспада: оставшаяся масса',r=>{const k=r.int(2,4);const T=r.pick([8,10,5,2,3]);const t=k*T;const m0=r.pick([320,160,640,800,80])*1;const m=m0/Math.pow(2,k);if(!Number.isInteger(m))throw 0;chk(m*Math.pow(2,k)===m0,'hm');
  return{content:`Начальная масса радиоактивного изотопа $${m0}$ мг, период полураспада $${T}$ сут. Какая масса (в мг) останется через $${t}$ сут?`,solution:`Прошло $${k}$ периода$${k>4?'':'(ов)'}$: $m=\\dfrac{m_0}{2^{${k}}}=\\dfrac{${m0}}{${Math.pow(2,k)}}=${m}$ мг.`,explanation:`$m=m_0/2^{t/T}$.`,answer:m,dis:[m0-m,Math.round(m0/k),m*2]};});
def('nHalfFind',2,'AB','Нахождение периода полураспада',r=>{const k=r.int(2,4);const T=r.pick([5,10,8,15,20]);const t=k*T;const times=Math.pow(2,k);chk(t/k===T,'hfd');
  return{content:`За $${t}$ мин число радиоактивных ядер уменьшилось в $${times}$ раз${times>4?'':'а'}. Найдите период полураспада (в минутах).`,solution:`$${times}=2^{${k}}$, значит прошло $${k}$ периода$${k>4?'':'(ов)'}$. $T=\\dfrac{${t}}{${k}}=${T}$ мин.`,explanation:`Если число уменьшилось в $2^k$ раз, то прошло $k$ периодов: $T=t/k$.`,answer:T,dis:[t,times,t-T]};});
def('nAlpha',2,'AB','Альфа-распад: массовое число',r=>{const A=r.pick([238,234,226,222,210]),Z=r.pick([92,90,88,86]);const A2=A-4,Z2=Z-2;chk(A2===A-4&&Z2===Z-2,'al');
  const ask=r.bool();
  return{content:`Ядро с массовым числом $${A}$ и зарядом $${Z}$ испытало α-распад. Найдите ${ask?'массовое число':'заряд'} образовавшегося ядра.`,solution:`При α-распаде вылетает ядро гелия $^4_2He$: массовое число уменьшается на $4$, заряд — на $2$. Новое: $A=${A2}$, $Z=${Z2}$.`,explanation:`α-распад: $A\\to A-4$, $Z\\to Z-2$.`,answer:ask?A2:Z2,dis:ask?[A-2,A,A-4-1]:[Z-1,Z,Z-2-1]};});
def('nBeta',2,'AB','Бета-распад: заряд ядра',r=>{const A=r.pick([90,14,234,210,40]),Z=r.pick([38,6,90,82,19]);const Z2=Z+1;chk(Z2===Z+1,'bt2');
  return{content:`Ядро с массовым числом $${A}$ и зарядом $${Z}$ испытало β⁻-распад. Найдите заряд образовавшегося ядра.`,solution:`При β⁻-распаде нейтрон превращается в протон: массовое число не меняется, заряд увеличивается на $1$. Новый заряд $Z=${Z2}$.`,explanation:`β⁻-распад: $A$ не меняется, $Z\\to Z+1$.`,answer:Z2,dis:[Z-1,Z,A]};});
def('nPhotoEnergy',3,'B','Фотоэффект: энергия фотоэлектронов',r=>{const t=r.pick([[620,1,1],[310,2,2],[248,3,2],[413,1,2],[620,1,1],[310,1,3]]);
  const E=round6(1240/t[0]);const Ek=round6(E-t[1]);chk(approx(Ek,t[2],0.05)&&Ek>0,'pe2');
  return{content:`Металл с работой выхода $${t[1]}$ эВ освещают светом длиной волны $${t[0]}$ нм. Найдите максимальную кинетическую энергию фотоэлектронов (в эВ). Примите $hc=1240$ эВ·нм.`,solution:`Энергия фотона $E=\\dfrac{hc}{\\lambda}=\\dfrac{1240}{${t[0]}}=${fmtNum(E)}$ эВ. По уравнению Эйнштейна $E_к=E-A=${fmtNum(E)}-${t[1]}=${t[2]}$ эВ.`,explanation:`Уравнение Эйнштейна $E_к=\\frac{hc}{\\lambda}-A_{вых}$.`,answer:t[2],dis:[Math.round(E),t[1],t[2]+1]};});
def('nRedBoundary',2,'AB','Красная граница фотоэффекта',r=>{const t=r.pick([[620,2],[310,4],[248,5],[413,3],[1240,1]]);const A=round6(1240/t[0]);chk(approx(A,t[1],0.05),'rb');
  return{content:`Красная граница фотоэффекта для металла равна $${t[0]}$ нм. Найдите работу выхода (в эВ). $hc=1240$ эВ·нм.`,solution:`$A_{вых}=\\dfrac{hc}{\\lambda_0}=\\dfrac{1240}{${t[0]}}=${t[1]}$ эВ.`,explanation:`Работа выхода $A=hc/\\lambda_0$.`,answer:t[1],dis:[round6(t[0]/100),t[1]+1,Math.round(t[0]/200)]};});
def('nPhotonE',2,'AB','Энергия фотона (в эВ)',r=>{const t=r.pick([[620,2],[413,3],[310,4],[248,5],[1240,1],[206,6]]);const E=round6(1240/t[0]);chk(approx(E,t[1],0.05),'pne');
  return{content:`Найдите энергию фотона (в эВ) с длиной волны $${t[0]}$ нм. $hc=1240$ эВ·нм.`,solution:`$E=\\dfrac{hc}{\\lambda}=\\dfrac{1240}{${t[0]}}=${t[1]}$ эВ.`,explanation:`$E=hc/\\lambda$.`,answer:t[1],dis:[round6(t[0]/100),t[1]+1,Math.round(t[0]/200)]};});
def('nBohr',3,'A','Энергия перехода в атоме водорода',r=>{const t=r.pick([[2,1,10.2],[3,1,12.09],[3,2,1.89],[4,2,2.55],[4,1,12.75]]);
  const E=round6(13.6*(1/(t[1]*t[1])-1/(t[0]*t[0])));chk(approx(E,t[2],0.02),'bohr');
  return{content:`В атоме водорода электрон переходит с уровня $n=${t[0]}$ на уровень $n=${t[1]}$. Найдите энергию излучённого фотона (в эВ). Энергия уровня $E_n=-\\dfrac{13{,}6}{n^2}$ эВ.`,solution:`$E=13{,}6\\left(\\dfrac{1}{${t[1]}^2}-\\dfrac{1}{${t[0]}^2}\\right)=${fmtNum(t[2])}$ эВ.`,explanation:`$E=E_{n_2}-E_{n_1}=13{,}6\\left(\\frac{1}{n_1^2}-\\frac{1}{n_2^2}\\right)$.`,answer:t[2],dis:[round6(13.6/t[0]/t[0]),13.6,round6(t[2]+1)]};});
def('nMassEnergy',3,'A','Дефект масс и энергия связи',r=>{const dm=r.pick([0.02,0.03,0.1,0.2,0.5]);const E=round6(dm*931.5);chk(approx(E,dm*931.5),'me');
  return{content:`Дефект массы ядра равен $${fmtNum(dm)}$ а.е.м. Найдите энергию связи (в МэВ). $1$ а.е.м. $=931{,}5$ МэВ.`,solution:`$E_{св}=\\Delta m\\cdot931{,}5=${fmtNum(dm)}\\cdot931{,}5=${fmtNum(E)}$ МэВ.`,explanation:`$E_{св}=\\Delta m\\cdot c^2$, где $1$ а.е.м. эквивалентна $931{,}5$ МэВ.`,answer:E,dis:[round6(dm*931.5/2),round6(dm*100),round6(dm*931.5*2)]};});

/* ================= КОЛЕБАНИЯ ================= */
def('oscPeriodFreq',1,'AB','Период и частота колебаний',r=>{const nu=r.pick([2,4,5,10,20,25,50]);const T=round6(1/nu);const inv=r.bool();chk(approx(1/nu,T),'pf');
  return inv?{content:`Частота колебаний равна $${nu}$ Гц. Найдите период (в мс).`,solution:`$T=\\dfrac{1}{\\nu}=\\dfrac{1}{${nu}}$ с $=${round6(1000/nu)}$ мс.`,explanation:`$T=1/\\nu$.`,answer:round6(1000/nu),dis:[nu,round6(1000/nu/2),nu*2]}
  :{content:`Период колебаний равен $${round6(1000/nu)}$ мс. Найдите частоту (в Гц).`,solution:`$\\nu=\\dfrac{1}{T}=\\dfrac{1}{${round6(1/nu)}}=${nu}$ Гц.`,explanation:`$\\nu=1/T$.`,answer:nu,dis:[round6(1000/nu),nu*2,Math.round(nu/2)]};});
def('oscPendulumScale',2,'AB','Период маятника при изменении длины',r=>{const n=r.pick([4,9,16,25]);const k=Math.sqrt(n);chk(k*k===n,'ps2');
  return{content:`Во сколько раз изменится период математического маятника, если его длину увеличить в $${n}$ раз?`,solution:`$T=2\\pi\\sqrt{\\dfrac{L}{g}}\\sim\\sqrt{L}$. При увеличении длины в $${n}$ раз период вырастет в $\\sqrt{${n}}=${k}$ раз${k>4?'':'а'}.`,explanation:`Период $\\sim\\sqrt{L}$: увеличение длины в $n$ раз даёт рост периода в $\\sqrt{n}$.`,answer:k,dis:[n,n*n,Math.round(n/2)]};});
def('oscSpringScale',2,'AB','Период пружинного маятника при изменении массы',r=>{const n=r.pick([4,9,16,25]);const k=Math.sqrt(n);chk(k*k===n,'ss2');
  return{content:`Во сколько раз изменится период пружинного маятника, если массу груза увеличить в $${n}$ раз?`,solution:`$T=2\\pi\\sqrt{\\dfrac{m}{k}}\\sim\\sqrt{m}$. При увеличении массы в $${n}$ раз период вырастет в $\\sqrt{${n}}=${k}$ раз${k>4?'':'а'}.`,explanation:`Период $\\sim\\sqrt{m}$.`,answer:k,dis:[n,n*n,Math.round(n/2)]};});
def('oscPendulumK',3,'B','Период математического маятника (kπ)',r=>{const t=r.pick([[10,2],[40,4],[90,6],[2.5,1],[160,8]]);chk(t[1]*t[1]===round6(4*t[0]/G_ACC),'pk');
  return{content:`Математический маятник длиной $${fmtNum(t[0])}$ м совершает малые колебания ($g=10$ м/с²). Период равен $k\\pi$ секунд. Найдите целое число $k$.`,solution:`$T=2\\pi\\sqrt{\\dfrac{L}{g}}=2\\pi\\sqrt{\\dfrac{${fmtNum(t[0])}}{10}}=2\\pi\\cdot${fmtNum(round6(Math.sqrt(t[0]/G_ACC)))}=${t[1]}\\pi$, значит $k=${t[1]}$.`,explanation:`$T=2\\pi\\sqrt{L/g}$; здесь $\\sqrt{L/g}$ — «красивое» число.`,answer:t[1],dis:[t[1]*2,Math.round(t[0]),t[1]+1]};});
def('oscMaxSpeed',3,'B','Максимальная скорость колебаний',r=>{const A=r.pick([0.05,0.1,0.2,0.04,0.5]),w=r.pick([10,20,4,5,2]);const v=round6(A*w);if(!Number.isInteger(v*100))throw 0;chk(approx(v,A*w),'ms2');
  return{content:`Тело колеблется по закону $x=${fmtNum(A)}\\sin(${w}t)$ (СИ). Найдите максимальную скорость (в м/с).`,solution:`Максимальная скорость $v_{max}=A\\omega=${fmtNum(A)}\\cdot${w}=${fmtNum(v)}$ м/с.`,explanation:`$v_{max}=A\\omega$, где $\\omega$ — коэффициент при $t$.`,answer:v,dis:[round6(A),w,round6(A*w*w)]};});
def('oscEqRead',2,'AB','Чтение уравнения колебаний',r=>{const A=r.pick([0.05,0.1,0.2,5,10]),T=r.pick([0.5,1,2,4]);const w=round6(2*Math.PI/T);const mode=r.pick(['T','nu']);
  const ans=mode==='T'?T:round6(1/T);chk(approx(2*Math.PI/T,w),'er');
  return{content:`Тело колеблется по закону $x=${fmtNum(A)}\\cos\\left(\\dfrac{2\\pi}{${fmtNum(T)}}t\\right)$ (СИ). Найдите ${mode==='T'?'период (в с)':'частоту (в Гц)'}.`,solution:`Коэффициент при $t$ равен $\\omega=\\dfrac{2\\pi}{T}$, значит период $T=${fmtNum(T)}$ с${mode==='nu'?`, частота $\\nu=1/T=${fmtNum(round6(1/T))}$ Гц`:''}.`,explanation:`В записи $x=A\\cos(\\omega t)$ период $T=2\\pi/\\omega$, частота $\\nu=1/T$.`,answer:ans,dis:[mode==='T'?round6(1/T):T,round6(A),w]};});
def('oscLC',3,'B','Колебательный контур: формула Томсона (kπ)',r=>{const t=r.pick([[0.1,10,2],[0.4,10,4],[0.1,40,4],[0.9,10,6],[0.025,10,1]]);
  const LC=t[0]*t[1]*1e-6;const k=round6(2*Math.sqrt(LC)/1e-3);chk(approx(k,t[2],0.01),'lc2');
  return{content:`Колебательный контур состоит из катушки $${fmtNum(t[0])}$ Гн и конденсатора $${t[1]}$ мкФ. Период собственных колебаний равен $k\\pi$ миллисекунд. Найдите целое число $k$.`,solution:`$T=2\\pi\\sqrt{LC}=2\\pi\\sqrt{${fmtNum(t[0])}\\cdot${t[1]}\\cdot10^{-6}}=${t[2]}\\pi\\cdot10^{-3}$ с $=${t[2]}\\pi$ мс, значит $k=${t[2]}$.`,explanation:`Формула Томсона $T=2\\pi\\sqrt{LC}$.`,answer:t[2],dis:[t[2]*2,t[1],t[2]+1]};});

/* ================= ДОПОЛНИТЕЛЬНЫЕ (моменты, потенциал, трансформатор) ================= */
def('dMoment',2,'AB','Правило моментов: сила',r=>{const t=r.pick([[20,3,2,30],[10,4,5,8],[30,2,3,20],[40,3,6,20],[12,5,4,15],[24,2,4,12]]);
  const F2=t[0]*t[1]/t[2];chk(F2===t[3]&&Number.isInteger(F2),'mom2');
  return{content:`Лёгкий рычаг в равновесии. Слева на плече $${t[1]}$ м приложена сила $${t[0]}$ Н, справа — на плече $${t[2]}$ м. Найдите силу справа (в Н).`,solution:`Правило моментов: $F_1 d_1=F_2 d_2$, откуда $F_2=\\dfrac{F_1 d_1}{d_2}=\\dfrac{${t[0]}\\cdot${t[1]}}{${t[2]}}=${F2}$ Н.`,explanation:`Условие равновесия рычага: $F_1 d_1=F_2 d_2$.`,answer:F2,dis:[t[0],t[0]*t[1],Math.round(t[0]*t[2]/t[1])]};});
def('dLever',3,'B','Правило моментов: плечо',r=>{const t=r.pick([[30,2,20,3],[8,5,10,4],[20,3,30,2],[15,4,12,5],[12,4,24,2]]);
  const d2=t[0]*t[1]/t[2];chk(d2===t[3]&&Number.isInteger(d2),'lev');
  return{content:`Рычаг в равновесии. Сила $${t[0]}$ Н действует на плече $${t[1]}$ м. На другом конце действует сила $${t[2]}$ Н. Найдите её плечо (в метрах).`,solution:`$F_1 d_1=F_2 d_2$, откуда $d_2=\\dfrac{F_1 d_1}{F_2}=\\dfrac{${t[0]}\\cdot${t[1]}}{${t[2]}}=${d2}$ м.`,explanation:`Из правила моментов $d_2=F_1 d_1/F_2$.`,answer:d2,dis:[t[1],t[0]*t[1],Math.round(t[2]*t[1]/t[0])]};});
def('ePotentialWork',2,'AB','Работа по перемещению заряда',r=>{const q=r.pick([2,4,5,10,3]),U=r.pick([10,20,50,100]);const A=q*U;chk(A===q*U,'pw2');
  return{content:`Заряд $${q}$ мкКл перемещается между точками с разностью потенциалов $${U}$ В. Найдите работу поля (в мкДж).`,solution:`$A=qU=${q}\\cdot${U}=${A}$ мкДж.`,explanation:`Работа поля $A=qU$.`,answer:A,dis:[q+U,Math.round(U/q),A*2]};});
def('eTransformer',2,'AB','Трансформатор',r=>{const t=r.pick([[2000,100,220,11],[200,1000,110,550],[1000,100,200,20],[500,2500,44,220],[1200,100,240,20]]);
  const U2=t[2]*t[1]/t[0];chk(U2===t[3]&&Number.isInteger(U2),'tf');
  return{content:`Первичная обмотка трансформатора имеет $${t[0]}$ витков, вторичная — $${t[1]}$. На первичную подано напряжение $${t[2]}$ В. Найдите напряжение (в В) на вторичной обмотке.`,solution:`$\\dfrac{U_1}{U_2}=\\dfrac{N_1}{N_2}$, откуда $U_2=U_1\\dfrac{N_2}{N_1}=${t[2]}\\cdot\\dfrac{${t[1]}}{${t[0]}}=${U2}$ В.`,explanation:`Коэффициент трансформации $U_1/U_2=N_1/N_2$.`,answer:U2,dis:[t[2],Math.round(t[2]*t[0]/t[1]),U2+t[2]]};});

// ---------- subtopic → generators matching (specific rules FIRST; topic name is part of hay) ----------
const REG=[
  // ЭЛЕКТРОДИНАМИКА (раньше общих «мощность/энергия», т.к. название темы = «электродинамика»)
  [/закон кулона|кулон/i,['eCoulomb']],
  [/электрическое поле|напряжённост|напряженност/i,['eFieldForce']],
  [/разность потенциал/i,['ePotentialWork','eFieldForce']],
  [/конденсатор|электроёмкост|электроемкост/i,['eCapacitorQ','eCapacitorE']],
  [/u\s*=\s*ir|сопротивлен|сила тока, напряж/i,['eOhm','eOhmR']],
  [/последовательн|параллельн/i,['eSeries','eSeriesU','eParallel']],
  [/эдс|полной цеп|полн.*цеп|ома для полн/i,['eEMF','eEMFvoltage']],
  [/джоул|ленц|мощност.*ток|работа и мощност/i,['eJoule','ePowerHeater']],
  [/электромагнитн.*индукц|фарад/i,['mEMFflux','mSelfInd','mFlux']],
  [/магнитн.*индукц|сила ампер|ампер/i,['mAmpere','mInduction','mFlux','mTorque']],
  [/лоренц/i,['mLorentzVel','mCrossed','mPeriodRatio']],
  [/генератор|трансформатор/i,['eTransformer','eOhm']],
  [/колебательн.*контур/i,['oscLC','oscPeriodFreq']],
  [/электромагнитн.*волн/i,['oFreqWave']],
  // ОПТИКА
  [/отражен.*преломлен|закон отражен|закон преломлен/i,['oRefractN','oTIR']],
  [/полное внутренн|внутренн.*отражен/i,['oRefractN','oTIR']],
  [/линз/i,['oLensPower','oLensPowerInv','oLensFormula','oMagnification']],
  [/оптическ.*прибор|лупа|микроскоп|телескоп|глаз/i,['oLensPower','oMagnification','oLensPowerInv']],
  [/интерференц|дифракц|дисперс/i,['oGratingPeriod','oGratingAngle','oYoung','oFreqWave']],
  // КВАНТОВАЯ / ЯДЕРНАЯ (специфичные раньше; в названии темы есть «ядерная»)
  [/фотоэффект|эйнштейн/i,['nPhotoEnergy','nRedBoundary']],
  [/фотон/i,['nPhotonE','nPhotoEnergy']],
  [/строение атом|постулат/i,['nBohr','nPhotonE']],
  [/полураспад|радиоактивн.*распад|закон радиоактивн/i,['nHalfFraction','nHalfMass','nHalfFind']],
  [/радиоактивност|излучен|α|β|γ|альфа|бета|гамма/i,['nAlpha','nBeta']],
  [/ядерн.*реакц|энергия связ|дефект масс/i,['nMassEnergy','nBohr']],
  // МКТ / ТЕРМОДИНАМИКА (КПД-Карно раньше общей «КПД»)
  [/кпд тепл|карно|цикл карно/i,['tEffEngine','tCarnot','tHeatToWork']],
  [/авогадро|мкт|число авогадро|размеры молекул/i,['tAmount']],
  [/менделеев|клапейрон|идеальн.*газ/i,['tIsobaric','tIsochoric','tIsothermal','tAmount']],
  [/изотермическ/i,['tIsothermal']],
  [/изобарн/i,['tIsobaric','tWorkIsobaric']],
  [/изохорн/i,['tIsochoric']],
  [/внутренн.*энерг|количество теплот/i,['tHeatWarm','tHeatVapor']],
  [/насыщенн|ненасыщенн/i,['tHumidity']],
  [/влажност/i,['tHumidity']],
  [/кристаллическ|аморфн/i,['tHeatWarm']],
  [/первый закон термодинам|закон термодинам|термодинам/i,['tWorkIsobaric','tHeatToWork','tHeatWarm']],
  // ГИДРОСТАТИКА (подтемы темы «механика»)
  [/гидростатич/i,['hPressureDepth','hTwoLiquids','hDepth','hBarometer']],
  [/архимед|плаван/i,['hArchimedes','hFloatDensity','hIceberg']],
  [/паскал|давление/i,['hHydraulic','hPressureDepth','hTwoLiquids']],
  // ДИНАМИКА
  [/второй закон ньютон|f\s*=\s*ma/i,['dN2Accel','dN2Force','dN2Mass','dTraction','dTwoBodies','dIncline']],
  [/третий закон ньютон/i,['dN2Force','dN2Mass','dCentripForce']],
  [/первый закон ньютон|инерц/i,['kUniformDist','kUniformSpeed','kVelAfter']],
  [/всемирн.*тяготен|тяготен/i,['dGravityHeight','dGravityMoon']],
  [/невесомост|перегрузк|вес тел/i,['dWeightUp','dWeightDown']],
  [/упругост|гук/i,['dHookeForce','dHookeK']],
  [/трени/i,['dFricForce','dFricCoef','dTraction','dInclineComp','dIncline']],
  [/центростремительн/i,['dCentripForce','dBridgeConvex','dBridgeConcave','dLoopTop','kCircleAccel']],
  [/момент сил|правило момент|равновес/i,['dMoment','dLever']],
  // ЗАКОНЫ СОХРАНЕНИЯ
  [/сохранения импульс|импульс/i,['cMomentum','cMomentumKmh','cInelastic','cCatchUp','cExplosion']],
  [/упруг.*неупруг|неупруг|удар/i,['cInelastic','cCatchUp','cExplosion']],
  [/кинетическ|потенциальн.*энерг/i,['cKinetic','cPotential','cSpringE','cBulletE']],
  [/сохранения механическ|механическ.*энерг/i,['cEnergyFall','cInclineFricE','cPendulumT','cKinetic','cPotential']],
  [/работа сил|мощност|кпд/i,['cPower','cPowerFv','cEfficiency','cWorkGravity']],
  // КИНЕМАТИКА
  [/равномерн.*прямолинейн|равномерное прямолин/i,['kUniformDist','kUniformTime','kUniformSpeed','kAvgHalfDist','kAvgHalfTime']],
  [/равноускорен/i,['kAccel','kVelAfter','kDistAccel','kBraking','kEquationMotion','kGraphVTaccel','kGraphVTdist']],
  [/свободн.*паден/i,['kFreeFallTime','kFreeFallVel','kVertUp','kVertUpTime']],
  [/брошенн.*горизонт|горизонт/i,['kHorizRange','kHorizVel']],
  [/окружност/i,['kCircleAccel','dCentripForce']],
  [/колебан|маятник|гармоническ/i,['oscPeriodFreq','oscPendulumScale','oscSpringScale','oscMaxSpeed','oscEqRead','oscPendulumK']],
];

function pickGens(name, topicName){
  const hay=((name||'')+' '+(topicName||'')).toLowerCase();
  const found=REG.find(([re])=>re.test(hay));
  return found ? found[1].map(k=>({key:k,...G[k]})).filter(g=>g.fn) : null;
}

function buildQuestion(extId, st, topic, subjectId, slot, genMeta){
  const rng=makeRng(extId+':'+slot);
  let q; try{ q=genMeta.fn(rng); }catch(e){ if(e instanceof Error&&String(e.message).startsWith('verify-fail')) throw e; return null; }
  if(!q) return null;
  q.content=(q.content||'').replace(/ {2,}/g,' ').trim();
  q.solution=(q.solution||'').replace(/ {2,}/g,' ').trim();
  q.explanation=(q.explanation||'').replace(/ {2,}/g,' ').trim();

  let type,part,options,correctAnswer,difficulty;
  const ans=q.answer;
  let easyChoice=false;
  if(q.options){
    type='SINGLE_CHOICE'; part='A'; options=q.options; correctAnswer=q.correctAnswer; difficulty=Math.min(genMeta.lvl,2);
  } else {
    const wantChoice = genMeta.kind==='A' || !Number.isInteger(ans) || (genMeta.kind!=='B' && genMeta.lvl<=2 && (slot%5)<2);
    if(wantChoice){
      const c=realChoice(rng,ans,q.dis); type='SINGLE_CHOICE'; part='A'; options=c.options; correctAnswer=c.correctAnswer;
      easyChoice = Number.isInteger(ans) && genMeta.kind!=='A' && genMeta.lvl<=2;
      difficulty = easyChoice ? Math.min(genMeta.lvl,2) : Math.min(5,Math.max(1,genMeta.lvl));
    } else {
      type='TEXT_INPUT'; part='B'; options=null; correctAnswer=String(ans); difficulty=Math.min(5,Math.max(2,genMeta.lvl));
    }
  }
  if(type==='SINGLE_CHOICE'){ const ids=options.map(o=>o.id); if(new Set(ids).size!==options.length || !ids.includes(correctAnswer)) return null; }
  const hasVisual=!!q.svg;
  const visualType=hasVisual?(q.svg.includes('polyline')&&q.svg.includes('v, м/с')?'graph':(q.svg.includes('линза')?'optics':(q.svg.includes('мост')?'diagram':(q.svg.includes('α=')?'force-diagram':'circuit')))):null;
  const baseTags=st.name.toLowerCase().split(/[\s.,()]+/).filter(w=>w.length>4).slice(0,2);
  const tags=[...new Set([...baseTags,'цт','физика',genMeta.key,...(hasVisual?['рисунок']:[])])];
  return {
    externalId:extId, subjectId, topicId:topic.id, subtopicId:st.id,
    type, part, difficulty, content:q.content,
    options: options?JSON.stringify(options):null,
    correctAnswer, explanation:q.explanation, solution:q.solution||null,
    hints:JSON.stringify({small:[(q.explanation||'')],detailed:q.solution?[q.solution]:[],stepby:[]}),
    imageUrl: hasVisual ? makeSvgDataUrl(q.svg) : null,
    tags:JSON.stringify(tags), year:2027, source:'Сборник заданий (заданияпофизике.md)', status:'ACTIVE',
    timesSolved:0, timesCorrect:0,
    _meta:{ title:genMeta.title, variantGroup:genMeta.key, hasVisual, visualType },
  };
}

function runSelfTest(){
  let total=0,bugs=0,skips=0,nonIntB=0,badChoice=0,withSvg=0;const perGen={};
  for(const key of Object.keys(G)){
    const meta=G[key];let ok=0,bug=0,skip=0;
    for(let s=0;s<300;s++){
      const rng=makeRng('ST-'+key+'-'+s);let q;
      try{ q=meta.fn(rng); }
      catch(e){ if(e instanceof Error && String(e.message).startsWith('verify-fail')){bug++;bugs++;if(bug<=2)console.log('  BUG',key,'→',e.message);} else {skip++;skips++;} continue; }
      if(!q){skip++;continue;}
      total++;ok++;
      if(q.svg) withSvg++;
      if(q.options){ if(q.options.length!==5 || !q.options.some(o=>o.id===q.correctAnswer)){badChoice++;if(badChoice<=3)console.log('  BADCHOICE',key);} }
      else { if(typeof q.answer!=='number'||!isFinite(q.answer)){nonIntB++;if(nonIntB<=4)console.log('  BADANS',key,'→',q.answer);} }
      if(/undefined|NaN|null/.test(String(q.content)+q.solution+q.explanation)){badChoice++;if(badChoice<=6)console.log('  BADTEXT',key);}
      if(q.svg && (/undefined|NaN/.test(q.svg))){badChoice++;console.log('  BADSVG',key);}
    }
    perGen[key]={ok,bug,skip};
  }
  console.log('— SELFTEST —  generators:',Object.keys(G).length,'| ok samples:',total,'| with SVG:',withSvg,'| verify BUGS:',bugs,'| skips:',skips,'| badAns:',nonIntB,'| badChoice/Text:',badChoice);
  const problem=Object.entries(perGen).filter(([,v])=>v.bug>0||v.skip>250);
  if(problem.length) console.log('  high-skip/bug:', problem.map(([k,v])=>`${k}(bug${v.bug},skip${v.skip})`).join(', '));
  console.log(bugs===0&&nonIntB===0&&badChoice===0 ? '✅ SELFTEST PASSED' : '❌ SELFTEST FOUND ISSUES');
}

async function main(){
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try{
    const subject=await prisma.subject.findFirst({where:{slug:'physics'}});
    if(!subject){ console.error('Physics subject not found'); return; }
    const topics=await prisma.topic.findMany({where:{subjectId:subject.id}});
    const topicById=new Map(topics.map(t=>[t.id,t]));
    const subtopics=await prisma.subtopic.findMany({where:{topicId:{in:topics.map(t=>t.id)}}});

    const existingExt=new Set((await prisma.question.findMany({where:{externalId:{startsWith:'MDP-'}},select:{externalId:true}})).map(e=>e.externalId));
    const normC=(s)=>(s||'').replace(/\s+/g,' ').trim().toLowerCase();
    const seen=new Set((await prisma.question.findMany({where:{subjectId:subject.id},select:{content:true}})).map(q=>normC(q.content)));

    let matched=0, skipped=0, created=0, visuals=0;
    const toCreate=[]; const byTopic={}; const byGen={};
    for(const st of subtopics){
      const topic=topicById.get(st.topicId);
      const gens=pickGens(st.name, topic?topic.name:'');
      if(!gens || gens.length===0){ skipped++; continue; }
      matched++;
      for(let i=0;i<PER;i++){
        const extId=`MDP-${st.id}-${i}`;
        if(existingExt.has(extId)) continue;
        const genMeta=gens[i%gens.length];
        let row=null; try{ row=buildQuestion(extId, st, topic, subject.id, i, genMeta); }catch(e){ console.log('verify-fail at',extId,genMeta.key); continue; }
        if(!row) continue;
        const dk=normC(row.content);
        if(seen.has(dk)) continue;
        seen.add(dk);
        toCreate.push(row);
        byTopic[topic?topic.name:'—']=(byTopic[topic?topic.name:'—']||0)+1;
        byGen[genMeta.key]=(byGen[genMeta.key]||0)+1;
        if(row._meta.hasVisual) visuals++;
        created++;
      }
    }

    if(INTROSPECT){
      console.log('— INTROSPECT —');
      console.log('Physics subtopics:',subtopics.length,'| matched:',matched,'| skipped:',skipped);
      console.log('Would generate:',created,'new questions (PER='+PER+'), with visuals:',visuals);
      console.log('By topic:',JSON.stringify(byTopic));
      console.log('Distinct generators used:',Object.keys(byGen).length,'of',Object.keys(G).length);
      const unused=Object.keys(G).filter(k=>!byGen[k]);
      if(unused.length) console.log('Unused generators:',unused.join(', '));
      return;
    }

    const ts=new Date().toISOString().replace(/[:.]/g,'-');
    const outDir=path.join(__dirname,'..','..','..','data');
    try{ fs.mkdirSync(outDir,{recursive:true}); }catch{}
    const outPath=path.join(outDir,`md-physics-${ts}.json`);
    fs.writeFileSync(outPath, JSON.stringify(toCreate.map(r=>({
      title:r._meta.title, subject:'physics',
      topic:(topicById.get(r.topicId)||{}).name||'', subtopic:r.subtopicId,
      difficulty:r.difficulty, part:r.part, type:r.type,
      question:r.content, hint:r.explanation, solution:r.solution, answer:r.correctAnswer,
      options:r.options?JSON.parse(r.options):null,
      tags:JSON.parse(r.tags), sourceTemplate:'заданияпофизике.md', variantGroup:r._meta.variantGroup,
      hasVisual:r._meta.hasVisual, visualType:r._meta.visualType, visualFile:r.imageUrl?'(inline data:URL in imageUrl)':null,
      externalId:r.externalId,
    })), null, 2));

    if(!DRY){
      let inserted=0;
      for(const data of toCreate){ const {_meta,...row}=data; try{ await prisma.question.create({data:row}); inserted++; }catch(e){ /* dup */ } }
      const qc=await prisma.question.count({where:{subjectId:subject.id,status:'ACTIVE'}});
      await prisma.subject.update({where:{id:subject.id},data:{questionsCount:qc}});
      console.log('Inserted:',inserted,'| with visuals:',visuals,'| Physics active questions now:',qc);
    } else {
      console.log('[DRY] no DB writes. visuals:',visuals);
    }
    console.log(`✅ matched: ${matched} | skipped: ${skipped} | generated: ${created} | generators used: ${Object.keys(byGen).length}/${Object.keys(G).length}`);
    console.log('JSON export:', path.relative(path.join(__dirname,'..','..','..'), outPath));
  } finally { await prisma.$disconnect(); }
}

async function runAudit(){
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const R=async(fn,n=6)=>{let e;for(let i=0;i<n;i++){try{return await fn();}catch(x){e=x;await new Promise(r=>setTimeout(r,(i+1)*5000));}}throw e;};
  try{
    const phys=await R(()=>prisma.subject.findFirst({where:{slug:'physics'}}));
    const MDP={externalId:{startsWith:'MDP-'}};
    const total=await R(()=>prisma.question.count({where:MDP}));
    const wrongSubject=await R(()=>prisma.question.count({where:{...MDP,NOT:{subjectId:phys.id}}}));
    const notActive=await R(()=>prisma.question.count({where:{...MDP,NOT:{status:'ACTIVE'}}}));
    const withImg=await R(()=>prisma.question.count({where:{...MDP,NOT:{imageUrl:null}}}));
    const badImg=await R(()=>prisma.question.count({where:{...MDP,imageUrl:{not:null},NOT:{imageUrl:{startsWith:'data:image/svg+xml;base64,'}}}}));
    const badText=await R(()=>prisma.question.count({where:{...MDP,OR:[{content:{contains:'undefined'}},{content:{contains:'NaN'}}]}}));
    const emptyExpl=await R(()=>prisma.question.count({where:{...MDP,explanation:''}}));
    const partG=await R(()=>prisma.question.groupBy({by:['part'],where:MDP,_count:{_all:true}}));
    const lvlG=await R(()=>prisma.question.groupBy({by:['difficulty'],where:MDP,_count:{_all:true}}));
    const byPart=Object.fromEntries(partG.map(g=>[g.part,g._count._all]));
    const byLvl=Object.fromEntries(lvlG.map(g=>[g.difficulty,g._count._all]).sort((a,b)=>a[0]-b[0]));
    // light fetch: only choice options + answers (no imageUrl payloads), paginated
    let badChoice=0,badIntB=0,skip=0;
    while(true){
      const page=await R(()=>prisma.question.findMany({where:MDP,select:{type:true,part:true,options:true,correctAnswer:true},orderBy:{id:'asc'},skip,take:300}));
      if(!page.length) break; skip+=page.length;
      for(const q of page){
        if(q.type==='SINGLE_CHOICE'){ let o=[]; try{o=JSON.parse(q.options||'[]');}catch{} if(o.length!==5||!o.some(x=>x.id===q.correctAnswer)) badChoice++; }
        else if(q.part==='B' && !/^-?\d+$/.test(String(q.correctAnswer).trim())) badIntB++;
      }
    }
    console.log('— AUDIT (MDP- questions) —');
    console.log('total:',total,'| Part:',JSON.stringify(byPart),'| difficulty:',JSON.stringify(byLvl),'| withImage:',withImg);
    console.log('badChoice:',badChoice,'| nonIntPartB:',badIntB,'| wrongSubject:',wrongSubject,'| notActive:',notActive,'| emptyExpl:',emptyExpl,'| badText:',badText,'| badImg:',badImg);
    console.log(badChoice===0&&badIntB===0&&wrongSubject===0&&notActive===0&&badText===0&&badImg===0 ? '✅ AUDIT PASSED' : '❌ AUDIT ISSUES');
  } finally { await prisma.$disconnect(); }
}

if(SELFTEST){ runSelfTest(); }
else if(AUDIT){ runAudit().catch(e=>{console.error(e);process.exit(1);}); }
else { main().catch(e=>{console.error(e);process.exit(1);}); }








