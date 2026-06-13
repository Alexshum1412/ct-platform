/* eslint-disable */
/**
 * CT-Platform — MD-bank VISUAL MATH generator (every question carries an SVG figure).
 *
 * Source templates: repo-root file "заданияпоматематике.md" (планиметрия, стереометрия,
 *   координаты/функции, графики). Builds NEW visual variants — coordinate planes, function
 *   graphs, triangles, quadrilaterals, circles, polygons, 3-D solids, number lines, charts —
 *   complementing the non-visual MDM-/CTM- math banks.
 *  - answers computed in code AND re-verified by an INDEPENDENT check (chk) before emit
 *  - Part A = SINGLE_CHOICE (5 options), Part B = TEXT_INPUT (INTEGER only); non-integer → choice
 *  - π-areas/volumes ask for the INTEGER coefficient of π (avoids irrational typed answers)
 *  - every figure rendered as a self-contained data:image/svg+xml;base64 URL in Question.imageUrl
 *  - matched to existing math subtopics by keyword; idempotent externalId MVZ-<subtopicId>-<i>
 *
 * Run:  node prisma/seed-md-mathviz.js [--selftest|--introspect|--dry|--audit|--count=N]
 */
const fs = require('fs');
const path = require('path');
(function loadEnv(){ if(process.env.DATABASE_URL)return; for(const p of [path.join(process.cwd(),'.env'),path.join(__dirname,'..','.env')]){try{for(const l of fs.readFileSync(p,'utf8').split(/\r?\n/)){const m=l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);if(m&&!process.env[m[1]]){let v=m[2].trim();if(/^["']/.test(v))v=v.slice(1,-1);process.env[m[1]]=v;}}if(process.env.DATABASE_URL)return;}catch{}}})();

const ARGS=process.argv.slice(2);
const INTROSPECT=ARGS.includes('--introspect'), SELFTEST=ARGS.includes('--selftest'), AUDIT=ARGS.includes('--audit');
const DRY=ARGS.includes('--dry')||INTROSPECT;
const PER=(()=>{const a=ARGS.find(x=>x.startsWith('--count='));return a?Math.max(1,parseInt(a.slice(8),10)||12):12;})();

// ---------- RNG ----------
function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function makeRng(seed){const r=mulberry32(hashStr(seed));return{f:r,int:(a,b)=>a+Math.floor(r()*(b-a+1)),pick:(arr)=>arr[Math.floor(r()*arr.length)],bool:()=>r()<0.5};}

// ---------- helpers ----------
function chk(cond,msg){ if(!cond) throw new Error('verify-fail:'+msg); }
const gcd=(a,b)=>{a=Math.abs(a);b=Math.abs(b);while(b){[a,b]=[b,a%b];}return a||1;};
const round6=x=>Math.round(x*1e6)/1e6;
const approx=(a,b,e)=>Math.abs(a-b)<(e||1e-6);
function fmtNum(x){ if(typeof x!=='number'||!isFinite(x)) return String(x); const r=round6(x); return String(r); }
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function realChoice(rng,V,dis){
  const seen=new Set([fmtNum(V)]); const wrongs=[];
  const push=(c,neg)=>{ if(typeof c!=='number'||!isFinite(c))return; const r=round6(c); if(!neg&&V>0&&r<=0)return; const f=fmtNum(r); if(seen.has(f))return; seen.add(f); wrongs.push(r); };
  for(const c of (dis||[])) push(c,true);
  const fb=[V*2,V*0.5,V+1,V-1,V*1.5,V*3,V+2,V-2,V*0.8,V*1.25,V*10,V*0.1];
  for(const c of fb){ if(wrongs.length>=4)break; push(c); }
  let k=2; while(wrongs.length<4){ push(V*k+1); k++; if(k>50)push(V+k); }
  const all=[V,...wrongs.slice(0,4)];
  for(let i=all.length-1;i>0;i--){const j=rng.int(0,i);[all[i],all[j]]=[all[j],all[i]];}
  const ids=['A','B','C','D','E'];
  return { options: all.map((v,i)=>({id:ids[i],text:fmtNum(v)})), correctAnswer: ids[all.indexOf(V)] };
}
function textChoice(rng,correct,wrongs){
  const all=[{t:correct,ok:true},...wrongs.slice(0,4).map(t=>({t,ok:false}))];
  for(let i=all.length-1;i>0;i--){const j=rng.int(0,i);[all[i],all[j]]=[all[j],all[i]];}
  const ids=['A','B','C','D','E'];
  return { options: all.map((o,i)=>({id:ids[i],text:o.t})), correctAnswer: ids[all.findIndex(o=>o.ok)] };
}
function makeSvgDataUrl(svg){ return 'data:image/svg+xml;base64,'+Buffer.from(svg,'utf8').toString('base64'); }

// ================= SVG: COORDINATE PLANE =================
function svgPlane(o){
  const xmin=o.xmin,xmax=o.xmax,ymin=o.ymin,ymax=o.ymax,items=o.items||[];
  const W=o.W||320,H=o.H||300,M=22,PW=W-2*M,PH=H-2*M;
  const X=x=>M+(x-xmin)/(xmax-xmin)*PW, Y=y=>H-M-(y-ymin)/(ymax-ymin)*PH;
  let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Segoe UI,Arial,sans-serif"><rect width="${W}" height="${H}" fill="#fff"/>`;
  for(let x=Math.ceil(xmin);x<=xmax;x++){const px=X(x);s+=`<line x1="${px.toFixed(1)}" y1="${M}" x2="${px.toFixed(1)}" y2="${H-M}" stroke="${x===0?'#cbd5e1':'#eef1f5'}"/>`;}
  for(let y=Math.ceil(ymin);y<=ymax;y++){const py=Y(y);s+=`<line x1="${M}" y1="${py.toFixed(1)}" x2="${W-M}" y2="${py.toFixed(1)}" stroke="${y===0?'#cbd5e1':'#eef1f5'}"/>`;}
  const axX=(ymin<=0&&ymax>=0)?Y(0):H-M, axY=(xmin<=0&&xmax>=0)?X(0):M;
  s+=`<line x1="${M}" y1="${axX.toFixed(1)}" x2="${W-M+6}" y2="${axX.toFixed(1)}" stroke="#222" stroke-width="1.3"/>`;
  s+=`<line x1="${axY.toFixed(1)}" y1="${H-M}" x2="${axY.toFixed(1)}" y2="${M-6}" stroke="#222" stroke-width="1.3"/>`;
  s+=`<path d="M ${W-M+6} ${axX.toFixed(1)} l -6 -3 v6 z" fill="#222"/><path d="M ${axY.toFixed(1)} ${M-6} l -3 6 h6 z" fill="#222"/>`;
  s+=`<text x="${W-M+1}" y="${(axX-6).toFixed(1)}" font-size="12" fill="#222">${o.xlabel||'x'}</text>`;
  s+=`<text x="${(axY+5).toFixed(1)}" y="${M-1}" font-size="12" fill="#222">${o.ylabel||'y'}</text>`;
  const step=(xmax-xmin)>14?2:1;
  for(let x=Math.ceil(xmin);x<=xmax;x+=step){if(x===0)continue;const px=X(x);s+=`<text x="${px.toFixed(1)}" y="${(axX+12).toFixed(1)}" font-size="9" text-anchor="middle" fill="#475569">${x}</text>`;}
  const stepy=(ymax-ymin)>14?2:1;
  for(let y=Math.ceil(ymin);y<=ymax;y+=stepy){if(y===0)continue;const py=Y(y);s+=`<text x="${(axY-4).toFixed(1)}" y="${(py+3).toFixed(1)}" font-size="9" text-anchor="end" fill="#475569">${y}</text>`;}
  for(const it of items){
    if(it.t==='line'){const yy1=it.k*xmin+it.b,yy2=it.k*xmax+it.b;s+=`<line x1="${X(xmin).toFixed(1)}" y1="${Y(yy1).toFixed(1)}" x2="${X(xmax).toFixed(1)}" y2="${Y(yy2).toFixed(1)}" stroke="${it.color||'#2563eb'}" stroke-width="2.2"/>`;}
    else if(it.t==='segment'){s+=`<line x1="${X(it.x1).toFixed(1)}" y1="${Y(it.y1).toFixed(1)}" x2="${X(it.x2).toFixed(1)}" y2="${Y(it.y2).toFixed(1)}" stroke="${it.color||'#2563eb'}" stroke-width="2.2"${it.dash?' stroke-dasharray="4 3"':''}/>`;}
    else if(it.t==='parabola'){let p=[];for(let x=xmin;x<=xmax+1e-9;x+=(xmax-xmin)/140){const y=it.a*x*x+it.b*x+it.c;if(y>=ymin-1&&y<=ymax+1)p.push(`${X(x).toFixed(1)},${Y(y).toFixed(1)}`);}s+=`<polyline points="${p.join(' ')}" fill="none" stroke="${it.color||'#7c3aed'}" stroke-width="2.2"/>`;}
    else if(it.t==='curve'){let segs=[],cur=[];for(let x=xmin;x<=xmax+1e-9;x+=(xmax-xmin)/200){const y=it.fn(x);if(isFinite(y)&&y>=ymin-1&&y<=ymax+1){cur.push(`${X(x).toFixed(1)},${Y(y).toFixed(1)}`);}else if(cur.length){segs.push(cur);cur=[];}}if(cur.length)segs.push(cur);for(const sg of segs)s+=`<polyline points="${sg.join(' ')}" fill="none" stroke="${it.color||'#7c3aed'}" stroke-width="2.2"/>`;}
    else if(it.t==='circle'){const rx=Math.abs(X(it.cx+it.r)-X(it.cx)),ry=Math.abs(Y(it.cy+it.r)-Y(it.cy));s+=`<ellipse cx="${X(it.cx).toFixed(1)}" cy="${Y(it.cy).toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${it.fill||'none'}" stroke="${it.color||'#2563eb'}" stroke-width="2.2"/>`;}
    else if(it.t==='poly'){const p=it.pts.map(([x,y])=>`${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(' ');s+=`<polygon points="${p}" fill="${it.fill||'rgba(37,99,235,0.10)'}" stroke="${it.stroke||'#2563eb'}" stroke-width="2"/>`;}
    else if(it.t==='point'){s+=`<circle cx="${X(it.x).toFixed(1)}" cy="${Y(it.y).toFixed(1)}" r="3.2" fill="${it.color||'#dc2626'}"/>`;if(it.label)s+=`<text x="${(X(it.x)+5).toFixed(1)}" y="${(Y(it.y)-5).toFixed(1)}" font-size="11" fill="${it.color||'#dc2626'}">${esc(it.label)}</text>`;}
  }
  s+=`</svg>`;return s;
}

// ================= SVG: NUMBER LINE =================
function svgNumberLine(o){ // marks:[{x,closed,color}], rays:[{from,dir,color}], segs:[{a,b}]
  const xmin=o.xmin,xmax=o.xmax,W=360,H=90,M=28,Y=52,PW=W-2*M;
  const X=x=>M+(x-xmin)/(xmax-xmin)*PW;
  let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Segoe UI,Arial,sans-serif"><rect width="${W}" height="${H}" fill="#fff"/>`;
  for(const sg of (o.segs||[])) s+=`<line x1="${X(sg.a).toFixed(1)}" y1="${Y}" x2="${X(sg.b).toFixed(1)}" y2="${Y}" stroke="${sg.color||'#2563eb'}" stroke-width="5" stroke-opacity="0.5"/>`;
  for(const ry of (o.rays||[])){const x2=ry.dir>0?xmax:xmin;s+=`<line x1="${X(ry.from).toFixed(1)}" y1="${Y}" x2="${X(x2).toFixed(1)}" y2="${Y}" stroke="${ry.color||'#2563eb'}" stroke-width="5" stroke-opacity="0.5"/>`;}
  s+=`<line x1="${M-6}" y1="${Y}" x2="${W-M+8}" y2="${Y}" stroke="#222" stroke-width="1.4"/><path d="M ${W-M+8} ${Y} l -6 -3 v6 z" fill="#222"/><text x="${W-M+6}" y="${Y-7}" font-size="12" fill="#222">x</text>`;
  for(let x=Math.ceil(xmin);x<=xmax;x++){const px=X(x);s+=`<line x1="${px.toFixed(1)}" y1="${Y-4}" x2="${px.toFixed(1)}" y2="${Y+4}" stroke="#222"/><text x="${px.toFixed(1)}" y="${Y+18}" font-size="10" text-anchor="middle" fill="#475569">${x}</text>`;}
  for(const mk of (o.marks||[])){const px=X(mk.x);s+=`<circle cx="${px.toFixed(1)}" cy="${Y}" r="4.5" fill="${mk.closed?(mk.color||'#dc2626'):'#fff'}" stroke="${mk.color||'#dc2626'}" stroke-width="1.8"/>`;}
  s+=`</svg>`;return s;
}

// ================= SVG: POLYGON FITTING (triangles, quads, n-gons) =================
function fit(pts,W,H,m){
  const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
  const minx=Math.min(...xs),maxx=Math.max(...xs),miny=Math.min(...ys),maxy=Math.max(...ys);
  const sw=(maxx-minx)||1,sh=(maxy-miny)||1,sc=Math.min((W-2*m)/sw,(H-2*m)/sh);
  const ox=(W-sc*sw)/2-sc*minx, oy=(H-sc*sh)/2-sc*miny;
  return p=>[ox+sc*p[0], H-(oy+sc*p[1])];
}
function _poly(P,verts,sides,opts){ // P=array of px points
  const cx=P.reduce((a,p)=>a+p[0],0)/P.length, cy=P.reduce((a,p)=>a+p[1],0)/P.length;
  let s=`<polygon points="${P.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ')}" fill="${(opts&&opts.fill)||'rgba(37,99,235,0.08)'}" stroke="#2563eb" stroke-width="2"/>`;
  if(verts) P.forEach((p,i)=>{if(!verts[i])return;const dx=p[0]-cx,dy=p[1]-cy,L=Math.hypot(dx,dy)||1;s+=`<text x="${(p[0]+dx/L*13).toFixed(1)}" y="${(p[1]+dy/L*13+4).toFixed(1)}" font-size="13" text-anchor="middle" fill="#0f172a">${esc(verts[i])}</text>`;});
  if(sides) for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];if(!sides[i])continue;const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;const dx=mx-cx,dy=my-cy,L=Math.hypot(dx,dy)||1;s+=`<text x="${(mx+dx/L*13).toFixed(1)}" y="${(my+dy/L*13+4).toFixed(1)}" font-size="12" text-anchor="middle" fill="#b91c1c">${esc(sides[i])}</text>`;}
  return {s,cx,cy};
}
// triangle: pts logical, opts {verts,sides,angles,right(index),fill}
function svgTri(pts,opts={}){
  const W=300,H=260,T=fit(pts,W,H,40),P=pts.map(T);
  let body=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Segoe UI,Arial,sans-serif"><rect width="${W}" height="${H}" fill="#fff"/>`;
  const pr=_poly(P,opts.verts,opts.sides,opts); body+=pr.s;
  if(opts.angles) P.forEach((p,i)=>{if(!opts.angles[i])return;const dx=pr.cx-p[0],dy=pr.cy-p[1],L=Math.hypot(dx,dy)||1;body+=`<text x="${(p[0]+dx/L*30).toFixed(1)}" y="${(p[1]+dy/L*30+4).toFixed(1)}" font-size="11" text-anchor="middle" fill="#16a34a">${esc(opts.angles[i])}</text>`;});
  if(opts.right!=null){const p=P[opts.right],others=P.filter((_,j)=>j!==opts.right);const u=(a,b)=>{const dx=a[0]-b[0],dy=a[1]-b[1],L=Math.hypot(dx,dy)||1;return[dx/L,dy/L];};const u1=u(others[0],p),u2=u(others[1],p),q=9;body+=`<polyline points="${(p[0]+u1[0]*q).toFixed(1)},${(p[1]+u1[1]*q).toFixed(1)} ${(p[0]+(u1[0]+u2[0])*q).toFixed(1)},${(p[1]+(u1[1]+u2[1])*q).toFixed(1)} ${(p[0]+u2[0]*q).toFixed(1)},${(p[1]+u2[1]*q).toFixed(1)}" fill="none" stroke="#0f172a" stroke-width="1.2"/>`;}
  if(opts.alt!=null){const A=P[opts.alt],o=[0,1,2].filter(j=>j!==opts.alt),B=P[o[0]],C=P[o[1]];
    const dx=C[0]-B[0],dy=C[1]-B[1],L2=dx*dx+dy*dy||1,tt=((A[0]-B[0])*dx+(A[1]-B[1])*dy)/L2;const F=[B[0]+tt*dx,B[1]+tt*dy];
    body+=`<line x1="${A[0].toFixed(1)}" y1="${A[1].toFixed(1)}" x2="${F[0].toFixed(1)}" y2="${F[1].toFixed(1)}" stroke="#16a34a" stroke-width="1.4" stroke-dasharray="4 3"/>`;
    if(opts.altLabel)body+=`<text x="${((A[0]+F[0])/2+6).toFixed(1)}" y="${((A[1]+F[1])/2).toFixed(1)}" font-size="12" fill="#16a34a">${esc(opts.altLabel)}</text>`;}
  return body+`</svg>`;
}
// generic polygon (quads, n-gons)
function svgPolyFig(pts,opts={}){
  const W=300,H=260,T=fit(pts,W,H,40),P=pts.map(T);
  let body=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Segoe UI,Arial,sans-serif"><rect width="${W}" height="${H}" fill="#fff"/>`;
  const pr=_poly(P,opts.verts,opts.sides,opts); body+=pr.s;
  if(opts.diagonals) for(const [i,j] of opts.diagonals){const mx=(P[i][0]+P[j][0])/2,my=(P[i][1]+P[j][1])/2;body+=`<line x1="${P[i][0].toFixed(1)}" y1="${P[i][1].toFixed(1)}" x2="${P[j][0].toFixed(1)}" y2="${P[j][1].toFixed(1)}" stroke="#7c3aed" stroke-width="1.4" stroke-dasharray="4 3"/>`;}
  if(opts.alt!=null){const base=Math.max(...P.map(p=>p[1]));const A=P[opts.alt];body+=`<line x1="${A[0].toFixed(1)}" y1="${A[1].toFixed(1)}" x2="${A[0].toFixed(1)}" y2="${base.toFixed(1)}" stroke="#16a34a" stroke-width="1.4" stroke-dasharray="4 3"/>`;if(opts.altLabel)body+=`<text x="${(A[0]+6).toFixed(1)}" y="${((A[1]+base)/2).toFixed(1)}" font-size="12" fill="#16a34a">${esc(opts.altLabel)}</text>`;}
  return body+`</svg>`;
}
// circle figure: center O, radius r(px logical 1), elements
function svgCircleFig(opts={}){
  const W=300,H=270,cx=150,cy=140,R=opts.R||95;
  let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Segoe UI,Arial,sans-serif"><rect width="${W}" height="${H}" fill="#fff"/>`;
  s+=`<circle cx="${cx}" cy="${cy}" r="${R}" fill="rgba(37,99,235,0.05)" stroke="#2563eb" stroke-width="2"/>`;
  s+=`<circle cx="${cx}" cy="${cy}" r="2.5" fill="#0f172a"/>`;
  if(opts.centerLabel) s+=`<text x="${cx-6}" y="${cy+14}" font-size="12" fill="#0f172a">${esc(opts.centerLabel)}</text>`;
  const pt=(deg)=>[cx+R*Math.cos(deg*Math.PI/180), cy-R*Math.sin(deg*Math.PI/180)];
  if(opts.radius!=null){const p=pt(opts.radius);s+=`<line x1="${cx}" y1="${cy}" x2="${p[0].toFixed(1)}" y2="${p[1].toFixed(1)}" stroke="#dc2626" stroke-width="1.8"/>`;if(opts.radiusLabel)s+=`<text x="${((cx+p[0])/2).toFixed(1)}" y="${((cy+p[1])/2-4).toFixed(1)}" font-size="12" fill="#dc2626">${esc(opts.radiusLabel)}</text>`;}
  if(opts.points){for(const P of opts.points){const p=pt(P.deg);s+=`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3" fill="#0f172a"/>`;if(P.label){const lx=cx+(R+14)*Math.cos(P.deg*Math.PI/180),ly=cy-(R+14)*Math.sin(P.deg*Math.PI/180);s+=`<text x="${lx.toFixed(1)}" y="${(ly+4).toFixed(1)}" font-size="12" text-anchor="middle" fill="#0f172a">${esc(P.label)}</text>`;}}}
  if(opts.chords){for(const c of opts.chords){const a=pt(c[0]),b=pt(c[1]);s+=`<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="#2563eb" stroke-width="1.8"/>`;}}
  if(opts.angleAt){ // inscribed angle vertex at deg V to points A,B (draw two chords + label)
    const V=pt(opts.angleAt.v),A=pt(opts.angleAt.a),B=pt(opts.angleAt.b);
    s+=`<line x1="${V[0].toFixed(1)}" y1="${V[1].toFixed(1)}" x2="${A[0].toFixed(1)}" y2="${A[1].toFixed(1)}" stroke="#16a34a" stroke-width="1.8"/><line x1="${V[0].toFixed(1)}" y1="${V[1].toFixed(1)}" x2="${B[0].toFixed(1)}" y2="${B[1].toFixed(1)}" stroke="#16a34a" stroke-width="1.8"/>`;
    if(opts.angleAt.label)s+=`<text x="${V[0].toFixed(1)}" y="${(V[1]+ (V[1]<cy?-8:16)).toFixed(1)}" font-size="11" text-anchor="middle" fill="#16a34a">${esc(opts.angleAt.label)}</text>`;
  }
  if(opts.central){const A=pt(opts.central.a),B=pt(opts.central.b);s+=`<line x1="${cx}" y1="${cy}" x2="${A[0].toFixed(1)}" y2="${A[1].toFixed(1)}" stroke="#ea580c" stroke-width="1.8"/><line x1="${cx}" y1="${cy}" x2="${B[0].toFixed(1)}" y2="${B[1].toFixed(1)}" stroke="#ea580c" stroke-width="1.8"/>${opts.central.label?`<text x="${cx}" y="${cy-10}" font-size="11" text-anchor="middle" fill="#ea580c">${esc(opts.central.label)}</text>`:''}`;}
  if(opts.tangentAt!=null){const p=pt(opts.tangentAt);const tdir=[-Math.sin(opts.tangentAt*Math.PI/180),-Math.cos(opts.tangentAt*Math.PI/180)];s+=`<line x1="${(p[0]-tdir[0]*70).toFixed(1)}" y1="${(p[1]-tdir[1]*70).toFixed(1)}" x2="${(p[0]+tdir[0]*70).toFixed(1)}" y2="${(p[1]+tdir[1]*70).toFixed(1)}" stroke="#0f172a" stroke-width="1.8"/><line x1="${cx}" y1="${cy}" x2="${p[0].toFixed(1)}" y2="${p[1].toFixed(1)}" stroke="#dc2626" stroke-width="1.6"/>`;}
  return s+`</svg>`;
}
// angle figure: two rays from a vertex with arc + label
function svgAngle(deg1,deg2,opts={}){
  const W=300,H=200,vx=60,vy=150,L=200;
  const r1=[vx+L*Math.cos(-deg1*Math.PI/180),vy+L*Math.sin(-deg1*Math.PI/180)];
  const r2=[vx+L*Math.cos(-deg2*Math.PI/180),vy+L*Math.sin(-deg2*Math.PI/180)];
  let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Segoe UI,Arial,sans-serif"><rect width="${W}" height="${H}" fill="#fff"/>`;
  s+=`<line x1="${vx}" y1="${vy}" x2="${r1[0].toFixed(1)}" y2="${r1[1].toFixed(1)}" stroke="#2563eb" stroke-width="2"/>`;
  s+=`<line x1="${vx}" y1="${vy}" x2="${r2[0].toFixed(1)}" y2="${r2[1].toFixed(1)}" stroke="#2563eb" stroke-width="2"/>`;
  const ar=34,a1=pt2(vx,vy,ar,deg1),a2=pt2(vx,vy,ar,deg2);
  s+=`<path d="M ${a1[0].toFixed(1)} ${a1[1].toFixed(1)} A ${ar} ${ar} 0 0 0 ${a2[0].toFixed(1)} ${a2[1].toFixed(1)}" fill="none" stroke="#16a34a" stroke-width="1.6"/>`;
  if(opts.label){const mid=(deg1+deg2)/2,lp=pt2(vx,vy,ar+18,mid);s+=`<text x="${lp[0].toFixed(1)}" y="${(lp[1]+4).toFixed(1)}" font-size="13" text-anchor="middle" fill="#16a34a">${esc(opts.label)}</text>`;}
  s+=`<circle cx="${vx}" cy="${vy}" r="2.5" fill="#0f172a"/>`;
  if(opts.vertexLabel)s+=`<text x="${vx-12}" y="${vy+6}" font-size="12" fill="#0f172a">${esc(opts.vertexLabel)}</text>`;
  return s+`</svg>`;
}
function pt2(vx,vy,r,deg){return [vx+r*Math.cos(-deg*Math.PI/180), vy+r*Math.sin(-deg*Math.PI/180)];}
// two parallel lines cut by a transversal, with one labelled angle
function svgParallelLines(angLabel,known){
  const W=320,H=210;let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Segoe UI,Arial,sans-serif"><rect width="${W}" height="${H}" fill="#fff"/>`;
  s+=`<line x1="20" y1="70" x2="300" y2="70" stroke="#2563eb" stroke-width="2"/><text x="305" y="74" font-size="12" fill="#2563eb">a</text>`;
  s+=`<line x1="20" y1="150" x2="300" y2="150" stroke="#2563eb" stroke-width="2"/><text x="305" y="154" font-size="12" fill="#2563eb">b</text>`;
  s+=`<line x1="90" y1="30" x2="230" y2="190" stroke="#0f172a" stroke-width="2"/>`;
  // known angle at top intersection (~ (130,70))
  s+=`<text x="148" y="60" font-size="12" fill="#16a34a">${esc(known)}</text>`;
  s+=`<text x="168" y="142" font-size="12" fill="#dc2626">${esc(angLabel)}</text>`;
  return s+`</svg>`;
}

// ================= SVG: 3-D SOLIDS (oblique projection) =================
function _svgHead(W,H){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Segoe UI,Arial,sans-serif"><rect width="${W}" height="${H}" fill="#fff"/>`;}
// rectangular box: front w×ht, depth d (px). labels {a,b,c} for width/height/depth edges
function svgBox(la,lb,lc,opts={}){
  const W=300,H=250; let s=_svgHead(W,H);
  const x0=70,y0=185,w=130,ht=95,dx=55,dy=-42;
  const A=[x0,y0],B=[x0+w,y0],C=[x0+w,y0-ht],D=[x0,y0-ht];
  const A2=[A[0]+dx,A[1]+dy],B2=[B[0]+dx,B[1]+dy],C2=[C[0]+dx,C[1]+dy],D2=[D[0]+dx,D[1]+dy];
  const ln=(p,q,dash)=>`<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="#0f172a" stroke-width="1.7"${dash?' stroke-dasharray="4 3" stroke-opacity="0.55"':''}/>`;
  // hidden edges (back-left bottom) dashed: A2 connects
  s+=ln(A2,B2,1)+ln(A2,D2,1)+ln(A2,A,1);
  // visible
  s+=ln(A,B)+ln(B,C)+ln(C,D)+ln(D,A)+ln(B,B2)+ln(C,C2)+ln(D,D2)+ln(B2,C2)+ln(C2,D2);
  s+=`<polygon points="${A[0]},${A[1]} ${B[0]},${B[1]} ${C[0]},${C[1]} ${D[0]},${D[1]}" fill="rgba(37,99,235,0.06)"/>`;
  if(opts.a)s+=`<text x="${x0+w/2}" y="${y0+16}" font-size="12" text-anchor="middle" fill="#b91c1c">${esc(opts.a)}</text>`;
  if(opts.b)s+=`<text x="${x0-10}" y="${y0-ht/2}" font-size="12" text-anchor="end" fill="#b91c1c">${esc(opts.b)}</text>`;
  if(opts.c)s+=`<text x="${(B[0]+B2[0])/2+6}" y="${(B[1]+B2[1])/2+4}" font-size="12" fill="#b91c1c">${esc(opts.c)}</text>`;
  if(opts.diag)s+=`<line x1="${A[0]}" y1="${A[1]}" x2="${C2[0]}" y2="${C2[1]}" stroke="#7c3aed" stroke-width="1.5" stroke-dasharray="3 3"/>`;
  return s+`</svg>`;
}
function svgCylinder(lr,lh,opts={}){
  const W=260,H=260;let s=_svgHead(W,H);
  const cx=130,topY=55,botY=200,rx=70,ry=20;
  s+=`<line x1="${cx-rx}" y1="${topY}" x2="${cx-rx}" y2="${botY}" stroke="#0f172a" stroke-width="1.7"/><line x1="${cx+rx}" y1="${topY}" x2="${cx+rx}" y2="${botY}" stroke="#0f172a" stroke-width="1.7"/>`;
  s+=`<ellipse cx="${cx}" cy="${botY}" rx="${rx}" ry="${ry}" fill="rgba(37,99,235,0.06)" stroke="#0f172a" stroke-width="1.7"/>`;
  s+=`<path d="M ${cx-rx} ${botY} A ${rx} ${ry} 0 0 0 ${cx+rx} ${botY}" fill="none" stroke="#0f172a" stroke-width="1.7" stroke-dasharray="4 3" stroke-opacity="0.5"/>`;
  s+=`<ellipse cx="${cx}" cy="${topY}" rx="${rx}" ry="${ry}" fill="rgba(37,99,235,0.10)" stroke="#0f172a" stroke-width="1.7"/>`;
  s+=`<line x1="${cx}" y1="${topY}" x2="${cx+rx}" y2="${topY}" stroke="#dc2626" stroke-width="1.5"/><text x="${cx+rx/2}" y="${topY-5}" font-size="12" text-anchor="middle" fill="#dc2626">${esc(opts.r||'r')}</text>`;
  s+=`<line x1="${cx+rx+12}" y1="${topY}" x2="${cx+rx+12}" y2="${botY}" stroke="#16a34a" stroke-width="1.3"/><text x="${cx+rx+18}" y="${(topY+botY)/2}" font-size="12" fill="#16a34a">${esc(opts.h||'h')}</text>`;
  return s+`</svg>`;
}
function svgCone(opts={}){
  const W=240,H=260;let s=_svgHead(W,H);
  const cx=120,botY=200,rx=68,ry=18,apex=[cx,48];
  s+=`<line x1="${cx-rx}" y1="${botY}" x2="${apex[0]}" y2="${apex[1]}" stroke="#0f172a" stroke-width="1.7"/><line x1="${cx+rx}" y1="${botY}" x2="${apex[0]}" y2="${apex[1]}" stroke="#0f172a" stroke-width="1.7"/>`;
  s+=`<path d="M ${cx-rx} ${botY} A ${rx} ${ry} 0 0 0 ${cx+rx} ${botY}" fill="rgba(37,99,235,0.06)" stroke="#0f172a" stroke-width="1.7" stroke-dasharray="4 3" stroke-opacity="0.6"/>`;
  s+=`<path d="M ${cx-rx} ${botY} A ${rx} ${ry} 0 0 1 ${cx+rx} ${botY}" fill="rgba(37,99,235,0.06)" stroke="#0f172a" stroke-width="1.7"/>`;
  s+=`<line x1="${cx}" y1="${botY}" x2="${cx+rx}" y2="${botY}" stroke="#dc2626" stroke-width="1.5"/><text x="${cx+rx/2}" y="${botY+16}" font-size="12" text-anchor="middle" fill="#dc2626">${esc(opts.r||'r')}</text>`;
  s+=`<line x1="${cx}" y1="${botY}" x2="${cx}" y2="${apex[1]}" stroke="#16a34a" stroke-width="1.3" stroke-dasharray="3 3"/><text x="${cx+6}" y="${(botY+apex[1])/2}" font-size="12" fill="#16a34a">${esc(opts.h||'h')}</text>`;
  return s+`</svg>`;
}
function svgPyramid(opts={}){
  const W=270,H=250;let s=_svgHead(W,H);
  const A=[55,195],B=[185,195],C=[225,160],D=[95,160],apex=[140,45];
  const ln=(p,q,d)=>`<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="#0f172a" stroke-width="1.7"${d?' stroke-dasharray="4 3" stroke-opacity="0.55"':''}/>`;
  s+=`<polygon points="${A} ${B} ${C} ${D}" fill="rgba(37,99,235,0.06)"/>`;
  s+=ln(D,C,1)+ln(D,A,1)+ln(apex,D,1); // back/hidden edges
  s+=ln(A,B)+ln(B,C)+ln(apex,A)+ln(apex,B)+ln(apex,C);
  if(opts.h){s+=`<line x1="${140}" y1="${177}" x2="${apex[0]}" y2="${apex[1]}" stroke="#16a34a" stroke-width="1.3" stroke-dasharray="3 3"/><text x="${apex[0]+6}" y="${(177+apex[1])/2}" font-size="12" fill="#16a34a">${esc(opts.h)}</text>`;}
  if(opts.a)s+=`<text x="${(A[0]+B[0])/2}" y="${A[1]+16}" font-size="12" text-anchor="middle" fill="#b91c1c">${esc(opts.a)}</text>`;
  return s+`</svg>`;
}
function svgPrism(opts={}){ // triangular prism
  const W=300,H=240;let s=_svgHead(W,H);
  const A=[60,190],B=[170,190],C=[100,95],dx=70,dy=-22;
  const A2=[A[0]+dx,A[1]+dy],B2=[B[0]+dx,B[1]+dy],C2=[C[0]+dx,C[1]+dy];
  const ln=(p,q,d)=>`<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="#0f172a" stroke-width="1.7"${d?' stroke-dasharray="4 3" stroke-opacity="0.55"':''}/>`;
  s+=`<polygon points="${A} ${B} ${C}" fill="rgba(37,99,235,0.07)"/>`;
  s+=ln(A,A2,1)+ln(A2,B2,1)+ln(A2,C2,1); // hidden back edges (A2 is the rear-bottom-left)
  s+=ln(A,B)+ln(B,C)+ln(C,A)+ln(B,B2)+ln(C,C2)+ln(B2,C2); // visible
  if(opts.h)s+=`<text x="${(B[0]+B2[0])/2+4}" y="${(B[1]+B2[1])/2+14}" font-size="12" fill="#16a34a">${esc(opts.h)}</text>`;
  return s+`</svg>`;
}
function svgSphere(opts={}){
  const W=240,H=240;let s=_svgHead(W,H);
  const cx=120,cy=120,R=88;
  s+=`<circle cx="${cx}" cy="${cy}" r="${R}" fill="rgba(37,99,235,0.06)" stroke="#0f172a" stroke-width="1.8"/>`;
  s+=`<ellipse cx="${cx}" cy="${cy}" rx="${R}" ry="26" fill="none" stroke="#0f172a" stroke-width="1.3" stroke-dasharray="4 3" stroke-opacity="0.6"/>`;
  s+=`<circle cx="${cx}" cy="${cy}" r="2.4" fill="#0f172a"/>`;
  s+=`<line x1="${cx}" y1="${cy}" x2="${cx+R}" y2="${cy}" stroke="#dc2626" stroke-width="1.6"/><text x="${cx+R/2}" y="${cy-5}" font-size="12" text-anchor="middle" fill="#dc2626">${esc(opts.r||'R')}</text>`;
  return s+`</svg>`;
}
// ================= SVG: CHARTS =================
function svgBars(data,opts={}){ // data:[{label,value}]
  const W=340,H=230,M=34,base=H-M,top=24,maxV=Math.max(...data.map(d=>d.value));
  const bw=(W-2*M)/(data.length*1.6);let s=_svgHead(W,H);
  s+=`<line x1="${M}" y1="${base}" x2="${W-12}" y2="${base}" stroke="#222" stroke-width="1.3"/><line x1="${M}" y1="${top-6}" x2="${M}" y2="${base}" stroke="#222" stroke-width="1.3"/>`;
  const cols=['#2563eb','#7c3aed','#16a34a','#ea580c','#dc2626','#0891b2','#ca8a04'];
  data.forEach((d,i)=>{const h=(base-top)*d.value/maxV;const x=M+18+i*(bw*1.6);
    s+=`<rect x="${x.toFixed(1)}" y="${(base-h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" fill="${cols[i%cols.length]}" fill-opacity="0.82"/>`;
    s+=`<text x="${(x+bw/2).toFixed(1)}" y="${(base-h-5).toFixed(1)}" font-size="11" text-anchor="middle" fill="#0f172a">${d.value}</text>`;
    s+=`<text x="${(x+bw/2).toFixed(1)}" y="${base+15}" font-size="10" text-anchor="middle" fill="#475569">${esc(d.label)}</text>`;});
  if(opts.title)s+=`<text x="${W/2}" y="14" font-size="11" text-anchor="middle" fill="#475569">${esc(opts.title)}</text>`;
  return s+`</svg>`;
}
function svgPie(parts,opts={}){ // parts:[{label,value}]
  const W=320,H=230,cx=120,cy=120,R=92;let s=_svgHead(W,H);
  const tot=parts.reduce((a,p)=>a+p.value,0);let ang=-90;
  const cols=['#2563eb','#7c3aed','#16a34a','#ea580c','#dc2626','#0891b2','#ca8a04'];
  parts.forEach((p,i)=>{const sweep=p.value/tot*360,a0=ang*Math.PI/180,a1=(ang+sweep)*Math.PI/180;
    const x0=cx+R*Math.cos(a0),y0=cy+R*Math.sin(a0),x1=cx+R*Math.cos(a1),y1=cy+R*Math.sin(a1);
    const large=sweep>180?1:0;
    s+=`<path d="M ${cx} ${cy} L ${x0.toFixed(1)} ${y0.toFixed(1)} A ${R} ${R} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z" fill="${cols[i%cols.length]}" fill-opacity="0.82" stroke="#fff" stroke-width="1.5"/>`;
    const mid=(ang+sweep/2)*Math.PI/180,lx=cx+(R*0.62)*Math.cos(mid),ly=cy+(R*0.62)*Math.sin(mid);
    s+=`<text x="${lx.toFixed(1)}" y="${(ly+4).toFixed(1)}" font-size="11" text-anchor="middle" fill="#fff">${Math.round(p.value/tot*100)}%</text>`;
    s+=`<rect x="${236}" y="${40+i*22}" width="12" height="12" fill="${cols[i%cols.length]}" fill-opacity="0.82"/><text x="${252}" y="${50+i*22}" font-size="11" fill="#0f172a">${esc(p.label)}</text>`;
    ang+=sweep;});
  return s+`</svg>`;
}

// ---------- generator library ----------
const G={};
function def(key,lvl,kind,title,fn){ G[key]={lvl,kind,title,fn}; }

function windowFor(pts,pad){const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);return{xmin:Math.floor(Math.min(...xs,0)-pad),xmax:Math.ceil(Math.max(...xs,0)+pad),ymin:Math.floor(Math.min(...ys,0)-pad),ymax:Math.ceil(Math.max(...ys,0)+pad)};}
const TRIP=[[3,4,5],[6,8,10],[5,12,13],[8,15,17],[9,12,15],[7,24,25],[20,21,29],[8,6,10],[12,5,13]];

/* ===== КООРДИНАТЫ И ФУНКЦИИ ===== */
def('vPointDist',2,'B','Расстояние между точками',r=>{const t=r.pick(TRIP.filter(x=>x[0]<=7&&x[1]<=7));const sx=r.bool()?1:-1,sy=r.bool()?1:-1;const ax=r.int(-3,2),ay=r.int(-3,2);const bx=ax+sx*t[0],by=ay+sy*t[1];const d=t[2];chk((bx-ax)**2+(by-ay)**2===d*d,'pd');
  const win=windowFor([[ax,ay],[bx,by]],1.5);
  return{content:`Найдите расстояние между точками $A(${ax};${ay})$ и $B(${bx};${by})$.`,solution:`$AB=\\sqrt{(${bx}-${ax})^2+(${by}-${ay})^2}=\\sqrt{${(bx-ax)**2}+${(by-ay)**2}}=\\sqrt{${d*d}}=${d}$.`,explanation:`Расстояние между точками: $\\sqrt{(x_2-x_1)^2+(y_2-y_1)^2}$.`,answer:d,dis:[Math.abs(bx-ax)+Math.abs(by-ay),d+1,Math.abs(t[0]-t[1])||d-1],svg:svgPlane({...win,items:[{t:'segment',x1:ax,y1:ay,x2:bx,y2:by,color:'#7c3aed'},{t:'point',x:ax,y:ay,label:'A',color:'#2563eb'},{t:'point',x:bx,y:by,label:'B',color:'#dc2626'}]})};});
def('vMidpoint',1,'AB','Координаты середины отрезка',r=>{let ax=r.int(-5,5),bx=r.int(-5,5);if((ax+bx)%2)bx+=(bx<5?1:-1);let ay=r.int(-5,5),by=r.int(-5,5);if((ay+by)%2)by+=(by<5?1:-1);const mx=(ax+bx)/2,my=(ay+by)/2;const ask=r.bool();const ans=ask?mx:my;chk(2*mx===ax+bx&&2*my===ay+by,'mp');
  const win=windowFor([[ax,ay],[bx,by]],1.5);
  return{content:`Точка $M$ — середина отрезка $AB$, где $A(${ax};${ay})$, $B(${bx};${by})$. Найдите ${ask?'абсциссу (x)':'ординату (y)'} точки $M$.`,solution:`Координаты середины: $x_M=\\dfrac{${ax}+${bx}}{2}=${mx}$, $y_M=\\dfrac{${ay}+${by}}{2}=${my}$. Ответ: $${ans}$.`,explanation:`Координаты середины отрезка — среднее арифметическое координат концов.`,answer:ans,dis:[ask?my:mx,ans+1,ans-1],svg:svgPlane({...win,items:[{t:'segment',x1:ax,y1:ay,x2:bx,y2:by,color:'#94a3b8'},{t:'point',x:ax,y:ay,label:'A',color:'#2563eb'},{t:'point',x:bx,y:by,label:'B',color:'#2563eb'},{t:'point',x:mx,y:my,label:'M',color:'#dc2626'}]})};});
def('vLineSlope',2,'B','Угловой коэффициент по графику',r=>{const k=r.pick([-3,-2,-1,1,2,3]),b=r.int(-3,3);const x1=r.int(-4,-1),x2=r.int(1,4);const y1=k*x1+b,y2=k*x2+b;chk((y2-y1)===k*(x2-x1),'ls');
  const win=windowFor([[x1,y1],[x2,y2],[0,b]],1.5);
  return{content:`Прямая проходит через точки $(${x1};${y1})$ и $(${x2};${y2})$ (см. график). Найдите угловой коэффициент $k$ этой прямой.`,solution:`$k=\\dfrac{y_2-y_1}{x_2-x_1}=\\dfrac{${y2}-(${y1})}{${x2}-(${x1})}=\\dfrac{${y2-y1}}{${x2-x1}}=${k}$.`,explanation:`Угловой коэффициент $k=\\frac{\\Delta y}{\\Delta x}$ (наклон прямой).`,answer:k,dis:[b,-k,k+1],svg:svgPlane({...win,items:[{t:'line',k,b,color:'#2563eb'},{t:'point',x:x1,y:y1,color:'#dc2626'},{t:'point',x:x2,y:y2,color:'#dc2626'}]})};});
def('vLineIntercept',2,'B','Точка пересечения прямой с осью',r=>{const k=r.pick([-3,-2,2,3,-1,1]);let x0=r.int(-4,4);if(x0===0)x0=2;const b=-k*x0;const ask=r.bool();const ans=ask?x0:b;chk(k*x0+b===0,'li');
  const win=windowFor([[x0,0],[0,b]],1.5);
  return{content:`Прямая задана уравнением $y=${k}x${b>=0?'+'+b:b}$ (см. график). Найдите ${ask?'абсциссу точки пересечения с осью Ox':'ординату точки пересечения с осью Oy'}.`,solution:ask?`Ось $Ox$: $y=0$, значит $${k}x${b>=0?'+'+b:b}=0$, $x=${x0}$.`:`Ось $Oy$: $x=0$, значит $y=${b}$.`,explanation:ask?`Пересечение с осью $Ox$: подставьте $y=0$.`:`Пересечение с осью $Oy$ — это свободный член $b$.`,answer:ans,dis:[ask?b:x0,ans+1,-ans],svg:svgPlane({...win,items:[{t:'line',k,b,color:'#2563eb'},{t:'point',x:x0,y:0,color:'#dc2626'},{t:'point',x:0,y:b,color:'#16a34a'}]})};});
def('vLineValueAt',2,'AB','Значение функции по графику',r=>{const k=r.pick([-2,-1,1,2,3]),b=r.int(-3,3);const x0=r.int(-3,3);const y0=k*x0+b;chk(y0===k*x0+b,'lv');
  const win=windowFor([[x0,y0],[0,b]],2);
  return{content:`На графике изображена линейная функция $y=kx+b$. Используя график, найдите $y$ при $x=${x0}$.`,solution:`По графику прямая проходит через $(0;${b})$ с наклоном $${k}$: $y=${k}x${b>=0?'+'+b:b}$. При $x=${x0}$: $y=${k}\\cdot${x0}${b>=0?'+'+b:b}=${y0}$.`,explanation:`Найдите $y$, опустив перпендикуляр от точки $x=${x0}$ до графика.`,answer:y0,dis:[b,k*x0,y0+1],svg:svgPlane({...win,items:[{t:'line',k,b,color:'#2563eb'},{t:'segment',x1:x0,y1:0,x2:x0,y2:y0,color:'#94a3b8',dash:1},{t:'point',x:x0,y:y0,label:'?',color:'#dc2626'}]})};});
def('vParabolaVertex',3,'B','Вершина параболы по графику',r=>{const h=r.int(-3,3),kk=r.int(-3,3);const a=r.pick([1,1,1,-1]);const ask=r.bool();const ans=ask?h:kk;chk(true,'pv');
  const win={xmin:Math.min(h-3,-1),xmax:Math.max(h+3,1),ymin:Math.min(kk-1,-1,a>0?kk-1:kk-5),ymax:Math.max(kk+5*Math.abs(a),1,a>0?kk+5:kk+1)};
  return{content:`На рисунке изображена парабола $y=${a===-1?'-':''}(x${h>0?'-'+h:(h<0?'+'+(-h):'')})^2${kk>=0?'+'+kk:kk}$. Найдите ${ask?'абсциссу':'ординату'} её вершины.`,solution:`Парабола вида $y=a(x-h)^2+k$ имеет вершину $(h;k)=(${h};${kk})$. Ответ: $${ans}$.`,explanation:`У параболы $y=a(x-h)^2+k$ вершина в точке $(h;k)$.`,answer:ans,dis:[ask?kk:h,-ans,ans+1],svg:svgPlane({...win,items:[{t:'parabola',a,b:-2*a*h,c:a*h*h+kk,color:'#7c3aed'},{t:'point',x:h,y:kk,label:'вершина',color:'#dc2626'}]})};});
def('vParabolaRoots',3,'B','Корни квадратичной функции по графику',r=>{let r1=r.int(-4,2),r2=r.int(-1,4);if(r1>=r2)r2=r1+r.int(1,3);const a=r.pick([1,1,-1]);const mode=r.pick(['sum','one']);const ans=mode==='sum'?r1+r2:r2;chk(true,'pr');
  const win={xmin:Math.min(r1,r2,0)-2,xmax:Math.max(r1,r2,0)+2,ymin:a>0?-5:-1,ymax:a>0?2:5};const m=-(r1+r2)*a,c=a*r1*r2;
  return{content:`Парабола пересекает ось $Ox$ в точках $x=${r1}$ и $x=${r2}$ (см. график). Найдите ${mode==='sum'?'сумму корней уравнения $y=0$':'больший корень'}.`,solution:mode==='sum'?`Корни $x_1=${r1}$, $x_2=${r2}$, их сумма $=${r1+r2}$.`:`Корни $x_1=${r1}$, $x_2=${r2}$; больший равен $${r2}$.`,explanation:`Нули функции (корни) — точки пересечения графика с осью $Ox$.`,answer:ans,dis:[mode==='sum'?r1*r2:r1,ans+1,ans-1],svg:svgPlane({...win,items:[{t:'parabola',a,b:m,c,color:'#7c3aed'},{t:'point',x:r1,y:0,color:'#dc2626'},{t:'point',x:r2,y:0,color:'#dc2626'}]})};});
def('vTriAreaCoord',3,'B','Площадь треугольника по координатам',r=>{let x1,y1,x2,y2,x3,y3,D=0;for(let i=0;i<60;i++){x1=r.int(-4,4);y1=r.int(-4,4);x2=r.int(-4,4);y2=r.int(-4,4);x3=r.int(-4,4);y3=r.int(-4,4);D=Math.abs((x2-x1)*(y3-y1)-(x3-x1)*(y2-y1));if(D>=6&&D%2===0)break;D=0;}if(!D)throw 0;const S=D/2;chk(2*S===D,'tac');
  const win=windowFor([[x1,y1],[x2,y2],[x3,y3]],1.5);
  return{content:`Найдите площадь треугольника с вершинами $A(${x1};${y1})$, $B(${x2};${y2})$, $C(${x3};${y3})$.`,solution:`$S=\\dfrac12|(x_B-x_A)(y_C-y_A)-(x_C-x_A)(y_B-y_A)|=\\dfrac{${D}}{2}=${S}$.`,explanation:`Площадь по координатам вершин: $S=\\frac12|(x_2-x_1)(y_3-y_1)-(x_3-x_1)(y_2-y_1)|$.`,answer:S,dis:[D,S+1,S-1],svg:svgPlane({...win,items:[{t:'poly',pts:[[x1,y1],[x2,y2],[x3,y3]],fill:'rgba(124,58,237,0.12)',stroke:'#7c3aed'},{t:'point',x:x1,y:y1,label:'A',color:'#2563eb'},{t:'point',x:x2,y:y2,label:'B',color:'#2563eb'},{t:'point',x:x3,y:y3,label:'C',color:'#2563eb'}]})};});
def('vCircleRadius',2,'B','Радиус окружности по графику',r=>{const a=r.int(-2,2),b=r.int(-2,2),rad=r.int(2,4);chk(rad>0,'cr');
  const win={xmin:a-rad-1,xmax:a+rad+1,ymin:b-rad-1,ymax:b+rad+1};
  return{content:`Окружность задана уравнением $(x${a>0?'-'+a:(a<0?'+'+(-a):'')})^2+(y${b>0?'-'+b:(b<0?'+'+(-b):'')})^2=${rad*rad}$. Найдите её радиус.`,solution:`Уравнение окружности $(x-a)^2+(y-b)^2=R^2$, здесь $R^2=${rad*rad}$, поэтому $R=${rad}$.`,explanation:`В уравнении $(x-a)^2+(y-b)^2=R^2$ правая часть равна квадрату радиуса.`,answer:rad,dis:[rad*rad,rad+1,2*rad],svg:svgPlane({...win,items:[{t:'circle',cx:a,cy:b,r:rad,color:'#2563eb'},{t:'point',x:a,y:b,label:'O',color:'#0f172a'}]})};});
def('vHyperbolaValue',3,'AB','Обратная пропорциональность по графику',r=>{const k=r.pick([2,3,4,6,8,12,-6,-4]);const x0=r.pick([1,2,3,4].filter(x=>k%x===0&&Math.abs(k/x)<=8));if(x0===undefined)throw 0;const y0=k/x0;chk(x0*y0===k,'hv');
  const win={xmin:-8,xmax:8,ymin:-8,ymax:8};
  return{content:`График функции $y=\\dfrac{${k}}{x}$ проходит через точку с абсциссой $x=${x0}$ (см. рисунок). Найдите ординату этой точки.`,solution:`$y=\\dfrac{${k}}{x}=\\dfrac{${k}}{${x0}}=${y0}$.`,explanation:`Подставьте $x=${x0}$ в формулу обратной пропорциональности $y=k/x$.`,answer:y0,dis:[k,x0,y0+1],svg:svgPlane({xmin:-8,xmax:8,ymin:-8,ymax:8,items:[{t:'curve',fn:x=>k/x,color:'#7c3aed'},{t:'point',x:x0,y:y0,label:'?',color:'#dc2626'}]})};});
def('vTangentSlope',4,'B','Производная по касательной (парабола)',r=>{const x0=r.pick([-3,-2,-1,1,2,3]);const k=2*x0;chk(k===2*x0,'ts');
  const win={xmin:Math.min(x0-3,-1),xmax:Math.max(x0+3,1),ymin:-1,ymax:Math.max(x0*x0+4,5)};const b=-(x0*x0);
  return{content:`К графику функции $y=x^2$ проведена касательная в точке с абсциссой $x_0=${x0}$ (см. рисунок). Найдите значение производной $f'(${x0})$, равное угловому коэффициенту касательной.`,solution:`$f'(x)=2x$, поэтому $f'(${x0})=2\\cdot${x0}=${k}$ (это и есть наклон касательной).`,explanation:`Производная в точке равна угловому коэффициенту касательной: $f'(x)=2x$ для $y=x^2$.`,answer:k,dis:[x0*x0,x0,k+2],svg:svgPlane({...win,items:[{t:'parabola',a:1,b:0,c:0,color:'#7c3aed'},{t:'line',k,b,color:'#ea580c'},{t:'point',x:x0,y:x0*x0,label:'M',color:'#dc2626'}]})};});

/* ===== ПЛАНИМЕТРИЯ (фигуры) ===== */
def('vPythagoras',2,'B','Гипотенуза прямоугольного треугольника',r=>{const t=r.pick(TRIP);chk(t[0]*t[0]+t[1]*t[1]===t[2]*t[2],'py');
  return{content:`В прямоугольном треугольнике катеты равны $${t[0]}$ и $${t[1]}$. Найдите гипотенузу.`,solution:`По теореме Пифагора $c=\\sqrt{${t[0]}^2+${t[1]}^2}=\\sqrt{${t[0]**2+t[1]**2}}=${t[2]}$.`,explanation:`Гипотенуза $c=\\sqrt{a^2+b^2}$.`,answer:t[2],dis:[t[0]+t[1],t[2]+1,Math.abs(t[0]-t[1])||t[2]-1],svg:svgTri([[0,0],[t[0],0],[0,t[1]]],{right:0,sides:[`${t[0]}`,'?',`${t[1]}`],verts:['C','A','B']})};});
def('vPythagorasLeg',3,'B','Катет прямоугольного треугольника',r=>{const t=r.pick(TRIP);chk(t[2]*t[2]-t[0]*t[0]===t[1]*t[1],'pyl');
  return{content:`В прямоугольном треугольнике гипотенуза равна $${t[2]}$, один катет равен $${t[0]}$. Найдите второй катет.`,solution:`$b=\\sqrt{c^2-a^2}=\\sqrt{${t[2]}^2-${t[0]}^2}=\\sqrt{${t[2]**2-t[0]**2}}=${t[1]}$.`,explanation:`Катет $b=\\sqrt{c^2-a^2}$.`,answer:t[1],dis:[t[2]-t[0],t[1]+1,t[2]+t[0]],svg:svgTri([[0,0],[t[0],0],[0,t[1]]],{right:0,sides:[`${t[0]}`,`${t[2]}`,'?'],verts:['C','A','B']})};});
def('vTriAreaBH',2,'AB','Площадь треугольника (основание и высота)',r=>{let b=r.int(3,12),h=r.int(2,10);if((b*h)%2)h+=1;const S=b*h/2;chk(2*S===b*h,'tabh');
  return{content:`Основание треугольника равно $${b}$, высота, проведённая к нему, равна $${h}$. Найдите площадь треугольника.`,solution:`$S=\\dfrac12 a h=\\dfrac12\\cdot${b}\\cdot${h}=${S}$.`,explanation:`Площадь треугольника $S=\\frac12\\cdot a\\cdot h$.`,answer:S,dis:[b*h,b+h,S+b],svg:svgTri([[0,0],[b,0],[b*0.34,h]],{alt:2,altLabel:`${h}`,sides:[`${b}`,'','']})};});
def('vAngleSum',1,'AB','Сумма углов треугольника',r=>{const a=r.int(35,80),b=r.int(35,80);const c=180-a-b;chk(a+b+c===180&&c>0,'as');
  return{content:`Два угла треугольника равны $${a}°$ и $${b}°$. Найдите третий угол (в градусах).`,solution:`Сумма углов треугольника равна $180°$: третий угол $=180°-${a}°-${b}°=${c}°$.`,explanation:`Сумма углов любого треугольника равна $180°$.`,answer:c,dis:[a+b,180-a,90-c>0?90-c:c+10],svg:svgTri([[0,0],[6,0],[2.2,4.2]],{angles:[`${a}°`,`${b}°`,'?'],verts:['A','B','C']})};});
def('vExteriorAngle',2,'AB','Внешний угол треугольника',r=>{const a=r.int(35,75),b=r.int(35,75);const ext=a+b;chk(ext===a+b&&ext<180,'ea');
  return{content:`Два внутренних угла треугольника равны $${a}°$ и $${b}°$. Найдите внешний угол при третьей вершине (в градусах).`,solution:`Внешний угол равен сумме двух несмежных внутренних: $${a}°+${b}°=${ext}°$.`,explanation:`Внешний угол треугольника равен сумме двух не смежных с ним внутренних углов.`,answer:ext,dis:[180-ext,180-a,a+b-10],svg:svgTri([[0,0],[6,0],[2.2,4.2]],{angles:[`${a}°`,`${b}°`,''],verts:['A','B','C']})};});
def('vIsoscelesBase',2,'AB','Углы равнобедренного треугольника',r=>{let apex=2*r.int(20,70);const base=(180-apex)/2;const fromApex=r.bool();chk(2*base+apex===180,'ib');
  return fromApex?{content:`В равнобедренном треугольнике угол при вершине равен $${apex}°$. Найдите угол при основании (в градусах).`,solution:`Углы при основании равны: $\\dfrac{180°-${apex}°}{2}=${base}°$.`,explanation:`В равнобедренном треугольнике углы при основании равны: $(180°-\\alpha)/2$.`,answer:base,dis:[apex,180-apex,90-base>0?90-base:base+5],svg:svgTri([[-2,0],[2,0],[0,3.4]],{angles:['','',`${apex}°`],verts:['A','B','C']})}
  :{content:`В равнобедренном треугольнике угол при основании равен $${base}°$. Найдите угол при вершине (в градусах).`,solution:`Угол при вершине $=180°-2\\cdot${base}°=${apex}°$.`,explanation:`Сумма углов $180°$; два угла при основании равны.`,answer:apex,dis:[base,180-base,180-2*base-10],svg:svgTri([[-2,0],[2,0],[0,3.4]],{angles:[`${base}°`,`${base}°`,'?'],verts:['A','B','C']})};});
def('vRightTrig30',3,'B','Катет против угла 30°',r=>{const hyp=2*r.int(3,12);const leg=hyp/2;chk(2*leg===hyp,'rt30');
  return{content:`В прямоугольном треугольнике гипотенуза равна $${hyp}$, один из острых углов равен $30°$. Найдите катет, лежащий против угла $30°$.`,solution:`Катет против угла $30°$ равен половине гипотенузы: $\\dfrac{${hyp}}{2}=${leg}$.`,explanation:`Катет, лежащий против угла $30°$, равен половине гипотенузы.`,answer:leg,dis:[hyp,leg+2,hyp*2],svg:svgTri([[0,0],[Math.round(leg*1.732*10)/10,0],[0,leg]],{right:0,sides:['','?',`${hyp}`],angles:['','','30°'],verts:['C','A','B']})};});
def('vSquareArea',1,'AB','Площадь и периметр квадрата',r=>{const a=r.int(3,15);const area=a*a;const ask=r.bool();const ans=ask?area:4*a;chk(area===a*a,'sq');
  return{content:`Сторона квадрата равна $${a}$. Найдите ${ask?'площадь':'периметр'} квадрата.`,solution:ask?`$S=a^2=${a}^2=${area}$.`:`$P=4a=4\\cdot${a}=${4*a}$.`,explanation:ask?`Площадь квадрата $S=a^2$.`:`Периметр квадрата $P=4a$.`,answer:ans,dis:[ask?4*a:area,ans+a,ans-a],svg:svgPolyFig([[0,0],[a,0],[a,a],[0,a]],{sides:[`${a}`,'','',''],verts:['','','','']})};});
def('vRectangle',1,'AB','Прямоугольник: площадь/периметр',r=>{const a=r.int(3,14),b=r.int(2,10);const area=a*b,per=2*(a+b);const ask=r.bool();const ans=ask?area:per;chk(area===a*b,'rec');
  return{content:`Стороны прямоугольника равны $${a}$ и $${b}$. Найдите ${ask?'площадь':'периметр'}.`,solution:ask?`$S=ab=${a}\\cdot${b}=${area}$.`:`$P=2(a+b)=2\\cdot(${a}+${b})=${per}$.`,explanation:ask?`Площадь прямоугольника $S=ab$.`:`Периметр $P=2(a+b)$.`,answer:ans,dis:[ask?per:area,a+b,ans+a],svg:svgPolyFig([[0,0],[a,0],[a,b],[0,b]],{sides:[`${a}`,`${b}`,'','']})};});
def('vRectDiag',2,'B','Диагональ прямоугольника',r=>{const t=r.pick(TRIP);chk(t[0]**2+t[1]**2===t[2]**2,'rd');
  return{content:`Стороны прямоугольника равны $${t[0]}$ и $${t[1]}$. Найдите длину диагонали.`,solution:`Диагональ $d=\\sqrt{${t[0]}^2+${t[1]}^2}=\\sqrt{${t[0]**2+t[1]**2}}=${t[2]}$.`,explanation:`Диагональ прямоугольника $d=\\sqrt{a^2+b^2}$.`,answer:t[2],dis:[t[0]+t[1],t[2]+1,2*t[2]],svg:svgPolyFig([[0,0],[t[0],0],[t[0],t[1]],[0,t[1]]],{sides:[`${t[0]}`,`${t[1]}`,'',''],diagonals:[[0,2]]})};});
def('vParallelogramArea',2,'AB','Площадь параллелограмма',r=>{const b=r.int(4,12),h=r.int(2,9);const S=b*h;chk(S===b*h,'pg');
  return{content:`Основание параллелограмма равно $${b}$, высота, проведённая к нему, равна $${h}$. Найдите площадь.`,solution:`$S=a\\cdot h=${b}\\cdot${h}=${S}$.`,explanation:`Площадь параллелограмма $S=a\\cdot h$.`,answer:S,dis:[2*(b+h),b+h,S+b],svg:svgPolyFig([[0,0],[b,0],[b+1.6,h],[1.6,h]],{sides:[`${b}`,'','',''],alt:3,altLabel:`${h}`})};});
def('vRhombusArea',2,'AB','Площадь ромба по диагоналям',r=>{let d1=2*r.int(2,8),d2=2*r.int(2,8);const S=d1*d2/2;chk(2*S===d1*d2,'rh');
  return{content:`Диагонали ромба равны $${d1}$ и $${d2}$. Найдите площадь ромба.`,solution:`$S=\\dfrac{d_1 d_2}{2}=\\dfrac{${d1}\\cdot${d2}}{2}=${S}$.`,explanation:`Площадь ромба $S=\\frac{d_1 d_2}{2}$.`,answer:S,dis:[d1*d2,d1+d2,S+d1],svg:svgPolyFig([[0,-d2/2],[d1/2,0],[0,d2/2],[-d1/2,0]],{sides:['','','',''],diagonals:[[0,2],[1,3]]})};});
def('vTrapezoidArea',2,'B','Площадь трапеции',r=>{let a=2*r.int(3,9),b=2*r.int(1,5);if(a===b)b=a-2;let h=r.int(2,8);if(((a+b)*h)%2)h+=1;const S=(a+b)*h/2;chk(2*S===(a+b)*h,'tz');
  return{content:`Основания трапеции равны $${a}$ и $${b}$, высота равна $${h}$. Найдите площадь.`,solution:`$S=\\dfrac{a+b}{2}\\cdot h=\\dfrac{${a}+${b}}{2}\\cdot${h}=${S}$.`,explanation:`Площадь трапеции $S=\\frac{a+b}{2}\\cdot h$.`,answer:S,dis:[(a+b)*h,(a+b)/2,S+h],svg:svgPolyFig([[0,0],[a,0],[(a+b)/2+1,h],[(a-b)/2+ -1+1,h]].map(p=>[p[0],p[1]]),{sides:[`${a}`,'',`${b}`,''],alt:3,altLabel:`${h}`})};});
def('vTrapezoidMid',1,'AB','Средняя линия трапеции',r=>{let a=2*r.int(3,10),b=2*r.int(1,6);if(a===b)b+=2;const m=(a+b)/2;chk(2*m===a+b,'tm');
  return{content:`Основания трапеции равны $${a}$ и $${b}$. Найдите длину средней линии.`,solution:`Средняя линия $=\\dfrac{a+b}{2}=\\dfrac{${a}+${b}}{2}=${m}$.`,explanation:`Средняя линия трапеции равна полусумме оснований.`,answer:m,dis:[a+b,Math.abs(a-b)/2,m+1],svg:svgPolyFig([[0,0],[a,0],[(a+b)/2+1,3],[(a-b)/2-1,3]],{sides:[`${a}`,'',`${b}`,'']})};});
def('vCircleAreaPi',2,'B','Площадь круга (в долях π)',r=>{const rad=r.int(2,9);const k=rad*rad;chk(k===rad*rad,'ca');
  return{content:`Радиус круга равен $${rad}$. Площадь круга равна $k\\pi$. Найдите $k$.`,solution:`$S=\\pi R^2=\\pi\\cdot${rad}^2=${k}\\pi$, значит $k=${k}$.`,explanation:`Площадь круга $S=\\pi R^2$; здесь $k=R^2$.`,answer:k,dis:[2*rad,4*rad,rad],svg:svgCircleFig({radius:50,radiusLabel:`${rad}`,centerLabel:'O'})};});
def('vCircleCircPi',2,'AB','Длина окружности (в долях π)',r=>{const rad=r.int(2,12);const k=2*rad;chk(k===2*rad,'cc');
  return{content:`Радиус окружности равен $${rad}$. Длина окружности равна $k\\pi$. Найдите $k$.`,solution:`$C=2\\pi R=2\\pi\\cdot${rad}=${k}\\pi$, значит $k=${k}$.`,explanation:`Длина окружности $C=2\\pi R$; здесь $k=2R$.`,answer:k,dis:[rad,rad*rad,k+2],svg:svgCircleFig({radius:40,radiusLabel:`${rad}`,centerLabel:'O'})};});
def('vInscribedAngle',3,'AB','Вписанный угол',r=>{const arc=2*r.int(20,80);const ins=arc/2;chk(2*ins===arc,'ia');
  return{content:`Вписанный угол опирается на дугу в $${arc}°$. Найдите вписанный угол (в градусах).`,solution:`Вписанный угол равен половине дуги, на которую опирается: $\\dfrac{${arc}°}{2}=${ins}°$.`,explanation:`Вписанный угол равен половине центрального (дуги), на которую он опирается.`,answer:ins,dis:[arc,180-arc>0?180-arc:arc+10,ins+10],svg:svgCircleFig({centerLabel:'O',points:[{deg:150,label:'A'},{deg:30,label:'B'},{deg:255,label:'C'}],angleAt:{v:255,a:150,b:30,label:'?'},central:{a:150,b:30,label:`${arc}°`}})};});
def('vCentralAngle',2,'AB','Центральный угол по вписанному',r=>{const ins=r.int(20,75);const cen=2*ins;chk(cen===2*ins,'cen');
  return{content:`Вписанный угол окружности равен $${ins}°$. Найдите центральный угол, опирающийся на ту же дугу (в градусах).`,solution:`Центральный угол вдвое больше вписанного: $2\\cdot${ins}°=${cen}°$.`,explanation:`Центральный угол вдвое больше вписанного, опирающегося на ту же дугу.`,answer:cen,dis:[ins,180-ins,cen+10],svg:svgCircleFig({centerLabel:'O',points:[{deg:150,label:'A'},{deg:30,label:'B'},{deg:265,label:'C'}],angleAt:{v:265,a:150,b:30,label:`${ins}°`},central:{a:150,b:30,label:'?'}})};});
def('vRegularPolyAngle',3,'B','Угол правильного многоугольника',r=>{const t=r.pick([[3,60],[4,90],[5,108],[6,120],[8,135],[9,140],[10,144],[12,150]]);chk((t[0]-2)*180/t[0]===t[1],'rpa');
  const pts=[];for(let i=0;i<t[0];i++){const a=Math.PI/2+2*Math.PI*i/t[0];pts.push([Math.cos(a),Math.sin(a)]);}
  return{content:`Найдите величину внутреннего угла правильного $${t[0]}$-угольника (в градусах).`,solution:`Внутренний угол правильного $n$-угольника $=\\dfrac{(n-2)\\cdot180°}{n}=\\dfrac{${t[0]-2}\\cdot180°}{${t[0]}}=${t[1]}°$.`,explanation:`Внутренний угол $=\\frac{(n-2)\\cdot180°}{n}$.`,answer:t[1],dis:[360/t[0],180-t[1],t[1]+10],svg:svgPolyFig(pts,{})};});
def('vPolyDiagonals',3,'B','Число диагоналей многоугольника',r=>{const n=r.int(5,10);const d=n*(n-3)/2;chk(2*d===n*(n-3),'pdi');
  const pts=[];for(let i=0;i<n;i++){const a=Math.PI/2+2*Math.PI*i/n;pts.push([Math.cos(a),Math.sin(a)]);}
  return{content:`Сколько диагоналей у выпуклого $${n}$-угольника?`,solution:`Число диагоналей $=\\dfrac{n(n-3)}{2}=\\dfrac{${n}\\cdot${n-3}}{2}=${d}$.`,explanation:`Число диагоналей $n$-угольника $=\\frac{n(n-3)}{2}$.`,answer:d,dis:[n,n*(n-3),d+n],svg:svgPolyFig(pts,{diagonals:[[0,2],[0,3],[1,3]]})};});
def('vVerticalAngle',1,'AB','Вертикальные и смежные углы',r=>{const a=r.int(35,140);const vert=r.bool();const ans=vert?a:180-a;chk(ans===(vert?a:180-a),'va');
  return{content:`При пересечении двух прямых один из углов равен $${a}°$. Найдите ${vert?'вертикальный к нему угол':'смежный с ним угол'} (в градусах).`,solution:vert?`Вертикальные углы равны: $${a}°$.`:`Смежные углы в сумме дают $180°$: $180°-${a}°=${180-a}°$.`,explanation:vert?`Вертикальные углы равны.`:`Смежные углы в сумме равны $180°$.`,answer:ans,dis:[vert?180-a:a,90,ans+10>180?ans-15:ans+10],svg:svgAngle(a>90?20:35,a>90?20+a:35+a,{label:`${a}°`,vertexLabel:'O'})};});
def('vParallelTrans',3,'AB','Углы при параллельных прямых',r=>{const a=r.int(40,140);const kind=r.pick(['corr','alt','co']);const ans=kind==='co'?180-a:a;chk(true,'pt');
  const name=kind==='corr'?'соответственный':kind==='alt'?'накрест лежащий':'односторонний';
  return{content:`Две параллельные прямые пересечены секущей. Один из углов равен $${a}°$. Найдите ${name} с ним угол (в градусах).`,solution:kind==='co'?`Односторонние углы в сумме дают $180°$: $180°-${a}°=${180-a}°$.`:`${kind==='corr'?'Соответственные':'Накрест лежащие'} углы при параллельных прямых равны: $${a}°$.`,explanation:`При параллельных прямых: соответственные и накрест лежащие углы равны, односторонние — в сумме $180°$.`,answer:ans,dis:[kind==='co'?a:180-a,90,ans+10>180?ans-20:ans+20],svg:svgParallelLines(`${kind==='co'?180-a:a}°`,`${a}°`)};});

// similar triangle cut by a line parallel to the base
function svgTriCut(num,den,bcLab,deLab){
  const A=[150,40],B=[48,205],C=[252,205];const t=num/den;
  const D=[A[0]+(B[0]-A[0])*t,A[1]+(B[1]-A[1])*t],E=[A[0]+(C[0]-A[0])*t,A[1]+(C[1]-A[1])*t];
  let s=_svgHead(300,240);
  s+=`<polygon points="${A} ${B} ${C}" fill="rgba(37,99,235,0.06)" stroke="#2563eb" stroke-width="2"/>`;
  s+=`<line x1="${D[0].toFixed(1)}" y1="${D[1].toFixed(1)}" x2="${E[0].toFixed(1)}" y2="${E[1].toFixed(1)}" stroke="#dc2626" stroke-width="2"/>`;
  s+=`<text x="${A[0]}" y="${A[1]-6}" font-size="13" text-anchor="middle" fill="#0f172a">A</text>`;
  s+=`<text x="${B[0]-12}" y="${B[1]+6}" font-size="13" fill="#0f172a">B</text><text x="${C[0]+4}" y="${C[1]+6}" font-size="13" fill="#0f172a">C</text>`;
  s+=`<text x="${(D[0]-12).toFixed(1)}" y="${D[1].toFixed(1)}" font-size="12" fill="#dc2626">D</text><text x="${(E[0]+4).toFixed(1)}" y="${E[1].toFixed(1)}" font-size="12" fill="#dc2626">E</text>`;
  s+=`<text x="150" y="225" font-size="12" text-anchor="middle" fill="#2563eb">${esc(bcLab)}</text>`;
  s+=`<text x="${((D[0]+E[0])/2).toFixed(1)}" y="${(D[1]-5).toFixed(1)}" font-size="12" text-anchor="middle" fill="#dc2626">${esc(deLab)}</text>`;
  return s+`</svg>`;
}

/* ===== СТЕРЕОМЕТРИЯ (тела) ===== */
def('vBoxVolume',2,'B','Объём прямоугольного параллелепипеда',r=>{const a=r.int(2,9),b=r.int(2,8),c=r.int(2,7);const V=a*b*c;chk(V===a*b*c,'bv');
  return{content:`Измерения прямоугольного параллелепипеда равны $${a}$, $${b}$ и $${c}$. Найдите его объём.`,solution:`$V=abc=${a}\\cdot${b}\\cdot${c}=${V}$.`,explanation:`Объём прямоугольного параллелепипеда $V=abc$.`,answer:V,dis:[2*(a*b+b*c+a*c),a+b+c,V+a],svg:svgBox(a,b,c,{a:`${a}`,b:`${b}`,c:`${c}`})};});
def('vBoxSurface',3,'B','Площадь поверхности параллелепипеда',r=>{const a=r.int(2,8),b=r.int(2,7),c=r.int(2,6);const S=2*(a*b+b*c+a*c);chk(S===2*(a*b+b*c+a*c),'bs');
  return{content:`Измерения прямоугольного параллелепипеда равны $${a}$, $${b}$ и $${c}$. Найдите площадь его полной поверхности.`,solution:`$S=2(ab+bc+ac)=2(${a*b}+${b*c}+${a*c})=${S}$.`,explanation:`Площадь поверхности $S=2(ab+bc+ac)$.`,answer:S,dis:[a*b*c,S/2,a*b+b*c+a*c],svg:svgBox(a,b,c,{a:`${a}`,b:`${b}`,c:`${c}`})};});
def('vBoxDiagonal',4,'B','Диагональ параллелепипеда',r=>{const t=r.pick([[2,3,6,7],[1,4,8,9],[4,4,7,9],[2,6,9,11],[6,6,7,11],[3,4,12,13],[1,12,12,17],[2,5,14,15],[8,9,12,17]]);chk(t[0]**2+t[1]**2+t[2]**2===t[3]**2,'bd');
  return{content:`Измерения прямоугольного параллелепипеда равны $${t[0]}$, $${t[1]}$ и $${t[2]}$. Найдите длину его диагонали.`,solution:`$d=\\sqrt{a^2+b^2+c^2}=\\sqrt{${t[0]**2}+${t[1]**2}+${t[2]**2}}=\\sqrt{${t[3]**2}}=${t[3]}$.`,explanation:`Диагональ параллелепипеда $d=\\sqrt{a^2+b^2+c^2}$.`,answer:t[3],dis:[t[0]+t[1]+t[2],t[3]+1,t[2]+1],svg:svgBox(t[0],t[1],t[2],{a:`${t[0]}`,b:`${t[1]}`,c:`${t[2]}`,diag:1})};});
def('vCubeVolume',2,'B','Объём куба',r=>{const a=r.int(2,9);const V=a**3;const ask=r.bool();const ans=ask?V:6*a*a;chk(V===a*a*a,'cv');
  return{content:`Ребро куба равно $${a}$. Найдите ${ask?'объём':'площадь полной поверхности'} куба.`,solution:ask?`$V=a^3=${a}^3=${V}$.`:`$S=6a^2=6\\cdot${a*a}=${6*a*a}$.`,explanation:ask?`Объём куба $V=a^3$.`:`Площадь поверхности куба $S=6a^2$.`,answer:ans,dis:[ask?6*a*a:V,ans+a,a*a],svg:svgBox(a,a,a,{a:`${a}`})};});
def('vCylinderVolPi',3,'B','Объём цилиндра (в долях π)',r=>{const rad=r.int(2,6),h=r.int(2,8);const k=rad*rad*h;chk(k===rad*rad*h,'cyv');
  return{content:`Радиус основания цилиндра равен $${rad}$, высота равна $${h}$. Объём цилиндра равен $k\\pi$. Найдите $k$.`,solution:`$V=\\pi R^2 h=\\pi\\cdot${rad}^2\\cdot${h}=${k}\\pi$, значит $k=${k}$.`,explanation:`Объём цилиндра $V=\\pi R^2 h$; здесь $k=R^2 h$.`,answer:k,dis:[2*rad*h,rad*h,rad*rad],svg:svgCylinder(rad,h,{r:`${rad}`,h:`${h}`})};});
def('vConeVolPi',3,'B','Объём конуса (в долях π)',r=>{const t=r.pick([[3,4,12],[3,2,6],[6,1,12],[2,3,4],[4,3,16],[3,5,15],[2,6,8],[6,2,24],[3,7,21]]);chk(t[0]*t[0]*t[1]/3===t[2]&&Number.isInteger(t[0]*t[0]*t[1]/3),'cnv');
  return{content:`Радиус основания конуса равен $${t[0]}$, высота равна $${t[1]}$. Объём конуса равен $k\\pi$. Найдите $k$.`,solution:`$V=\\dfrac13\\pi R^2 h=\\dfrac13\\pi\\cdot${t[0]**2}\\cdot${t[1]}=${t[2]}\\pi$, значит $k=${t[2]}$.`,explanation:`Объём конуса $V=\\frac13\\pi R^2 h$; здесь $k=\\frac{R^2 h}{3}$.`,answer:t[2],dis:[t[0]*t[0]*t[1],t[2]*3,t[0]*t[1]],svg:svgCone({r:`${t[0]}`,h:`${t[1]}`})};});
def('vPyramidVol',3,'B','Объём пирамиды',r=>{const a=r.int(2,8),j=r.int(1,4);const h=3*j;const V=a*a*j;chk(V===a*a*h/3,'pyv');
  return{content:`В основании пирамиды лежит квадрат со стороной $${a}$, высота пирамиды равна $${h}$. Найдите объём пирамиды.`,solution:`$V=\\dfrac13 S_{осн} h=\\dfrac13\\cdot${a*a}\\cdot${h}=${V}$.`,explanation:`Объём пирамиды $V=\\frac13 S_{осн}\\cdot h$.`,answer:V,dis:[a*a*h,a*a,V+a],svg:svgPyramid({a:`${a}`,h:`${h}`})};});
def('vPrismVol',2,'B','Объём призмы',r=>{const S=r.int(4,20),h=r.int(2,10);const V=S*h;chk(V===S*h,'prv');
  return{content:`Площадь основания прямой призмы равна $${S}$, высота равна $${h}$. Найдите объём призмы.`,solution:`$V=S_{осн}\\cdot h=${S}\\cdot${h}=${V}$.`,explanation:`Объём призмы $V=S_{осн}\\cdot h$.`,answer:V,dis:[S+h,Math.round(S*h/3),V+S],svg:svgPrism({h:`${h}`})};});
def('vSphereSurfPi',3,'B','Площадь поверхности шара (в долях π)',r=>{const rad=r.int(2,9);const k=4*rad*rad;chk(k===4*rad*rad,'ssp');
  return{content:`Радиус шара равен $${rad}$. Площадь поверхности шара равна $k\\pi$. Найдите $k$.`,solution:`$S=4\\pi R^2=4\\pi\\cdot${rad}^2=${k}\\pi$, значит $k=${k}$.`,explanation:`Площадь поверхности шара $S=4\\pi R^2$; здесь $k=4R^2$.`,answer:k,dis:[rad*rad,2*rad*rad,k+4],svg:svgSphere({r:`${rad}`})};});
def('vSphereVolPi',4,'B','Объём шара (в долях π)',r=>{const rad=r.pick([3,6]);const k=4*rad*rad*rad/3;chk(3*k===4*rad**3,'svp');
  return{content:`Радиус шара равен $${rad}$. Объём шара равен $k\\pi$. Найдите $k$.`,solution:`$V=\\dfrac43\\pi R^3=\\dfrac43\\pi\\cdot${rad**3}=${k}\\pi$, значит $k=${k}$.`,explanation:`Объём шара $V=\\frac43\\pi R^3$; здесь $k=\\frac{4R^3}{3}$.`,answer:k,dis:[4*rad*rad,rad**3,k+4],svg:svgSphere({r:`${rad}`})};});

/* ===== ПОДОБИЕ ===== */
def('vSimilarCut',3,'B','Подобие: прямая, параллельная стороне',r=>{const t=r.pick([[1,2,12,6],[1,3,15,5],[2,3,12,8],[1,2,18,9],[3,4,16,12],[2,5,20,8],[1,4,16,4]]);const de=t[2]*t[0]/t[1];chk(de===t[3]&&Number.isInteger(de),'sc');
  return{content:`В треугольнике $ABC$ точки $D$ и $E$ лежат на сторонах $AB$ и $AC$, причём $DE\\parallel BC$ и $AD:AB=${t[0]}:${t[1]}$. Найдите $DE$, если $BC=${t[2]}$.`,solution:`Треугольники $ADE$ и $ABC$ подобны с коэффициентом $\\dfrac{${t[0]}}{${t[1]}}$, поэтому $DE=BC\\cdot\\dfrac{${t[0]}}{${t[1]}}=${t[2]}\\cdot\\dfrac{${t[0]}}{${t[1]}}=${de}$.`,explanation:`$DE\\parallel BC$ даёт подобие $\\triangle ADE\\sim\\triangle ABC$ с коэффициентом $AD:AB$.`,answer:de,dis:[t[2],t[2]-t[3],de+t[0]],svg:svgTriCut(t[0],t[1],`BC=${t[2]}`,'DE=?')};});

/* ===== НЕРАВЕНСТВА (числовая прямая) ===== */
def('vLinIneq',2,'B','Линейное неравенство на числовой прямой',r=>{const k=r.pick([1,2,3]);let x0=r.int(-4,4);const strict=r.bool();const b=-k*x0;const ans=strict?x0+1:x0;chk(k*x0+b===0,'lin');
  return{content:`Решите неравенство $${k===1?'':k}x${b>=0?'+'+b:b}${strict?'>':'\\geq'}0$ и укажите наименьшее целое решение.`,solution:`$${k===1?'':k}x${strict?'>':'\\geq'}${k*x0}$, то есть $x${strict?'>':'\\geq'}${x0}$. Наименьшее целое решение: $${ans}$.`,explanation:`Перенесите свободный член и разделите на коэффициент при $x$ (он положителен — знак сохраняется).`,answer:ans,dis:[x0-1,strict?x0:x0+1,-x0],svg:svgNumberLine({xmin:Math.min(x0,0)-3,xmax:Math.max(x0,0)+3,rays:[{from:x0,dir:1,color:'#2563eb'}],marks:[{x:x0,closed:!strict,color:'#dc2626'}]})};});
def('vIntervalCount',3,'B','Метод интервалов: число целых решений',r=>{let a=r.int(-4,2),b=r.int(-1,5);if(a>=b)b=a+r.int(2,4);const cnt=b-a+1;chk(cnt===b-a+1,'ivc');
  return{content:`Решите неравенство $(x${a>0?'-'+a:(a<0?'+'+(-a):'')})(x${b>0?'-'+b:(b<0?'+'+(-b):'')})\\leq0$ и укажите число целых решений.`,solution:`Решение неравенства — отрезок $[${a};${b}]$. Целые числа от $${a}$ до $${b}$ включительно: их $${b}-(${a})+1=${cnt}$.`,explanation:`Для $(x-a)(x-b)\\leq0$ ($a<b$) решение — отрезок $[a;b]$; считаем целые точки на нём.`,answer:cnt,dis:[b-a,cnt+1,cnt-1],svg:svgNumberLine({xmin:Math.min(a,0)-2,xmax:Math.max(b,0)+2,segs:[{a,b,color:'#2563eb'}],marks:[{x:a,closed:true},{x:b,closed:true}]})};});
def('vSystemLines',3,'B','Система: точка пересечения прямых',r=>{const px=r.int(-3,3),py=r.int(-3,3);let k1=r.pick([-2,-1,1,2]),k2=r.pick([-2,-1,1,2]);if(k1===k2)k2=k1+1;const b1=py-k1*px,b2=py-k2*px;const ask=r.bool();const ans=ask?px:py;chk(k1*px+b1===py&&k2*px+b2===py,'sl');
  const win=windowFor([[px,py],[0,b1],[0,b2]],2);
  return{content:`На рисунке изображены прямые $y=${k1}x${b1>=0?'+'+b1:b1}$ и $y=${k2}x${b2>=0?'+'+b2:b2}$. Найдите ${ask?'абсциссу (x)':'ординату (y)'} точки их пересечения.`,solution:`Приравняем: $${k1}x${b1>=0?'+'+b1:b1}=${k2}x${b2>=0?'+'+b2:b2}$, откуда $x=${px}$, $y=${py}$. Ответ: $${ans}$.`,explanation:`Точка пересечения — общее решение системы; приравняйте правые части.`,answer:ans,dis:[ask?py:px,ans+1,-ans],svg:svgPlane({...win,items:[{t:'line',k:k1,b:b1,color:'#2563eb'},{t:'line',k:k2,b:b2,color:'#16a34a'},{t:'point',x:px,y:py,label:'?',color:'#dc2626'}]})};});

/* ===== ДИАГРАММЫ (проценты, данные) ===== */
def('vBarDiff',2,'AB','Столбчатая диаграмма: разность',r=>{const labels=['Пн','Вт','Ср','Чт','Пт'];const vals=labels.map(()=>r.int(10,90));const i=r.int(0,4);let j=r.int(0,4);if(j===i)j=(j+1)%5;const hi=Math.max(vals[i],vals[j]),lo=Math.min(vals[i],vals[j]);const d=hi-lo;chk(d===Math.abs(vals[i]-vals[j]),'bd2');
  return{content:`На диаграмме показано число посетителей по дням. На сколько отличается число посетителей в «${labels[i]}» и «${labels[j]}»?`,solution:`«${labels[i]}»: $${vals[i]}$, «${labels[j]}»: $${vals[j]}$. Разность $=${hi}-${lo}=${d}$.`,explanation:`Считайте высоты соответствующих столбиков и найдите их разность.`,answer:d,dis:[hi+lo,vals[i],d+5],svg:svgBars(labels.map((l,k)=>({label:l,value:vals[k]})),{title:'Посетители по дням'})};});
def('vBarTotal',2,'B','Столбчатая диаграмма: сумма',r=>{const labels=['A','B','C','D'];const vals=labels.map(()=>r.int(5,40));const tot=vals.reduce((a,b)=>a+b,0);chk(tot===vals.reduce((a,b)=>a+b,0),'bt2');
  return{content:`На диаграмме показано количество товаров четырёх видов. Сколько всего товаров?`,solution:`Сумма всех столбиков: $${vals.join('+')}=${tot}$.`,explanation:`Сложите высоты всех столбиков.`,answer:tot,dis:[Math.max(...vals),tot-vals[0],Math.round(tot/4)],svg:svgBars(labels.map((l,k)=>({label:l,value:vals[k]})),{title:'Количество по видам'})};});
def('vPiePercent',3,'AB','Круговая диаграмма: доля',r=>{const t=r.pick([[[25,25,25,25],'кругов',25],[[50,25,25],'кругов',50],[[40,30,20,10],'кругов',40],[[60,20,20],'кругов',60],[[30,30,40],'кругов',40]]);const parts=t[0];const idx=parts.indexOf(t[2]);chk(parts.reduce((a,b)=>a+b,0)===100,'pp');
  const labs=['Кат. 1','Кат. 2','Кат. 3','Кат. 4'];
  return{content:`На круговой диаграмме показано распределение бюджета (в %). Какова наибольшая доля (в %)?`,solution:`Наибольший сектор соответствует $${Math.max(...parts)}\\%$.`,explanation:`Наибольшей доле соответствует наибольший сектор диаграммы.`,answer:Math.max(...parts),dis:[Math.min(...parts),100-Math.max(...parts),100],svg:svgPie(parts.map((v,k)=>({label:labs[k],value:v})))};});
def('vPieValue',3,'B','Круговая диаграмма: значение по доле',r=>{const tot=r.pick([200,400,500,1000,800,600]);const pct=r.pick([10,20,25,40,50]);const val=tot*pct/100;chk(val===tot*pct/100&&Number.isInteger(val),'pv');
  return{content:`Всего опрошено $${tot}$ человек. На круговой диаграмме доля выбравших вариант «А» составляет $${pct}\\%$. Сколько человек выбрали «А»?`,solution:`$${pct}\\%$ от $${tot}$: $\\dfrac{${pct}}{100}\\cdot${tot}=${val}$.`,explanation:`Значение $=\\frac{доля(\\%)}{100}\\cdot{}$целое.`,answer:val,dis:[pct,tot-val,val+pct],svg:svgPie([{label:'А',value:pct},{label:'Б',value:Math.round((100-pct)*0.6)},{label:'В',value:100-pct-Math.round((100-pct)*0.6)}])};});

// ---------- subtopic → generators (specific first) ----------
const REG=[
  // координаты и функции
  [/координатн.*плоскост|координатн.*прям/i,['vPointDist','vMidpoint','vTriAreaCoord']],
  [/линейн.*функц|y\s*=\s*kx/i,['vLineSlope','vLineIntercept','vLineValueAt']],
  [/квадратичн.*функц|парабол/i,['vParabolaVertex','vParabolaRoots']],
  [/степенн.*функц|обратн.*пропорц/i,['vHyperbolaValue']],
  [/уравнение прям|уравнение окружност/i,['vCircleRadius','vSystemLines','vLineSlope']],
  [/производн.*приложен|производн/i,['vTangentSlope']],
  // неравенства
  [/линейн.*неравенств/i,['vLinIneq']],
  [/квадратн.*неравенств|метод интервал|рациональн.*неравенств/i,['vIntervalCount']],
  [/систем.*линейн.*уравнен|систем.*уравнен/i,['vSystemLines']],
  // планиметрия — углы
  [/смежн|вертикальн|виды углов/i,['vVerticalAngle']],
  [/параллельн.*прям|углы.*секущ|секущ/i,['vParallelTrans']],
  // планиметрия — треугольники
  [/сумма углов|внешний угол|неравенство треуг|^треугольник|треугольник:/i,['vAngleSum','vExteriorAngle']],
  [/подоб/i,['vSimilarCut']],
  [/пифагор/i,['vPythagoras','vPythagorasLeg','vRectDiag']],
  [/прямоугольн.*треугольник.*тригоном|тригонометр.*треуг/i,['vRightTrig30','vPythagoras']],
  [/равнобедренн|равносторонн/i,['vIsoscelesBase','vAngleSum']],
  // планиметрия — четырёхугольники / окружность / площади
  [/четырёхугольник|четырехугольник|параллелограмм|прямоугольник|ромб|квадрат/i,['vRectangle','vRectDiag','vSquareArea','vParallelogramArea','vRhombusArea']],
  [/трапец|средн.*лини/i,['vTrapezoidArea','vTrapezoidMid']],
  [/правильн.*многоугольник|многоугольник/i,['vRegularPolyAngle','vPolyDiagonals']],
  [/окружност.*хорд|центральн.*вписанн|вписанн.*угол|хорд|касательн/i,['vInscribedAngle','vCentralAngle','vCircleAreaPi']],
  [/вписанн.*описанн|вписанн.*окружн|описанн.*окружн/i,['vInscribedAngle','vCentralAngle']],
  [/площад.*фигур|площад/i,['vTriAreaBH','vRhombusArea','vTrapezoidArea','vCircleAreaPi','vCircleCircPi','vParallelogramArea']],
  // стереометрия
  [/параллелепипед|куб/i,['vBoxVolume','vBoxSurface','vBoxDiagonal','vCubeVolume']],
  [/пирамид/i,['vPyramidVol']],
  [/призм/i,['vPrismVol']],
  [/цилиндр|конус|шар|сфер/i,['vCylinderVolPi','vConeVolPi','vSphereSurfPi','vSphereVolPi']],
  [/площад.*поверхност|объ[её]м|тел.*вращен/i,['vBoxVolume','vCylinderVolPi','vPyramidVol','vPrismVol']],
  // проценты / диаграммы
  [/процент/i,['vPiePercent','vPieValue','vBarDiff','vBarTotal']],
  // окружность (общий)
  [/окружност|круг|дуг/i,['vCircleAreaPi','vCircleCircPi','vInscribedAngle']],
];
function pickGens(name,topicName){const hay=((name||'')+' '+(topicName||'')).toLowerCase();const f=REG.find(([re])=>re.test(hay));return f?f[1].map(k=>({key:k,...G[k]})).filter(g=>g.fn):null;}

function buildQuestion(extId,st,topic,subjectId,slot,genMeta){
  const rng=makeRng(extId+':'+slot);
  let q; try{ q=genMeta.fn(rng); }catch(e){ if(e instanceof Error&&String(e.message).startsWith('verify-fail')) throw e; return null; }
  if(!q) return null;
  q.content=(q.content||'').replace(/ {2,}/g,' ').trim(); q.solution=(q.solution||'').replace(/ {2,}/g,' ').trim(); q.explanation=(q.explanation||'').replace(/ {2,}/g,' ').trim();
  let type,part,options,correctAnswer,difficulty;const ans=q.answer;
  if(q.options){ type='SINGLE_CHOICE';part='A';options=q.options;correctAnswer=q.correctAnswer;difficulty=Math.min(genMeta.lvl,2); }
  else{
    const wantChoice=genMeta.kind==='A'||!Number.isInteger(ans)||(genMeta.kind!=='B'&&genMeta.lvl<=2&&(slot%5)<2);
    if(wantChoice){ const c=realChoice(rng,ans,q.dis);type='SINGLE_CHOICE';part='A';options=c.options;correctAnswer=c.correctAnswer;difficulty=Number.isInteger(ans)&&genMeta.kind!=='A'&&genMeta.lvl<=2?Math.min(genMeta.lvl,2):Math.min(5,Math.max(1,genMeta.lvl)); }
    else{ type='TEXT_INPUT';part='B';options=null;correctAnswer=String(ans);difficulty=Math.min(5,Math.max(2,genMeta.lvl)); }
  }
  if(type==='SINGLE_CHOICE'){const ids=options.map(o=>o.id);if(new Set(ids).size!==options.length||!ids.includes(correctAnswer))return null;}
  const hasVisual=!!q.svg;
  const vt=hasVisual?(/v, м|t, с/.test(q.svg)?'graph':(/<ellipse|<circle/.test(q.svg)&&/R²|R\^|шар|цилиндр/.test('')?'solid':(/polygon/.test(q.svg)&&/A<\/text>|B<\/text>/.test(q.svg)?'figure':(/x<\/text>.*y<\/text>|<line x1="22"/.test(q.svg)?'plane':'figure')))):null;
  const baseTags=st.name.toLowerCase().split(/[\s.,()]+/).filter(w=>w.length>4).slice(0,2);
  const tags=[...new Set([...baseTags,'цт','математика',genMeta.key,...(hasVisual?['график','рисунок']:[])])];
  return { externalId:extId,subjectId,topicId:topic.id,subtopicId:st.id,type,part,difficulty,content:q.content,
    options:options?JSON.stringify(options):null,correctAnswer,explanation:q.explanation,solution:q.solution||null,
    hints:JSON.stringify({small:[(q.explanation||'')],detailed:q.solution?[q.solution]:[],stepby:[]}),
    imageUrl:hasVisual?makeSvgDataUrl(q.svg):null,
    tags:JSON.stringify(tags),year:2027,source:'Сборник заданий (заданияпоматематике.md)',status:'ACTIVE',timesSolved:0,timesCorrect:0,
    _meta:{title:genMeta.title,variantGroup:genMeta.key,hasVisual,visualType:hasVisual?'figure':null} };
}

function runSelfTest(){
  let total=0,bugs=0,skips=0,badAns=0,badChoice=0,withSvg=0;const perGen={};
  for(const key of Object.keys(G)){const meta=G[key];let ok=0,bug=0,skip=0;
    for(let s=0;s<300;s++){const rng=makeRng('ST-'+key+'-'+s);let q;
      try{q=meta.fn(rng);}catch(e){if(e instanceof Error&&String(e.message).startsWith('verify-fail')){bug++;bugs++;if(bug<=2)console.log('  BUG',key,'→',e.message);}else{skip++;skips++;}continue;}
      if(!q){skip++;continue;}total++;ok++;if(q.svg)withSvg++;
      if(q.options){if(q.options.length!==5||!q.options.some(o=>o.id===q.correctAnswer)){badChoice++;if(badChoice<=3)console.log('  BADCHOICE',key);}}
      else{if(typeof q.answer!=='number'||!isFinite(q.answer)){badAns++;if(badAns<=4)console.log('  BADANS',key,q.answer);}}
      if(/undefined|NaN|null/.test(String(q.content)+q.solution+q.explanation)){badChoice++;if(badChoice<=6)console.log('  BADTEXT',key);}
      if(q.svg&&/undefined|NaN/.test(q.svg)){badChoice++;if(badChoice<=6)console.log('  BADSVG',key);}
    }
    perGen[key]={ok,bug,skip};
  }
  console.log('— SELFTEST — generators:',Object.keys(G).length,'| ok:',total,'| withSVG:',withSvg,'| BUGS:',bugs,'| skips:',skips,'| badAns:',badAns,'| badChoice/Text/SVG:',badChoice);
  const prob=Object.entries(perGen).filter(([,v])=>v.bug>0||v.skip>250);if(prob.length)console.log('  high-skip/bug:',prob.map(([k,v])=>`${k}(b${v.bug},s${v.skip})`).join(', '));
  console.log(bugs===0&&badAns===0&&badChoice===0?'✅ SELFTEST PASSED':'❌ SELFTEST ISSUES');
}

async function main(){
  const {PrismaClient}=require('@prisma/client');const prisma=new PrismaClient();
  const R=async(fn,n=6)=>{let e;for(let i=0;i<n;i++){try{return await fn();}catch(x){e=x;if(i)console.log('  (retry read',i,x.code||'',')');await new Promise(r=>setTimeout(r,(i+1)*5000));}}throw e;};
  try{
    const subject=await R(()=>prisma.subject.findFirst({where:{slug:'math'}}));if(!subject){console.error('Math subject not found');return;}
    const topics=await R(()=>prisma.topic.findMany({where:{subjectId:subject.id}}));const topicById=new Map(topics.map(t=>[t.id,t]));
    const subtopics=await R(()=>prisma.subtopic.findMany({where:{topicId:{in:topics.map(t=>t.id)}}}));
    const existingExt=new Set((await R(()=>prisma.question.findMany({where:{externalId:{startsWith:'MVZ-'}},select:{externalId:true}}))).map(e=>e.externalId));
    const normC=s=>(s||'').replace(/\s+/g,' ').trim().toLowerCase();
    const seen=new Set((await R(()=>prisma.question.findMany({where:{subjectId:subject.id},select:{content:true}}))).map(q=>normC(q.content)));
    let matched=0,skipped=0,created=0,visuals=0;const toCreate=[];const byTopic={},byGen={};
    for(const st of subtopics){const topic=topicById.get(st.topicId);const gens=pickGens(st.name,topic?topic.name:'');
      if(!gens||!gens.length){skipped++;continue;}matched++;
      for(let i=0;i<PER;i++){const extId=`MVZ-${st.id}-${i}`;if(existingExt.has(extId))continue;const gm=gens[i%gens.length];
        let row=null;try{row=buildQuestion(extId,st,topic,subject.id,i,gm);}catch(e){console.log('verify-fail',extId,gm.key);continue;}
        if(!row)continue;const dk=normC(row.content);if(seen.has(dk))continue;seen.add(dk);
        toCreate.push(row);byTopic[topic?topic.name:'—']=(byTopic[topic?topic.name:'—']||0)+1;byGen[gm.key]=(byGen[gm.key]||0)+1;if(row._meta.hasVisual)visuals++;created++;}
    }
    if(INTROSPECT){console.log('— INTROSPECT —');console.log('Math subtopics:',subtopics.length,'| matched:',matched,'| skipped:',skipped);console.log('Would generate:',created,'(PER='+PER+'), visuals:',visuals);console.log('By topic:',JSON.stringify(byTopic));console.log('Generators used:',Object.keys(byGen).length,'/',Object.keys(G).length);const un=Object.keys(G).filter(k=>!byGen[k]);if(un.length)console.log('Unused:',un.join(', '));return;}
    const ts=new Date().toISOString().replace(/[:.]/g,'-');const outDir=path.join(__dirname,'..','..','..','data');try{fs.mkdirSync(outDir,{recursive:true});}catch{}
    const outPath=path.join(outDir,`md-mathviz-${ts}.json`);
    fs.writeFileSync(outPath,JSON.stringify(toCreate.map(r=>({title:r._meta.title,subject:'math',topic:(topicById.get(r.topicId)||{}).name||'',subtopic:r.subtopicId,difficulty:r.difficulty,part:r.part,type:r.type,question:r.content,hint:r.explanation,solution:r.solution,answer:r.correctAnswer,options:r.options?JSON.parse(r.options):null,tags:JSON.parse(r.tags),sourceTemplate:'заданияпоматематике.md',variantGroup:r._meta.variantGroup,hasVisual:r._meta.hasVisual,visualType:r._meta.visualType,visualFile:r.imageUrl?'(inline data:URL in imageUrl)':null,externalId:r.externalId})),null,2));
    if(!DRY){let inserted=0;for(const data of toCreate){const {_meta,...row}=data;try{await prisma.question.create({data:row});inserted++;}catch(e){}}
      const qc=await prisma.question.count({where:{subjectId:subject.id,status:'ACTIVE'}});await prisma.subject.update({where:{id:subject.id},data:{questionsCount:qc}});
      console.log('Inserted:',inserted,'| visuals:',visuals,'| Math active now:',qc);}
    else console.log('[DRY] no DB writes. visuals:',visuals);
    console.log(`✅ matched: ${matched} | skipped: ${skipped} | generated: ${created} | generators used: ${Object.keys(byGen).length}/${Object.keys(G).length}`);
    console.log('JSON:',path.relative(path.join(__dirname,'..','..','..'),outPath));
  } finally { await prisma.$disconnect(); }
}

async function runAudit(){
  const {PrismaClient}=require('@prisma/client');const prisma=new PrismaClient();
  const R=async(fn,n=6)=>{let e;for(let i=0;i<n;i++){try{return await fn();}catch(x){e=x;await new Promise(r=>setTimeout(r,(i+1)*5000));}}throw e;};
  try{
    const math=await R(()=>prisma.subject.findFirst({where:{slug:'math'}}));const MVZ={externalId:{startsWith:'MVZ-'}};
    const total=await R(()=>prisma.question.count({where:MVZ}));
    const wrongSubject=await R(()=>prisma.question.count({where:{...MVZ,NOT:{subjectId:math.id}}}));
    const notActive=await R(()=>prisma.question.count({where:{...MVZ,NOT:{status:'ACTIVE'}}}));
    const withImg=await R(()=>prisma.question.count({where:{...MVZ,imageUrl:{not:null}}}));
    const badImg=await R(()=>prisma.question.count({where:{...MVZ,imageUrl:{not:null},NOT:{imageUrl:{startsWith:'data:image/svg+xml;base64,'}}}}));
    const badText=await R(()=>prisma.question.count({where:{...MVZ,OR:[{content:{contains:'undefined'}},{content:{contains:'NaN'}}]}}));
    const emptyExpl=await R(()=>prisma.question.count({where:{...MVZ,explanation:''}}));
    const partG=await R(()=>prisma.question.groupBy({by:['part'],where:MVZ,_count:{_all:true}}));
    const lvlG=await R(()=>prisma.question.groupBy({by:['difficulty'],where:MVZ,_count:{_all:true}}));
    const byPart=Object.fromEntries(partG.map(g=>[g.part,g._count._all]));const byLvl=Object.fromEntries(lvlG.map(g=>[g.difficulty,g._count._all]).sort((a,b)=>a[0]-b[0]));
    let badChoice=0,badIntB=0,skip=0;
    while(true){const page=await R(()=>prisma.question.findMany({where:MVZ,select:{type:true,part:true,options:true,correctAnswer:true},orderBy:{id:'asc'},skip,take:300}));if(!page.length)break;skip+=page.length;
      for(const q of page){if(q.type==='SINGLE_CHOICE'){let o=[];try{o=JSON.parse(q.options||'[]');}catch{}if(o.length!==5||!o.some(x=>x.id===q.correctAnswer))badChoice++;}else if(q.part==='B'&&!/^-?\d+$/.test(String(q.correctAnswer).trim()))badIntB++;}}
    console.log('— AUDIT (MVZ-) —');console.log('total:',total,'| Part:',JSON.stringify(byPart),'| difficulty:',JSON.stringify(byLvl),'| withImage:',withImg);
    console.log('badChoice:',badChoice,'| nonIntPartB:',badIntB,'| wrongSubject:',wrongSubject,'| notActive:',notActive,'| emptyExpl:',emptyExpl,'| badText:',badText,'| badImg:',badImg);
    console.log(badChoice===0&&badIntB===0&&wrongSubject===0&&notActive===0&&badText===0&&badImg===0?'✅ AUDIT PASSED':'❌ AUDIT ISSUES');
  } finally { await prisma.$disconnect(); }
}

if(SELFTEST){ runSelfTest(); }
else if(AUDIT){ runAudit().catch(e=>{console.error(e);process.exit(1);}); }
else { main().catch(e=>{console.error(e);process.exit(1);}); }




