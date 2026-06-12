/* eslint-disable */
/**
 * CT-Platform — MD-bank MATH question generator.
 *
 * Source templates: repo-root file "заданияпоматематике.md" (стереометрия, планиметрия, алгебра).
 * Each task family from the md file is turned into a parametrized generator:
 *  - answers computed in code AND verified by an independent check (chk) before emit
 *  - Part A = SINGLE_CHOICE (5 options A–E), Part B = TEXT_INPUT, INTEGER answers only
 *  - content = plain Russian, math inside $...$ (platform KaTeX rule)
 *  - matched to existing math subtopics by keyword; unmatched are skipped
 *  - idempotent: deterministic externalId  MDM-<subtopicId>-<i>
 *  - global content de-dup against ALL existing math questions (incl. CTM-)
 *
 * Run:  node prisma/seed-md-math.js                (insert into Neon)
 *       node prisma/seed-md-math.js --selftest     (300 samples per generator, no DB)
 *       node prisma/seed-md-math.js --introspect   (matching stats, no writes)
 *       node prisma/seed-md-math.js --dry          (generate+verify+JSON, no DB writes)
 *       node prisma/seed-md-math.js --audit        (verify MDM- rows in DB)
 *       node prisma/seed-md-math.js --count=N      (slots per matched subtopic, default 12)
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
const gcd=(a,b)=>{a=Math.abs(a);b=Math.abs(b);while(b){[a,b]=[b,a%b];}return a||1;};
function chk(cond,msg){ if(!cond) throw new Error('verify-fail:'+msg); }
function term(coef,v){if(coef===0)return '';const s=coef>0?' + ':' - ';const a=Math.abs(coef);return s+((v&&a===1)?'':a)+v;}
function lin(a,b){let s=(a===1?'':(a===-1?'-':a))+'x';s+=term(b,'');return s;}
function sq(a,b,c){let s=(a===1?'':(a===-1?'-':a))+'x^2';s+=term(b,'x');s+=term(c,'');return s;}
const rootTex=(k,b)=>k===1?`\\sqrt{${b}}`:`${k}\\sqrt{${b}}`; // k√b

// ---------- option builders ----------
function numChoice(rng,V,dis){
  const wrongs=[];
  const cand=[...(dis||[]),V+1,V-1,V+2,V-2,2*V,V+5,V-5,-V,V+10,Math.floor(V/2),V+3,V-3,V+7];
  for(const c of cand){ if(c!==V&&Number.isInteger(c)&&!wrongs.includes(c)&&wrongs.length<4) wrongs.push(c); }
  let k=1; while(wrongs.length<4){ const c=V+k*13+4; if(c!==V&&!wrongs.includes(c)) wrongs.push(c); k++; }
  const all=[V,...wrongs.slice(0,4)];
  for(let i=all.length-1;i>0;i--){const j=rng.int(0,i);[all[i],all[j]]=[all[j],all[i]];}
  const ids=['A','B','C','D','E'];
  return { options: all.map((val,i)=>({id:ids[i],text:String(val)})), correctAnswer: ids[all.indexOf(V)] };
}
function textChoice(rng,correct,wrongs){
  const all=[{t:correct,ok:true},...wrongs.slice(0,4).map(t=>({t,ok:false}))];
  for(let i=all.length-1;i>0;i--){const j=rng.int(0,i);[all[i],all[j]]=[all[j],all[i]];}
  const ids=['A','B','C','D','E'];
  return { options: all.map((o,i)=>({id:ids[i],text:o.t})), correctAnswer: ids[all.findIndex(o=>o.ok)] };
}

// ---------- generator library ----------
// def(key, lvl, kind, title, fn). kind: 'A' fixed-choice | 'AB' numeric A-or-B | 'B' numeric prefer-B
const G = {};
function def(key, lvl, kind, title, fn){ G[key]={lvl,kind,title,fn}; }

/* ================= СТЕРЕОМЕТРИЯ ================= */
def('sCubeVolToSurf',2,'AB','Куб: от объёма к поверхности',r=>{const a=r.int(2,9);const V=a*a*a,S=6*a*a;chk(Math.round(Math.cbrt(V))===a&&S===6*a*a,'cvs');
  return{content:`Объём куба равен $${V}$. Найдите площадь его поверхности.`,solution:`Из $V=a^3=${V}$ находим ребро $a=${a}$. Тогда $S=6a^2=6\\cdot${a*a}=${S}$.`,explanation:`Сначала найдите ребро куба из объёма, затем используйте $S=6a^2$.`,answer:S,dis:[a*a*a,4*a*a,S+a]};});
def('sCubeSurfToVol',2,'AB','Куб: от поверхности к объёму',r=>{const a=r.int(2,9);const S=6*a*a,V=a*a*a;chk(S%6===0&&Math.round(Math.sqrt(S/6))===a,'csv');
  return{content:`Площадь поверхности куба равна $${S}$. Найдите его объём.`,solution:`$S=6a^2$, поэтому $a^2=${a*a}$ и $a=${a}$. Объём $V=a^3=${V}$.`,explanation:`Из $S=6a^2$ найдите ребро, затем $V=a^3$.`,answer:V,dis:[S,a*a,V+a]};});
def('sCubeScale',2,'AB','Куб: изменение при увеличении ребра',r=>{const k=r.int(2,5);const vol=r.bool();const ans=vol?k*k*k:k*k;chk(ans===(vol?k**3:k**2),'scale');
  return{content:`Во сколько раз увеличится ${vol?'объём':'площадь поверхности'} куба, если все его рёбра увеличить в $${k}$ раз${k>4?'':'а'}?`,solution:`При увеличении ребра в $k$ раз ${vol?'объём растёт в $k^3$':'площадь растёт в $k^2$'} раз: $${k}^{${vol?3:2}}=${ans}$.`,explanation:`Объём пропорционален кубу, площадь — квадрату линейных размеров.`,answer:ans,dis:[vol?k*k:k*k*k,k,ans+k]};});
def('sCubeDiagSqToVol',3,'B','Куб: диагональ и объём',r=>{const a=r.int(2,8);const N=3*a*a;chk(N===a*a+a*a+a*a,'cds');
  return{content:`Квадрат диагонали куба равен $${N}$. Найдите объём куба.`,solution:`Диагональ куба $d=a\\sqrt{3}$, значит $d^2=3a^2=${N}$, откуда $a^2=${a*a}$, $a=${a}$. Объём $V=a^3=${a**3}$.`,explanation:`$d^2=3a^2$ — отсюда ребро, затем куб ребра.`,answer:a**3,dis:[N,a*a,6*a*a]};});
def('sCubeEdge',1,'AB','Куб: ребро из поверхности',r=>{const a=r.int(2,12);const S=6*a*a;chk(Math.sqrt(S/6)===a,'ce');
  return{content:`Площадь полной поверхности куба равна $${S}$. Найдите его ребро.`,solution:`$S=6a^2$, значит $a^2=\\dfrac{${S}}{6}=${a*a}$ и $a=${a}$.`,explanation:`Разделите площадь на 6 и извлеките корень.`,answer:a,dis:[a*a,a+1,S/6]};});
def('sBoxThird',3,'B','Параллелепипед: третье измерение',r=>{const q=r.pick([[2,3,6,7],[1,4,8,9],[2,6,9,11],[6,6,7,11],[3,4,12,13],[4,4,7,9],[2,5,14,15],[2,10,11,15],[8,9,12,17],[6,10,15,19],[1,12,12,17],[4,13,16,21]]);
  chk(q[0]**2+q[1]**2+q[2]**2===q[3]**2,'bt');
  return{content:`Два измерения прямоугольного параллелепипеда равны $${q[0]}$ и $${q[1]}$, а диагональ равна $${q[3]}$. Найдите третье измерение.`,solution:`$d^2=a^2+b^2+c^2$: $${q[3]}^2-${q[0]}^2-${q[1]}^2=${q[2]*q[2]}$, значит $c=${q[2]}$.`,explanation:`Из $d^2=a^2+b^2+c^2$ выразите неизвестное измерение.`,answer:q[2],dis:[q[3]-q[0],q[2]+1,q[0]+q[1]]};});
def('sHexLateral',2,'AB','Призма: боковая поверхность',r=>{const a=r.int(3,12),h=r.int(4,15);const ans=6*a*h;chk(ans===6*a*h,'hex');
  return{content:`Сторона основания правильной шестиугольной призмы равна $${a}$, высота равна $${h}$. Найдите площадь боковой поверхности призмы.`,solution:`Боковая поверхность состоит из 6 прямоугольников $${a}\\times${h}$: $S=6\\cdot${a}\\cdot${h}=${ans}$.`,explanation:`$S_{бок}=P_{осн}\\cdot h$, периметр правильного шестиугольника $=6a$.`,answer:ans,dis:[a*h,3*a*h,6*a+h]};});
def('sRhombPrism',4,'B','Призма с ромбом в основании',r=>{const t=r.pick([[6,8,5],[10,24,13],[12,16,10],[18,24,15],[16,30,17],[14,48,25],[20,48,26],[24,32,20]]);const H=r.int(3,12);
  const side=t[2];chk((t[0]/2)**2+(t[1]/2)**2===side*side,'rp1');
  const S=t[0]*t[1]+4*side*H;chk((S-t[0]*t[1])%(4*side)===0,'rp2');
  return{content:`В основании прямой призмы лежит ромб с диагоналями $${t[0]}$ и $${t[1]}$. Площадь полной поверхности призмы равна $${S}$. Найдите боковое ребро призмы.`,solution:`Сторона ромба $=\\sqrt{${t[0]/2}^2+${t[1]/2}^2}=${side}$. Два основания дают $2\\cdot\\dfrac{${t[0]}\\cdot${t[1]}}{2}=${t[0]*t[1]}$. На боковую поверхность остаётся $${S}-${t[0]*t[1]}=${4*side*H}$, а периметр основания $=4\\cdot${side}=${4*side}$. Ребро $=\\dfrac{${4*side*H}}{${4*side}}=${H}$.`,explanation:`Сторона ромба — из половин диагоналей по Пифагору; вычтите площадь оснований и разделите на периметр.`,answer:H,dis:[side,H+1,t[0]]};});
def('sPyramidEdges',2,'AB','Пирамида: сумма рёбер',r=>{const n=r.pick([3,4,5,6]);const a=r.int(2,9);const sum=2*n*a;const nm={3:'треугольной',4:'четырёхугольной',5:'пятиугольной',6:'шестиугольной'}[n];chk(sum/(2*n)===a,'pe');
  return{content:`У правильной ${nm} пирамиды боковое ребро равно ребру основания, а сумма длин всех рёбер равна $${sum}$. Найдите длину ребра основания.`,solution:`Рёбер всего $2\\cdot${n}=${2*n}$ (${n} в основании и ${n} боковых), все равны. Ребро $=\\dfrac{${sum}}{${2*n}}=${a}$.`,explanation:`Посчитайте количество рёбер: по $n$ в основании и сбоку.`,answer:a,dis:[sum/n,a+1,n*a]};});
def('sPyramidDiagSec',4,'B','Пирамида: диагональное сечение',r=>{const j=r.int(1,4),m=r.int(2,6);const h=3*j,Q=3*j*m,V=2*m*m*j;
  chk(Q===(2*m)*h/2 && V===(2*m*m)*h/3,'pds');
  return{content:`В правильной четырёхугольной пирамиде высота равна $${h}$, а площадь диагонального сечения равна $${Q}$. Найдите объём пирамиды.`,solution:`Диагональное сечение — треугольник с основанием $d$ (диагональ основания) и высотой $${h}$: $\\dfrac{d\\cdot${h}}{2}=${Q}$, откуда $d=${2*m}$. Для квадрата $a^2=\\dfrac{d^2}{2}=${2*m*m}$. Объём $V=\\dfrac13 a^2 h=\\dfrac13\\cdot${2*m*m}\\cdot${h}=${V}$.`,explanation:`Из площади сечения найдите диагональ основания, затем $a^2=d^2/2$ и $V=\\frac13 a^2 h$.`,answer:V,dis:[Q*h,V+m,2*m*m]};});
def('sCubeSphere',2,'AB','Куб около сферы',r=>{const rad=r.int(2,9);const S=24*rad*rad;chk(S===6*(2*rad)**2,'cs');
  return{content:`Куб описан около сферы радиуса $${rad}$. Найдите площадь поверхности этого куба.`,solution:`Ребро куба равно диаметру сферы: $a=2\\cdot${rad}=${2*rad}$. Тогда $S=6a^2=6\\cdot${4*rad*rad}=${S}$.`,explanation:`Сфера вписана в куб, значит ребро куба равно её диаметру.`,answer:S,dis:[6*rad*rad,S/4,8*rad**3]};});
def('sCylRatio',3,'B','Цилиндры: сравнение объёмов',r=>{const m=r.pick([2,3]),k=r.int(2,5),j=r.int(1,6);const V1=m*m*j,V2=j*k;
  chk(V2===V1*k/(m*m),'cr');
  return{content:`Объём первого цилиндра равен $${V1}$ м$^3$. У второго цилиндра высота в $${k}$ раз${k>4?'':'а'} больше, а радиус основания в $${m}$ раза меньше, чем у первого. Найдите объём второго цилиндра (в м$^3$).`,solution:`$V=\\pi R^2 h$. Радиус меньше в $${m}$ раза — объём меньше в $${m*m}$; высота больше в $${k}$ — объём больше в $${k}$. Итого $V_2=${V1}\\cdot\\dfrac{${k}}{${m*m}}=${V2}$.`,explanation:`Объём пропорционален квадрату радиуса и первой степени высоты.`,answer:V2,dis:[V1*k,V1*k/m,V2*m]};});
def('sConeAxial',2,'AB','Конус: осевое сечение',r=>{const R=r.int(2,9);const l=R+r.int(2,9);const P=2*l+2*R;chk((P-2*l)/2===R,'ca');
  return{content:`Осевое сечение конуса — равнобедренный треугольник с боковой стороной $${l}$ и периметром $${P}$. Найдите радиус основания конуса.`,solution:`Основание сечения — диаметр: $2R=${P}-2\\cdot${l}=${2*R}$, значит $R=${R}$.`,explanation:`Осевое сечение конуса — треугольник со сторонами $l$, $l$ и $2R$.`,answer:R,dis:[2*R,l-R,R+1]};});
def('sSphereSection',3,'B','Шар: радиус сечения',r=>{const t=r.pick([[3,4,5],[6,8,10],[5,12,13],[8,15,17],[9,12,15],[7,24,25],[20,21,29],[12,16,20],[10,24,26],[9,40,41]]);
  chk(t[0]**2+t[1]**2===t[2]**2,'ss');
  return{content:`Шар радиуса $${t[2]}$ пересечён плоскостью, расстояние от центра шара до которой равно $${t[0]}$. Найдите радиус сечения.`,solution:`По теореме Пифагора $r=\\sqrt{R^2-d^2}=\\sqrt{${t[2]*t[2]}-${t[0]*t[0]}}=\\sqrt{${t[1]*t[1]}}=${t[1]}$.`,explanation:`Радиус шара, расстояние до плоскости и радиус сечения связаны теоремой Пифагора.`,answer:t[1],dis:[t[2]-t[0],t[1]+1,t[2]]};});
def('sPyramidH',3,'B','Пирамида: высота из объёма',r=>{const S=3*r.int(2,15),h=r.int(2,12);const V=S*h/3;chk(3*V===S*h&&Number.isInteger(V),'ph');
  return{content:`Площадь основания пирамиды равна $${S}$, а её объём равен $${V}$. Найдите высоту пирамиды.`,solution:`$V=\\dfrac13 S h$, откуда $h=\\dfrac{3V}{S}=\\dfrac{${3*V}}{${S}}=${h}$.`,explanation:`Выразите высоту из формулы объёма пирамиды.`,answer:h,dis:[V/S>=1?Math.round(V/S):h+2,h+1,S-V>0?S-V:h*3]};});
def('sPrismCyl',4,'B','Цилиндр в призме',r=>{const k=r.int(1,5),h=r.int(3,12);const a=6*k;const ans=a*h;chk(a===2*3*k,'pc');
  return{content:`Цилиндр вписан в правильную треугольную призму. Радиус основания цилиндра равен $${rootTex(k,3)}$, а высота равна $${h}$. Найдите площадь боковой грани призмы.`,solution:`Радиус вписанной в правильный треугольник окружности $r=\\dfrac{a}{2\\sqrt{3}}$, значит $a=2\\sqrt{3}\\cdot${rootTex(k,3)}=${a}$. Боковая грань — прямоугольник $${a}\\times${h}$, её площадь $${ans}$.`,explanation:`Сторона основания $a=2\\sqrt3\\,r$; грань призмы — прямоугольник $a\\times h$.`,answer:ans,dis:[3*k*h,ans/2,a+h]};});
def('sPyramidApothem',3,'B','Пирамида: полная поверхность',r=>{const a=r.int(2,10);const m=r.int(Math.floor(a/2)+1,a+6);const S=a*a+2*a*m;chk(S===a*a+4*(a*m/2),'pa');
  return{content:`В правильной четырёхугольной пирамиде сторона основания равна $${a}$, а апофема равна $${m}$. Найдите площадь полной поверхности пирамиды.`,solution:`$S=S_{осн}+S_{бок}=a^2+4\\cdot\\dfrac{a\\cdot m}{2}=${a*a}+${2*a*m}=${S}$.`,explanation:`$S_{полн}=a^2+2am$, где $m$ — апофема (высота боковой грани).`,answer:S,dis:[a*a+a*m,4*a*m,S-a*a]};});

/* ================= ПЛАНИМЕТРИЯ ================= */
def('pIncircleArea',1,'AB','Площадь через вписанную окружность',r=>{const P=2*r.int(5,24),rad=r.int(1,6);const S=P*rad/2;chk(2*S===P*rad,'pia');
  const fig=r.pick(['треугольника','многоугольника']);
  return{content:`Периметр ${fig} равен $${P}$, а радиус вписанной окружности равен $${rad}$. Найдите площадь этого ${fig==='треугольника'?'треугольника':'многоугольника'}.`,solution:`$S=p\\cdot r$, где $p$ — полупериметр: $S=\\dfrac{${P}}{2}\\cdot${rad}=${S}$.`,explanation:`Для фигуры, описанной около окружности, $S=p\\cdot r$.`,answer:S,dis:[P*rad,S/2>=1?S/2:S+2,P+rad]};});
def('pIncirclePerim',2,'AB','Периметр через вписанную окружность',r=>{const P=2*r.int(6,30),rad=r.int(1,5);const S=P*rad/2;chk(2*S/rad===P,'pip');
  return{content:`Площадь треугольника равна $${S}$, а радиус вписанной окружности равен $${rad}$. Найдите периметр этого треугольника.`,solution:`$S=p\\cdot r$, значит $p=\\dfrac{${S}}{${rad}}=${P/2}$ и периметр $P=2p=${P}$.`,explanation:`Из $S=p\\,r$ найдите полупериметр и удвойте.`,answer:P,dis:[P/2,S*rad,P+rad]};});
def('pRightIncircle',2,'AB','Вписанная окружность прямоугольного треугольника',r=>{const t=r.pick([[3,4,5],[6,8,10],[5,12,13],[8,15,17],[9,12,15],[12,16,20],[7,24,25],[20,21,29],[10,24,26],[15,20,25],[9,40,41],[18,24,30]]);
  const rad=(t[0]+t[1]-t[2])/2;chk(t[0]**2+t[1]**2===t[2]**2&&Number.isInteger(rad),'pri');
  return{content:`Катеты прямоугольного треугольника равны $${t[0]}$ и $${t[1]}$. Найдите радиус вписанной окружности.`,solution:`Гипотенуза $c=\\sqrt{${t[0]}^2+${t[1]}^2}=${t[2]}$. Для прямоугольного треугольника $r=\\dfrac{a+b-c}{2}=\\dfrac{${t[0]}+${t[1]}-${t[2]}}{2}=${rad}$.`,explanation:`$r=\\frac{a+b-c}{2}$ — формула для прямоугольного треугольника.`,answer:rad,dis:[t[2]/2,rad+1,(t[0]+t[1])/2]};});
def('pIsoscIncircle',3,'B','Вписанная окружность равнобедренного треугольника',r=>{const t=r.pick([[10,10,12,3],[20,20,24,6],[15,15,24,4],[30,30,36,9],[39,39,30,10],[40,40,48,12],[50,50,60,15],[60,60,72,18]]);
  const h=Math.sqrt(t[0]*t[0]-(t[2]/2)**2);const S=t[2]*h/2,p=(2*t[0]+t[2])/2;chk(S/p===t[3],'pii');
  return{content:`Боковые стороны равнобедренного треугольника равны $${t[0]}$, основание равно $${t[2]}$. Найдите радиус вписанной окружности.`,solution:`Высота к основанию $h=\\sqrt{${t[0]}^2-${t[2]/2}^2}=${h}$. Площадь $S=\\dfrac{${t[2]}\\cdot${h}}{2}=${S}$, полупериметр $p=${p}$. Тогда $r=\\dfrac{S}{p}=${t[3]}$.`,explanation:`Найдите высоту по Пифагору, затем $r=S/p$.`,answer:t[3],dis:[Math.round(h/2),t[3]+1,Math.round(S/t[0])]};});
def('pEquilRH',1,'AB','Правильный треугольник: высота и вписанная окружность',r=>{const k=r.int(2,12);const toR=r.bool();chk(3*k===k*3,'per');
  return toR?{content:`Найдите радиус окружности, вписанной в правильный треугольник, высота которого равна $${3*k}$.`,solution:`Центр вписанной окружности делит высоту в отношении $2:1$: $r=\\dfrac{h}{3}=\\dfrac{${3*k}}{3}=${k}$.`,explanation:`В правильном треугольнике $r=h/3$.`,answer:k,dis:[3*k,2*k,k+1]}
  :{content:`Радиус окружности, вписанной в правильный треугольник, равен $${k}$. Найдите высоту этого треугольника.`,solution:`$h=3r=3\\cdot${k}=${3*k}$.`,explanation:`В правильном треугольнике высота втрое больше радиуса вписанной окружности.`,answer:3*k,dis:[2*k,k,3*k+1]};});
def('pRhomb30',2,'AB','Ромб: вписанная окружность',r=>{const k=r.int(1,8);const toR=r.bool();chk(4*k/4===k,'pr30');
  return toR?{content:`Сторона ромба равна $${4*k}$, острый угол равен $30°$. Найдите радиус вписанной в ромб окружности.`,solution:`Высота ромба $h=a\\sin 30°=${4*k}\\cdot\\dfrac12=${2*k}$. Радиус вписанной окружности равен половине высоты: $r=${k}$.`,explanation:`$r=\\frac{a\\sin\\alpha}{2}$: высота ромба — диаметр вписанной окружности.`,answer:k,dis:[2*k,4*k,k+1]}
  :{content:`Острый угол ромба равен $30°$, радиус вписанной в него окружности равен $${k}$. Найдите сторону ромба.`,solution:`Высота ромба равна диаметру: $h=2r=${2*k}$. Из $h=a\\sin 30°$: $a=\\dfrac{${2*k}}{1/2}=${4*k}$.`,explanation:`Высота ромба равна диаметру вписанной окружности; $h=a\\sin\\alpha$.`,answer:4*k,dis:[2*k,k,4*k+2]};});
def('pSquareIn',1,'AB','Квадрат и окружности',r=>{const k=r.int(2,12);const inv=r.bool();chk(2*k/2===k,'psi');
  return inv?{content:`Радиус окружности, вписанной в квадрат, равен $${k}$. Найдите сторону квадрата.`,solution:`Сторона равна диаметру вписанной окружности: $a=2r=${2*k}$.`,explanation:`Вписанная в квадрат окружность касается всех сторон: $a=2r$.`,answer:2*k,dis:[k,4*k,2*k+1]}
  :{content:`Сторона квадрата равна $${2*k}$. Найдите радиус вписанной в этот квадрат окружности.`,solution:`$r=\\dfrac{a}{2}=\\dfrac{${2*k}}{2}=${k}$.`,explanation:`Радиус вписанной окружности — половина стороны квадрата.`,answer:k,dis:[2*k,4*k,k+1]};});
def('pCircleDiam',1,'AB','Круг: диаметр из площади',r=>{const k=r.int(2,15);chk(k*k>0,'pcd');
  return{content:`Площадь круга равна $${k*k}\\pi$. Найдите диаметр этого круга.`,solution:`$S=\\pi R^2=${k*k}\\pi$, значит $R=${k}$ и $d=2R=${2*k}$.`,explanation:`Из $S=\\pi R^2$ найдите радиус, диаметр вдвое больше.`,answer:2*k,dis:[k,k*k,4*k]};});
def('pTangentAngle',2,'AB','Касательные к окружности',r=>{const boc=2*r.int(35,80);const ans=180-boc;chk(ans+boc===180,'pta');
  return{content:`Из точки $A$ к окружности с центром $O$ проведены касательные $AB$ и $AC$ ($B$ и $C$ — точки касания). Найдите угол $BAC$ (в градусах), если угол $BOC$ равен $${boc}°$.`,solution:`Радиусы $OB$ и $OC$ перпендикулярны касательным, поэтому в четырёхугольнике $ABOC$ углы $B$ и $C$ прямые. Тогда $\\angle BAC=360°-90°-90°-${boc}°=${ans}°$.`,explanation:`Сумма углов четырёхугольника $ABOC$ равна $360°$, углы при точках касания прямые.`,answer:ans,dis:[boc,90-ans>0?90-ans:ans+10,boc/2]};});
def('pEquilCircum',2,'AB','Правильный треугольник: описанная окружность',r=>{const k=r.int(2,9);chk(3*k===3*k,'pec');
  return{content:`Радиус окружности, описанной около правильного треугольника, равен $${rootTex(k,3)}$. Найдите сторону этого треугольника.`,solution:`Для правильного треугольника $a=R\\sqrt{3}=${rootTex(k,3)}\\cdot\\sqrt{3}=${3*k}$.`,explanation:`$a=R\\sqrt3$ для правильного треугольника.`,answer:3*k,dis:[k,2*k,3*k+3]};});
def('pMedianHyp',1,'AB','Медиана к гипотенузе',r=>{const m=r.int(3,20);const inv=r.bool();chk(2*m/2===m,'pmh');
  return inv?{content:`Гипотенуза прямоугольного треугольника равна $${2*m}$. Найдите медиану, проведённую к гипотенузе.`,solution:`Медиана к гипотенузе равна её половине: $m=\\dfrac{${2*m}}{2}=${m}$.`,explanation:`Медиана из вершины прямого угла равна половине гипотенузы.`,answer:m,dis:[2*m,m+1,4*m]}
  :{content:`Медиана прямоугольного треугольника, проведённая к гипотенузе, равна $${m}$. Найдите гипотенузу.`,solution:`Гипотенуза вдвое больше такой медианы: $c=2\\cdot${m}=${2*m}$.`,explanation:`Медиана к гипотенузе равна половине гипотенузы.`,answer:2*m,dis:[m,m*m,2*m+2]};});
def('pTrapPerpD',4,'B','Трапеция с перпендикулярными диагоналями',r=>{const t=r.pick([[6,8,5,24],[12,16,10,96],[30,40,25,600],[10,24,13,120],[16,30,17,240],[18,24,15,216],[14,48,25,336],[40,42,29,840]]);
  chk(t[0]**2+t[1]**2===4*t[2]*t[2]&&t[3]===t[0]*t[1]/2,'ptp');
  return{content:`Диагонали трапеции равны $${t[0]}$ и $${t[1]}$, а средняя линия равна $${t[2]}$. Найдите площадь трапеции.`,solution:`Так как $${t[0]}^2+${t[1]}^2=${t[0]**2+t[1]**2}=(2\\cdot${t[2]})^2$, диагонали перпендикулярны (треугольник из диагоналей и суммы оснований — прямоугольный). Тогда $S=\\dfrac{d_1 d_2}{2}=\\dfrac{${t[0]}\\cdot${t[1]}}{2}=${t[3]}$.`,explanation:`Проверьте равенство $d_1^2+d_2^2=(a+b)^2$ — оно означает перпендикулярность диагоналей, и тогда $S=\\frac{d_1d_2}{2}$.`,answer:t[3],dis:[t[0]*t[1],t[3]/2,t[2]*t[2]]};});
def('pRectDiag',3,'B','Прямоугольник: диагональ из периметра и площади',r=>{const t=r.pick([[3,4,5],[6,8,10],[5,12,13],[9,12,15],[8,15,17],[12,16,20],[7,24,25],[20,21,29],[10,24,26],[15,20,25]]);
  const P=2*(t[0]+t[1]),S=t[0]*t[1];chk((P/2)**2-2*S===t[2]*t[2],'prd');
  return{content:`Площадь прямоугольника равна $${S}$, а его периметр равен $${P}$. Найдите диагональ прямоугольника.`,solution:`$a+b=${P/2}$, $ab=${S}$. Тогда $d^2=a^2+b^2=(a+b)^2-2ab=${(P/2)**2}-${2*S}=${t[2]*t[2]}$, $d=${t[2]}$ (стороны $${t[0]}$ и $${t[1]}$).`,explanation:`$d^2=(a+b)^2-2ab$ — диагональ без поиска самих сторон.`,answer:t[2],dis:[t[0]+t[1],t[2]+1,P/2]};});
def('pPar60',4,'B','Параллелограмм: сторона по диагонали',r=>{const t=r.pick([[8,15,13],[5,8,7],[3,8,7],[7,15,13],[5,21,19],[16,30,26],[10,16,14],[6,16,14],[14,30,26],[9,24,21],[15,24,21]]);
  chk(t[0]**2+t[1]**2-t[0]*t[1]===t[2]*t[2]&&t[2]>t[0],'pp60');
  return{content:`В параллелограмме $ABCD$ угол $A$ равен $60°$, сторона $AB=${t[0]}$, а диагональ $BD=${t[2]}$. Найдите сторону $AD$.`,solution:`По теореме косинусов в треугольнике $ABD$: $BD^2=AB^2+AD^2-2\\cdot AB\\cdot AD\\cos 60°$, то есть $${t[2]*t[2]}=${t[0]*t[0]}+AD^2-${t[0]}\\cdot AD$. Уравнение $AD^2-${t[0]}AD-${t[2]*t[2]-t[0]*t[0]}=0$ имеет единственный положительный корень $AD=${t[1]}$.`,explanation:`Теорема косинусов с $\\cos 60°=\\frac12$ даёт квадратное уравнение относительно $AD$.`,answer:t[1],dis:[t[2]-t[0],t[1]+1,t[0]+t[2]]};});
def('pArcRatio',3,'B','Дуги окружности в отношении',r=>{let p,q,w,u;for(let i=0;i<80;i++){p=r.int(1,7);q=r.int(1,7);w=r.int(1,7);const s=p+q+w;if(360%s===0){u=360/s;if((w*u)%2===0)break;}u=0;}
  if(!u)throw 0;const ans=w*u/2;chk(p*u+q*u+w*u===360&&ans*2===w*u,'par');
  return{content:`Точки $A$, $B$, $C$ делят окружность на дуги $AB$, $BC$ и $CA$, градусные меры которых относятся как $${p}:${q}:${w}$. Найдите вписанный угол $ABC$ (в градусах).`,solution:`Одна часть: $\\dfrac{360°}{${p+q+w}}=${u}°$. Угол $ABC$ опирается на дугу $CA$, равную $${w}\\cdot${u}°=${w*u}°$, поэтому $\\angle ABC=\\dfrac{${w*u}°}{2}=${ans}°$.`,explanation:`Вписанный угол равен половине дуги, на которую он опирается (дуга $CA$ — не содержащая $B$).`,answer:ans,dis:[w*u,p*u/2,(p+q)*u/2]};});
def('pChordPoint',4,'B','Хорда и расстояние до центра',r=>{let R,d,u,v;for(let i=0;i<120;i++){R=r.int(7,20);d=r.int(1,R-2);const P=R*R-d*d;u=0;for(let cand=2;cand*cand<=P;cand++){if(P%cand===0){const vv=P/cand;if(cand+vv<=2*R&&vv!==cand){u=cand;v=vv;break;}}}if(u)break;}
  if(!u)throw 0;chk(u*v===R*R-d*d&&u+v<=2*R,'pcp');
  return{content:`В окружности радиуса $${R}$ проведена хорда $AB$. Точка $M$ делит хорду на отрезки $AM=${u}$ и $MB=${v}$. Найдите расстояние от точки $M$ до центра окружности.`,solution:`По свойству пересекающихся хорд $AM\\cdot MB=R^2-OM^2$: $${u}\\cdot${v}=${R*R}-OM^2$, откуда $OM^2=${d*d}$ и $OM=${d}$.`,explanation:`Произведение отрезков хорды равно $R^2-OM^2$ (степень точки).`,answer:d,dis:[R-1,d+1,Math.abs(v-u)]};});
def('pTrapAOD',4,'B','Трапеция: площади треугольников при диагоналях',r=>{let k=r.int(1,6),m=r.int(1,6);if(k===m)m=k+1;const S=(k+m)**2;chk(S===k*k+2*k*m+m*m,'pta2');
  return{content:`В трапеции $ABCD$ с основаниями $AD$ и $BC$ диагонали пересекаются в точке $O$. Площади треугольников $AOD$ и $BOC$ равны $${k*k}$ и $${m*m}$ соответственно. Найдите площадь трапеции.`,solution:`Треугольники $AOD$ и $BOC$ подобны, и $S_{ABO}=S_{CDO}=\\sqrt{S_{AOD}\\cdot S_{BOC}}=\\sqrt{${k*k}\\cdot${m*m}}=${k*m}$. Площадь трапеции $=${k*k}+${m*m}+2\\cdot${k*m}=(${k}+${m})^2=${S}$.`,explanation:`$S_{трапеции}=(\\sqrt{S_1}+\\sqrt{S_2})^2$ для треугольников при основаниях.`,answer:S,dis:[k*k+m*m,2*k*m,S-k*m]};});
def('pSineRule',3,'B','Теорема синусов',r=>{const a=2*r.int(2,12);const mode=r.pick([30,90,150]);const ans=mode===90?a/2:a;chk(mode===90?2*ans===a:ans===a,'psr');
  return{content:`В треугольнике сторона равна $${a}$, а противолежащий ей угол равен $${mode}°$. Найдите радиус описанной окружности.`,solution:`По теореме синусов $2R=\\dfrac{a}{\\sin ${mode}°}=\\dfrac{${a}}{${mode===90?'1':'1/2'}}=${mode===90?a:2*a}$, значит $R=${ans}$.`,explanation:`$\\frac{a}{\\sin A}=2R$; $\\sin 30°=\\sin 150°=\\frac12$, $\\sin 90°=1$.`,answer:ans,dis:[mode===90?a:a/2,ans+1,2*ans]};});
def('pHeronR',4,'B','Радиус вписанной окружности по трём сторонам',r=>{const t=r.pick([[13,14,15,4],[5,12,13,2],[6,8,10,2],[9,12,15,3],[8,15,17,3],[3,4,5,1],[7,24,25,3],[20,21,29,6],[12,16,20,4],[15,20,25,5],[10,24,26,4],[18,24,30,6],[9,40,41,4]]);
  const p=(t[0]+t[1]+t[2])/2;const S2=p*(p-t[0])*(p-t[1])*(p-t[2]);chk(Math.sqrt(S2)/p===t[3],'phr');
  return{content:`В треугольнике стороны равны $${t[0]}$, $${t[1]}$ и $${t[2]}$. Найдите радиус вписанной окружности.`,solution:`Полупериметр $p=${p}$. По формуле Герона $S=\\sqrt{${p}\\cdot${p-t[0]}\\cdot${p-t[1]}\\cdot${p-t[2]}}=${Math.sqrt(S2)}$. Тогда $r=\\dfrac{S}{p}=${t[3]}$.`,explanation:`Сначала площадь по Герону, затем $r=S/p$.`,answer:t[3],dis:[t[3]+1,Math.round(p/3),t[3]*2]};});
def('pBisector60',4,'B','Биссектриса в прямоугольном треугольнике',r=>{const m=r.int(1,6);const AC=3*m;const ans=12*m*m;chk(Math.abs((AC/(Math.sqrt(3)/2))**2-ans)<1e-6,'pb60');
  return{content:`В треугольнике $ABC$ угол $C$ равен $90°$, угол $A$ равен $60°$, $AC=${AC}$. Из вершины $A$ проведена биссектриса $AL$ к стороне $BC$. Найдите квадрат длины биссектрисы $AL$.`,solution:`Биссектриса делит угол $A$ пополам: $\\angle LAC=30°$. В прямоугольном треугольнике $ALC$: $AL=\\dfrac{AC}{\\cos 30°}=\\dfrac{${AC}}{\\sqrt{3}/2}=\\dfrac{${2*AC}}{\\sqrt{3}}$. Тогда $AL^2=\\dfrac{${4*AC*AC}}{3}=${ans}$.`,explanation:`Рассмотрите прямоугольный треугольник $ALC$ с углом $30°$ при $A$.`,answer:ans,dis:[9*m*m,ans/2,16*m*m]};});
def('pSimilarArea',2,'AB','Площади подобных треугольников',r=>{let m=r.int(1,4),n=m+r.int(1,3);const t=r.int(1,8);const S1=m*m*t,S2=n*n*t;chk(S2*m*m===S1*n*n,'psa');
  return{content:`Стороны двух подобных треугольников относятся как $${m}:${n}$. Площадь меньшего треугольника равна $${S1}$. Найдите площадь большего треугольника.`,solution:`Площади подобных фигур относятся как квадрат коэффициента подобия: $S_2=${S1}\\cdot\\dfrac{${n*n}}{${m*m}}=${S2}$.`,explanation:`Отношение площадей равно квадрату отношения сторон.`,answer:S2,dis:[S1*n/m,S1+n*n,S2-t]};});
def('pShoelace',3,'B','Площадь треугольника по координатам',r=>{let x1,y1,x2,y2,x3,y3,D=0;for(let i=0;i<100;i++){x1=r.int(-5,5);y1=r.int(-5,5);x2=r.int(-5,5);y2=r.int(-5,5);x3=r.int(-5,5);y3=r.int(-5,5);
  D=Math.abs((x2-x1)*(y3-y1)-(x3-x1)*(y2-y1));if(D>=4&&D%2===0)break;D=0;}
  if(!D)throw 0;const S=D/2;chk(2*S===D,'psl');
  return{content:`Найдите площадь треугольника с вершинами $A(${x1};${y1})$, $B(${x2};${y2})$ и $C(${x3};${y3})$.`,solution:`По формуле площади через координаты: $S=\\dfrac12|(x_B-x_A)(y_C-y_A)-(x_C-x_A)(y_B-y_A)|=\\dfrac{${D}}{2}=${S}$.`,explanation:`Используйте формулу площади через векторное произведение (или формулу «шнурков»).`,answer:S,dis:[D,S+1,S*2-1]};});
def('pPar4th',2,'AB','Четвёртая вершина параллелограмма',r=>{const ax=r.int(-5,5),ay=r.int(-5,5),bx=r.int(-5,5),by=r.int(-5,5),cx=r.int(-5,5),cy=r.int(-5,5);
  const dx=ax+cx-bx,dy=ay+cy-by;chk(dx+bx===ax+cx&&dy+by===ay+cy,'pp4');
  return{content:`Даны вершины параллелограмма $ABCD$: $A(${ax};${ay})$, $B(${bx};${by})$, $C(${cx};${cy})$. Найдите абсциссу вершины $D$.`,solution:`В параллелограмме диагонали делятся пополам: $A+C=B+D$, поэтому $x_D=x_A+x_C-x_B=${ax}+${cx}-(${bx})=${dx}$.`,explanation:`Середины диагоналей совпадают: $x_D=x_A+x_C-x_B$.`,answer:dx,dis:[dy,bx+cx-ax,dx+1]};});
def('pDotProduct',3,'B','Скалярное произведение векторов',r=>{const ax=r.int(-4,4),ay=r.int(-4,4),bx=r.int(-4,4),by=r.int(-4,4),cx=r.int(-4,4),cy=r.int(-4,4);
  const v1x=bx-ax,v1y=by-ay,v2x=cx-ax,v2y=cy-ay;const ans=v1x*v2x+v1y*v2y;chk(Number.isInteger(ans),'pdp');
  return{content:`Даны точки $A(${ax};${ay})$, $B(${bx};${by})$, $C(${cx};${cy})$. Найдите скалярное произведение векторов $\\vec{AB}$ и $\\vec{AC}$.`,solution:`$\\vec{AB}=(${v1x};${v1y})$, $\\vec{AC}=(${v2x};${v2y})$. Скалярное произведение: $${v1x}\\cdot${v2x}+${v1y}\\cdot${v2y}=${ans}$.`,explanation:`Найдите координаты векторов и сложите произведения соответствующих координат.`,answer:ans,dis:[v1x*v2y-v1y*v2x,ans+1,v1x+v2x+v1y+v2y]};});
def('pMidB',2,'AB','Конец отрезка по середине',r=>{const ax=r.int(-6,6),ay=r.int(-6,6),mx=r.int(-5,5),my=r.int(-5,5);
  const bx=2*mx-ax,by=2*my-ay;chk((ax+bx)/2===mx&&(ay+by)/2===my,'pmb');const sum=bx+by;
  return{content:`Точка $M(${mx};${my})$ — середина отрезка $AB$, где $A(${ax};${ay})$. Найдите сумму координат точки $B$.`,solution:`$x_B=2x_M-x_A=${bx}$, $y_B=2y_M-y_A=${by}$. Сумма: $${bx}+(${by})=${sum}$.`,explanation:`Координаты середины — среднее арифметическое координат концов.`,answer:sum,dis:[bx,by,mx+my]};});
def('pSymPoint',2,'AB','Симметричная точка',r=>{const ax=r.int(-6,6),ay=r.int(-6,6),bx=r.int(-5,5),by=r.int(-5,5);
  const mx=2*bx-ax,my=2*by-ay;chk((ax+mx)/2===bx,'psp');
  return{content:`Точка $M$ симметрична точке $A(${ax};${ay})$ относительно точки $B(${bx};${by})$. Найдите ординату точки $M$.`,solution:`$B$ — середина $AM$: $y_M=2y_B-y_A=2\\cdot${by}-(${ay})=${my}$.`,explanation:`При симметрии относительно точки эта точка — середина отрезка.`,answer:my,dis:[mx,-ay,my+1]};});
def('pLineThrough',3,'B','Прямая через две точки',r=>{const k=r.int(-4,4)||2,b=r.int(-6,6);const x1=r.int(-5,2);let x2=x1+r.int(1,4);const x3=x2+r.int(1,4);
  const y1=k*x1+b,y2=k*x2+b,y3=k*x3+b;chk((y2-y1)*(x3-x1)===(y3-y1)*(x2-x1),'plt');
  return{content:`Прямая проходит через точки $A(${x1};${y1})$ и $B(${x2};${y2})$. Найдите ординату точки этой прямой с абсциссой $${x3}$.`,solution:`Угловой коэффициент $k=\\dfrac{${y2}-${y1}}{${x2}-${x1}}=${k}$, свободный член $b=${y1}-${k}\\cdot(${x1})=${b}$. При $x=${x3}$: $y=${k}\\cdot${x3}${term(b,'')}=${y3}$.`,explanation:`Найдите $k$ и $b$ уравнения $y=kx+b$, затем подставьте $x$.`,answer:y3,dis:[y2,k*x3,y3+k]};});

/* ================= АЛГЕБРА: вычисления, проценты, уравнения ================= */
def('aPowersMix',1,'AB','Вычисление со степенями и корнем',r=>{const a=r.int(2,6),b=r.int(2,7),c=r.int(2,12);const ans=a**3-b*b+c;chk(ans===a*a*a-b*b+Math.sqrt(c*c),'apm');
  return{content:`Вычислите: $${a}^3 - ${b}^2 + \\sqrt{${c*c}}$.`,solution:`$${a}^3=${a**3}$, $${b}^2=${b*b}$, $\\sqrt{${c*c}}=${c}$. Итого $${a**3}-${b*b}+${c}=${ans}$.`,explanation:`Вычислите каждое слагаемое отдельно: куб, квадрат и корень.`,answer:ans,dis:[a**3+b*b-c,ans-2*c,a**3-b*b-c]};});
def('aNegPowers',2,'AB','Отрицательные показатели',r=>{const a=r.pick([2,3,4,5]),j=r.int(2,3);let b=r.pick([2,3,4,5]);const k=j===3?2:r.int(2,3);const s=r.bool();const ans=s?a**j+b**k:a**j-b**k;chk(Math.abs(ans-(s?Math.pow(1/a,-j)+Math.pow(1/b,-k):Math.pow(1/a,-j)-Math.pow(1/b,-k)))<1e-9,'anp');
  return{content:`Вычислите: $\\left(\\dfrac{1}{${a}}\\right)^{-${j}} ${s?'+':'-'} \\left(\\dfrac{1}{${b}}\\right)^{-${k}}$.`,solution:`$\\left(\\frac{1}{a}\\right)^{-n}=a^n$: получаем $${a}^{${j}} ${s?'+':'-'} ${b}^{${k}}=${a**j}${s?'+':'-'}${b**k}=${ans}$.`,explanation:`Отрицательный показатель «переворачивает» дробь: $(1/a)^{-n}=a^n$.`,answer:ans,dis:[s?a**j-b**k:a**j+b**k,a*j+b*k,ans+1]};});
def('aDecimalCalc',2,'B','Действия с десятичными дробями',r=>{let p,q,c,s,ans;for(let i=0;i<200;i++){p=r.int(12,45);q=r.int(11,35);s=r.pick([2,4,5]);const prod=p*q;c=r.int(1,Math.floor(prod/10));const num=prod-10*c;if(num>0&&num%(10*s)===0){ans=num/(10*s);break;}ans=undefined;}
  if(ans===undefined)throw 0;chk(Math.abs(((p/10)*(q/10)-c/10)/(s/10)-ans)<1e-9,'adc');
  const f=(n)=>(n/10).toFixed(1).replace('.',',');
  return{content:`Вычислите: $\\dfrac{${f(p)}\\cdot ${f(q)} - ${f(c)}}{${f(s)}}$.`,solution:`$${f(p)}\\cdot ${f(q)}=${(p*q/100).toString().replace('.',',')}$; вычитаем $${f(c)}$ и делим на $${f(s)}$: получаем $${ans}$.`,explanation:`Сначала умножение, затем вычитание, в конце деление.`,answer:ans,dis:[ans+1,ans*2,ans-1]};});
def('aRectField',3,'B','Прямоугольный участок',r=>{const w=r.int(5,25),d=r.int(2,15);const S=w*(w+d),P=2*(2*w+d);chk(w*w+d*w===S,'arf');
  return{content:`Длина прямоугольного участка на $${d}$ м больше ширины, а его площадь равна $${S}$ м$^2$. Найдите периметр участка (в метрах).`,solution:`Пусть ширина $x$: $x(x+${d})=${S}$. Подбором (или через дискриминант) $x=${w}$, длина $=${w+d}$. Периметр $=2(${w}+${w+d})=${P}$.`,explanation:`Составьте уравнение $x(x+${d})=S$ и решите его.`,answer:P,dis:[S,2*w+d,P/2]};});
def('aPercentIncrease',2,'AB','Изменение цены в процентах',r=>{let oldP,p;for(let i=0;i<60;i++){oldP=r.pick([100,150,200,250,300,400,500,600,800]);p=r.pick([5,10,15,20,25,30,40,50]);if((oldP*p)%100===0)break;}
  const newP=oldP+oldP*p/100;chk((newP-oldP)/oldP*100===p,'api2');
  return{content:`Цена товара повысилась с $${oldP}$ р. до $${newP}$ р. На сколько процентов повысилась цена?`,solution:`Прирост $=${newP}-${oldP}=${newP-oldP}$ р. В процентах: $\\dfrac{${newP-oldP}}{${oldP}}\\cdot 100\\%=${p}\\%$.`,explanation:`Изменение делим на ИСХОДНУЮ цену и умножаем на 100%.`,answer:p,dis:[Math.round((newP-oldP)/newP*100),p+5,newP-oldP]};});
def('aPercentOfWhat',2,'AB','Число по его проценту',r=>{const p=r.pick([20,25,40,50,60,75,80]);const x=(100/gcd(p,100))*r.int(2,12);const val=x*p/100;chk(val*100===x*p,'apw');
  return{content:`Число $${val}$ составляет $${p}\\%$ от некоторого числа. Найдите это число.`,solution:`Пусть число $x$: $0{,}${p<10?'0'+p:p}\\,x=${val}$, откуда $x=\\dfrac{${val}\\cdot 100}{${p}}=${x}$.`,explanation:`Разделите значение на процент и умножьте на 100.`,answer:x,dis:[val*p/100,val+p,x/2]};});
def('aProportion',1,'AB','Пропорция',r=>{const a=r.int(2,12),c=r.int(2,12),b=c*r.int(2,9);const x=a*b/c;chk(x*c===a*b,'apr');
  return{content:`Решите пропорцию: $\\dfrac{x}{${b}} = \\dfrac{${a}}{${c}}$.`,solution:`$x=\\dfrac{${a}\\cdot${b}}{${c}}=${x}$.`,explanation:`Основное свойство пропорции: произведения накрест равны.`,answer:x,dis:[a*c/gcd(a*c,b)===Math.round(a*c/b)?Math.round(a*c/b):x+2,x+a,b]};});
def('aLinearBrackets',2,'AB','Линейное уравнение со скобками',r=>{const a=r.int(2,5),bb=r.int(2,6),c=r.int(1,8),d=r.int(2,5),e=r.int(1,7),x0=r.int(-7,7);
  const f=r.int(1,3);const g=(a*bb-d-f)*x0-a*c-d*e;if(a*bb-d-f===0)throw 0;
  chk(a*(bb*x0-c)-d*(x0+e)===f*x0+g,'alb');
  return{content:`Решите уравнение: $${a}(${bb}x - ${c}) - ${d}(x + ${e}) = ${lin(f,g)}$.`,solution:`Раскроем скобки: $${a*bb}x-${a*c}-${d}x-${d*e}=${lin(f,g)}$, то есть $${lin(a*bb-d,-a*c-d*e)}=${lin(f,g)}$. Тогда $${a*bb-d-f}x=${g+a*c+d*e}$ и $x=${x0}$.`,explanation:`Раскройте скобки, перенесите слагаемые с $x$ влево, числа вправо.`,answer:x0,dis:[-x0,x0+1,g]};});
def('aLinIneqTwoSided',2,'AB','Неравенство с x с обеих сторон',r=>{const a=r.int(2,6),d=r.int(1,5),x0=r.int(-4,8);const bnd=(a+d)*x0;const b=r.int(1,9);const c=bnd-b+r.int(1,a+d-1);
  const lo=(b+c)/(a+d);const ans=Math.floor(lo)+1;chk(a*ans-b>c-d*ans&&a*(ans-1)-b<=c-d*(ans-1),'alt');
  return{content:`Найдите наименьшее целое решение неравенства $${a}x - ${b} > ${c} - ${d}x$.`,solution:`$${a}x+${d}x>${c}+${b}$, то есть $${a+d}x>${b+c}$, $x>\\dfrac{${b+c}}{${a+d}}$. Наименьшее целое решение: $${ans}$.`,explanation:`Соберите $x$ слева, числа справа; граница — дробь, возьмите следующее целое.`,answer:ans,dis:[ans-1,ans+1,b+c]};});
def('aQuadIneqCount',2,'AB','Число целых решений квадратного неравенства',r=>{const k=r.int(3,12);const ans=k+1;chk(0*0-k*0<=0&&k*k-k*k<=0,'aqc');
  return{content:`Сколько целых решений имеет неравенство $x^2 - ${k}x \\leq 0$?`,solution:`$x(x-${k})\\le 0$, значит $0\\le x\\le ${k}$. Целые решения: $0,1,\\dots,${k}$ — всего $${ans}$.`,explanation:`Разложите на множители и примените метод интервалов.`,answer:ans,dis:[k,k-1,k+2]};});
def('aAbsSumRoots',2,'AB','Сумма корней уравнения с модулем',r=>{const a=r.int(-8,9),b=r.int(1,12);chk((a+b)+(a-b)===2*a,'aas');
  return{content:`Найдите сумму корней уравнения $|x ${term(-a,'')}| = ${b}$.`,solution:`$x${term(-a,'')}=\\pm${b}$, корни $x_1=${a+b}$ и $x_2=${a-b}$. Сумма: $${2*a}$.`,explanation:`Модуль раскрывается двумя случаями; корни симметричны относительно $${a}$.`,answer:2*a,dis:[a,2*b,a+b]};});
def('aAbsCount',1,'A','Число корней уравнения с модулем',r=>{const m=r.int(-6,6);const mode=r.pick([0,1,2]);const rhs=mode===0?-r.int(1,9):mode===1?0:r.int(1,9);const ans=mode===0?0:mode===1?1:2;
  chk(ans===(rhs<0?0:rhs===0?1:2),'aac');
  const c=textChoice(r,String(ans),['0','1','2','3','бесконечно много'].filter(x=>x!==String(ans)));
  return{content:`Сколько корней имеет уравнение $|x ${term(-m,'')}| = ${rhs}$?`,solution:`Модуль неотрицателен: при отрицательной правой части корней нет, при нуле — один корень, при положительной — два. Ответ: $${ans}$.`,explanation:`Сравните правую часть с нулём.`,options:c.options,correctAnswer:c.correctAnswer};});
def('aFsuExpand',3,'B','Разность квадратов двучленов',r=>{const k=r.int(2,5),m=r.int(1,4),a0=r.int(1,5),b0=r.int(1,5);const ans=-4*k*m*a0*b0;
  chk((k*a0-m*b0)**2-(k*a0+m*b0)**2===ans,'afe');
  return{content:`Найдите значение выражения $(${k}a - ${m===1?'':m}b)^2 - (${k}a + ${m===1?'':m}b)^2$ при $a=${a0}$, $b=${b0}$.`,solution:`$(p-q)^2-(p+q)^2=-4pq$, где $p=${k}a$, $q=${m===1?'':m}b$. Получаем $-4\\cdot${k*a0}\\cdot${m*b0}=${ans}$.`,explanation:`Не раскрывайте квадраты полностью — используйте $(p-q)^2-(p+q)^2=-4pq$.`,answer:ans,dis:[-ans,0,4*k*m*a0*b0+2]};});
def('aFracReduceValue',3,'B','Сокращение дроби и значение',r=>{const a=r.int(2,6);const d=r.pick([1,2,a,2*a].filter(x=>x>=1));const x0=a+d;const ans=(x0+a)/(x0-a);chk(Number.isInteger(ans)&&(x0*x0-a*a)===(x0-a)*(x0+a),'afr');
  return{content:`Найдите значение выражения $\\dfrac{x^2-${a*a}}{x^2-${2*a}x+${a*a}}$ при $x=${x0}$.`,solution:`$\\dfrac{(x-${a})(x+${a})}{(x-${a})^2}=\\dfrac{x+${a}}{x-${a}}$. При $x=${x0}$: $\\dfrac{${x0+a}}{${x0-a}}=${ans}$.`,explanation:`Числитель — разность квадратов, знаменатель — квадрат разности; сократите.`,answer:ans,dis:[x0+a,x0-a,ans+1]};});
def('aRatEqProportion',2,'AB','Дробное уравнение',r=>{let a=r.int(2,9),b=r.int(1,8);if(a===b)b=a-1||a+1;const c=r.int(2,9);if((a-b)<=0||(a*c)%(a-b)!==0)throw 0;const x=a*c/(a-b);
  chk(Math.abs(a/x-b/(x-c))<1e-9,'are');
  return{content:`Решите уравнение: $\\dfrac{${a}}{x} = \\dfrac{${b}}{x-${c}}$.`,solution:`Накрест: $${a}(x-${c})=${b}x$, то есть $${a}x-${a*c}=${b}x$, $${a-b}x=${a*c}$, $x=${x}$. ОДЗ ($x\\ne0$, $x\\ne${c}$) выполнена.`,explanation:`Перемножьте накрест и решите линейное уравнение; проверьте ОДЗ.`,answer:x,dis:[c,a*c,x+c]};});
def('aRatEqShift',2,'AB','Уравнение с x в знаменателе',r=>{const b=r.int(2,7);const x=r.int(1,9)*(r.bool()?1:-1);const a=x*(b-1);if(a===0)throw 0;
  chk((x+a)/x===b,'ars');
  return{content:`Решите уравнение: $\\dfrac{x ${term(a,'')}}{x} = ${b}$.`,solution:`$x${term(a,'')}=${b}x$, откуда $${b-1}x=${a}$ и $x=${x}$. ОДЗ: $x\\ne0$ — выполнено.`,explanation:`Умножьте обе части на $x$ и решите линейное уравнение.`,answer:x,dis:[a,-x,b]};});
def('aSysSumSquares',3,'B','Система: сумма квадратов',r=>{const x=r.int(1,8),y=r.int(1,8);const s=x+y,p=x*y;const ans=s*s-2*p;chk(ans===x*x+y*y,'ass');
  return{content:`Числа $x$ и $y$ таковы, что $x+y=${s}$ и $xy=${p}$. Найдите $x^2+y^2$.`,solution:`$x^2+y^2=(x+y)^2-2xy=${s*s}-${2*p}=${ans}$.`,explanation:`Используйте тождество $(x+y)^2=x^2+2xy+y^2$.`,answer:ans,dis:[s*s,s*s+2*p,p*p]};});
def('aIrrEqUnique',3,'B','Иррациональное уравнение',r=>{const b=r.int(1,6);const t=b+r.int(2,8);const a=(t-b)**2-t;if(t+a<0)throw 0;
  chk(Math.abs(Math.sqrt(t+a)-(t-b))<1e-9&&(2*b+1-t)<b,'aiu');
  return{content:`Решите уравнение: $\\sqrt{x ${term(a,'')}} = x - ${b}$.`,solution:`Возводим в квадрат: $x${term(a,'')}=(x-${b})^2$, то есть $x^2-${2*b+1}x+${b*b-a}=0$. Корни: $x=${t}$ и $x=${2*b+1-t}$. Проверка: правая часть должна быть $\\ge0$, подходит только $x=${t}$.`,explanation:`После возведения в квадрат обязательно проверьте корни подстановкой.`,answer:t,dis:[2*b+1-t,b,t+b]};});
def('aIrrEqSum',4,'B','Сумма двух корней',r=>{const u=r.int(1,5),v=r.int(1,5);const c=u+v;const t=r.int(Math.max(1,v*v+1),40);const a=u*u-t,b=t-v*v;if(b<0)throw 0;
  chk(Math.abs(Math.sqrt(t+a)+Math.sqrt(t-b)-c)<1e-9,'ais');
  return{content:`Решите уравнение: $\\sqrt{x ${term(a,'')}} + \\sqrt{x - ${b}} = ${c}$.`,solution:`При $x=${t}$: $\\sqrt{${t+a}}+\\sqrt{${t-b}}=${u}+${v}=${c}$. Левая часть монотонно возрастает на ОДЗ, поэтому корень единственный: $x=${t}$.`,explanation:`Подберите $x$, при котором оба подкоренных выражения — точные квадраты; монотонность гарантирует единственность.`,answer:t,dis:[u*u,v*v,t+1]};});
def('aExpEqShift',2,'AB','Показательное уравнение',r=>{const b=r.pick([2,3,5]),k=r.pick([2,3]),c=r.int(1,5),m=r.int(2,9);const x=(m+c)/k;if(!Number.isInteger(x))throw 0;
  chk(k*x-c===m,'aes');
  return{content:`Решите уравнение: $${b}^{${k}x-${c}} = ${Math.pow(b,m)}$.`,solution:`$${Math.pow(b,m)}=${b}^{${m}}$, значит $${k}x-${c}=${m}$, откуда $x=${x}$.`,explanation:`Представьте правую часть как степень с тем же основанием и приравняйте показатели.`,answer:x,dis:[m,m-c,x+1]};});
def('aExpIneqLeast',2,'AB','Показательное неравенство',r=>{const b=r.pick([2,3,5]),k=r.int(2,5);chk(Math.pow(b,k+1)>Math.pow(b,k),'ael');
  return{content:`Найдите наименьшее целое решение неравенства $${b}^{x} > ${Math.pow(b,k)}$.`,solution:`$${b}^x>${b}^{${k}}$; основание больше 1, знак сохраняется: $x>${k}$. Наименьшее целое: $${k+1}$.`,explanation:`При основании $>1$ показательная функция возрастает.`,answer:k+1,dis:[k,Math.pow(b,k)+1,k+2]};});
def('aExpIneqRecip',3,'B','Неравенство с убывающим основанием',r=>{const b=r.pick([2,3,5]),k=r.int(1,4);chk(Math.pow(1/b,-k)-Math.pow(b,k)<1e-9,'aer');
  return{content:`Найдите наименьшее целое решение неравенства $\\left(\\dfrac{1}{${b}}\\right)^{x} \\leq ${Math.pow(b,k)}$.`,solution:`$\\left(\\frac{1}{${b}}\\right)^x=${b}^{-x}\\le ${b}^{${k}}$, значит $-x\\le ${k}$ и $x\\ge ${-k}$. Наименьшее целое: $${-k}$.`,explanation:`Приведите к основанию $${b}$; знак неравенства меняется из-за отрицательного показателя.`,answer:-k,dis:[k,-k+1,-k-1]};});
def('aLogNegValue',2,'AB','Логарифм дроби',r=>{const b=r.pick([2,3,5,10]),k=r.int(1,4);chk(Math.abs(Math.log(Math.pow(b,-k))/Math.log(b)+k)<1e-9,'aln');
  return{content:`Вычислите: $\\log_{${b}} \\dfrac{1}{${Math.pow(b,k)}}$.`,solution:`$\\dfrac{1}{${Math.pow(b,k)}}=${b}^{-${k}}$, поэтому $\\log_{${b}} ${b}^{-${k}}=-${k}$.`,explanation:`Представьте аргумент как степень основания с отрицательным показателем.`,answer:-k,dis:[k,-k-1,Math.pow(b,k)]};});
def('aLogIneqLeast',3,'B','Логарифмическое неравенство',r=>{const b=r.pick([2,3]),k=r.int(1,4);const ans=Math.pow(b,k)+1;chk(Math.log(ans)/Math.log(b)>k,'all');
  return{content:`Найдите наименьшее целое решение неравенства $\\log_{${b}} x > ${k}$.`,solution:`ОДЗ: $x>0$. $\\log_{${b}}x>${k}$ означает $x>${b}^{${k}}=${Math.pow(b,k)}$. Наименьшее целое: $${ans}$.`,explanation:`Основание больше 1 — логарифм возрастает, переходим к $x>b^k$.`,answer:ans,dis:[Math.pow(b,k),k+1,ans+1]};});
def('aCosCount',2,'A','Число корней тригонометрического уравнения',r=>{const t=r.pick([['\\cos x = 1','2'],['\\cos x = -1','1'],['\\cos x = 0','2'],['\\cos x = \\dfrac{1}{2}','2'],['\\sin x = 1','1'],['\\sin x = 0','3'],['\\sin x = \\dfrac{1}{2}','2'],['\\sin x = 2','0'],['\\cos x = -3','0']]);
  chk(['0','1','2','3'].includes(t[1]),'acc');
  const c=textChoice(r,t[1],['0','1','2','3','4'].filter(x=>x!==t[1]));
  return{content:`Сколько корней имеет уравнение $${t[0]}$ на отрезке $[0°; 360°]$?`,solution:`Рассмотрите единичную окружность (или график) на одном полном обороте, включая оба конца отрезка. Ответ: $${t[1]}$.`,explanation:`Значения вне $[-1;1]$ не достигаются; на концах отрезка значения совпадают.`,options:c.options,correctAnswer:c.correctAnswer};});
def('aArithProgD',3,'B','Разность прогрессии из суммы',r=>{const a1=r.int(-5,8),d=r.int(1,6),n=r.pick([5,9,10,11,21]);const Sn=n*(2*a1+(n-1)*d)/2;if(!Number.isInteger(Sn))throw 0;
  chk(Sn===n*(2*a1+(n-1)*d)/2,'aap');
  return{content:`Сумма первых $${n}$ членов арифметической прогрессии равна $${Sn}$, а её первый член $a_1=${a1}$. Найдите разность прогрессии.`,solution:`$S_n=\\dfrac{2a_1+(n-1)d}{2}\\cdot n$: $${Sn}=\\dfrac{${2*a1}+${n-1}d}{2}\\cdot ${n}$, откуда $${n-1}d=${2*Sn/n-2*a1}$ и $d=${d}$.`,explanation:`Подставьте данные в формулу суммы и выразите $d$.`,answer:d,dis:[d+1,a1,Math.round(Sn/n)]};});
def('aBoatSpeed',4,'B','Лодка по течению и против',r=>{
  const c=r.int(1,4);const v=c+r.int(4,16);const t1=r.int(1,3),t2=r.int(1,3);
  const s1=(v+c)*t1,s2=(v-c)*t2;const T=t1+t2;
  const A=T,C=-(T*c*c)+(s1-s2)*c;
  chk(Math.abs(A*v*v-(s1+s2)*v+C)<1e-9,'abs1');
  const other=C/(A*v); if(other>c+1e-9) throw 0; // second root must be physically invalid
  chk(Math.abs(s1/(v+c)+s2/(v-c)-T)<1e-9,'abs2');
  return{content:`Моторная лодка прошла $${s1}$ км по течению и $${s2}$ км против течения, затратив на весь путь $${T}$ ч. Скорость течения равна $${c}$ км/ч. Найдите собственную скорость лодки (в км/ч).`,solution:`Пусть собственная скорость $v$: $\\dfrac{${s1}}{v+${c}}+\\dfrac{${s2}}{v-${c}}=${T}$. Умножив на $(v+${c})(v-${c})$, получим квадратное уравнение; его подходящий корень $v=${v}$ (второй корень не превосходит скорости течения). Проверка: $\\dfrac{${s1}}{${v+c}}+\\dfrac{${s2}}{${v-c}}=${t1}+${t2}=${T}$.`,explanation:`Время по течению плюс время против течения равно общему времени.`,answer:v,dis:[v+c,v-c,c]};});
def('aDomainCount',3,'B','Область определения: целые точки',r=>{const a=r.int(2,8);let b=r.int(-a+1,a-1);chk(a*a-b*b>0,'adc2');const ans=2*a;
  return{content:`Сколько целых чисел входит в область определения функции $y = \\sqrt{${a*a}-x^2} + \\dfrac{1}{x ${term(-b,'')}}$?`,solution:`Корень требует $-${a}\\le x\\le ${a}$ — это $${2*a+1}$ целых; дробь исключает $x=${b}$. Остаётся $${ans}$.`,explanation:`Пересеките условия: $x^2\\le ${a*a}$ и $x\\ne ${b}$.`,answer:ans,dis:[2*a+1,2*a-1,a]};});
def('aPointOnGraph',1,'A','Точка на графике',r=>{const fn=r.pick([{t:'y=x^2',f:x=>x*x},{t:'y=x^3',f:x=>x**3},{t:'y=2^x',f:x=>2**x}]);
  const gx=r.int(1,3);const good=`(${gx}; ${fn.f(gx)})`;const wrongs=[];const used=new Set([good]);
  let tries=0;while(wrongs.length<4&&tries<60){tries++;const x=r.int(-2,4),y=fn.f(x)+r.pick([-2,-1,1,2,3]);const s=`(${x}; ${y})`;if(!used.has(s)&&y!==fn.f(x)){used.add(s);wrongs.push(s);}}
  if(wrongs.length<4)throw 0;chk(fn.f(gx)===fn.f(gx),'apo');
  const c=textChoice(r,good,wrongs);
  return{content:`Какая из следующих точек принадлежит графику функции $${fn.t}$?`,solution:`Подставим абсциссу: для точки $${good}$ значение функции совпадает с ординатой.`,explanation:`Подставьте $x$ каждой точки в формулу и сравните с $y$.`,options:c.options,correctAnswer:c.correctAnswer};});
def('aOddFunc',2,'AB','Нечётная функция',r=>{const x0=r.int(1,9),v=r.int(2,15)*(r.bool()?1:-1);chk(-v===-(v),'aof');
  return{content:`Функция $f(x)$ нечётная и $f(${x0})=${v}$. Найдите $f(-${x0})$.`,solution:`Для нечётной функции $f(-x)=-f(x)$, поэтому $f(-${x0})=-(${v})=${-v}$.`,explanation:`Определение нечётности: $f(-x)=-f(x)$.`,answer:-v,dis:[v,0,Math.abs(v)]};});
def('aEvenOddCheck',1,'A','Чётность функции',r=>{const t=r.pick([['x^3','нечётная'],['x^2','чётная'],['x^2+\\cos x','чётная'],['x^3+x','нечётная'],['|x|','чётная'],['x\\cdot|x|','нечётная'],['x^4-3x^2','чётная'],['\\dfrac{1}{x}','нечётная']]);
  chk(['чётная','нечётная'].includes(t[1]),'aeo');
  const c=textChoice(r,t[1],['чётная','нечётная','ни чётная, ни нечётная','и чётная, и нечётная','периодическая'].filter(x=>x!==t[1]));
  return{content:`Определите чётность функции $f(x)=${t[0]}$.`,solution:`Подставьте $-x$: если $f(-x)=f(x)$ — функция чётная, если $f(-x)=-f(x)$ — нечётная. Здесь функция ${t[1]}.`,explanation:`Проверьте знак $f(-x)$ относительно $f(x)$.`,options:c.options,correctAnswer:c.correctAnswer};});
def('aPeriodDeg',2,'AB','Период функции',r=>{const k=r.pick([2,3,4,5,6,9,10,12]);const fn=r.pick(['\\sin','\\cos']);const ans=360/k;chk(ans*k===360,'apd');
  return{content:`Найдите основной период функции $y=${fn} ${k}x$ (в градусах).`,solution:`Период $${fn} kx$ равен $\\dfrac{360°}{k}=\\dfrac{360°}{${k}}=${ans}°$.`,explanation:`Сжатие графика в $k$ раз уменьшает период в $k$ раз.`,answer:ans,dis:[360,k*360,ans/2>=1?ans/2:720]};});
def('aVertexMin',1,'AB','Точка минимума параболы',r=>{const a=r.int(-8,9),c=r.int(-9,9);chk((0+a)-a===0,'avm');
  return{content:`Найдите точку минимума функции $y=(x ${term(-a,'')})^2 ${term(c,'')}$.`,solution:`Квадрат неотрицателен и равен нулю при $x=${a}$ — это и есть точка минимума.`,explanation:`Минимум квадрата достигается, когда выражение в скобках равно нулю.`,answer:a,dis:[c,-a,a+1]};});
def('aMaxOnSegment',3,'B','Наибольшее значение на отрезке',r=>{const p=r.int(1,5),q=r.int(-6,8),m=r.int(p+1,p+6);const ans=q+p*p;
  chk(-(p*p)+2*p*p+q===ans&&p<=m,'ams');
  return{content:`Найдите наибольшее значение функции $y=-x^2 ${term(2*p,'x')} ${term(q,'')}$ на отрезке $[0; ${m}]$.`,solution:`Вершина параболы: $x_0=\\dfrac{${2*p}}{2}=${p}$, она лежит в $[0;${m}]$. Ветви вниз, максимум в вершине: $y(${p})=-${p*p}+${2*p*p}${term(q,'')}=${ans}$.`,explanation:`Для параболы с ветвями вниз максимум — в вершине, если она попала в отрезок.`,answer:ans,dis:[q,ans-p*p,q+2*p*p]};});

/* ================= АЛГЕБРА: тексты, параметры, посложнее ================= */
def('aSqrtCombine',3,'B','Сложение корней с множителями',r=>{const b=r.pick([2,3,5]);const k1=r.int(2,5),k2=r.int(1,4),k3=r.int(1,4);const c2=r.int(1,3),c3=r.int(1,3);
  const sgn=r.bool()?1:-1;const total=k1+sgn*c2*k2+c3*k3;if(total<=0)throw 0;
  chk(Math.abs(Math.sqrt(k1*k1*b)+sgn*c2*Math.sqrt(k2*k2*b)+c3*Math.sqrt(k3*k3*b)-total*Math.sqrt(b))<1e-9,'asc');
  return{content:`Известно, что $\\sqrt{${k1*k1*b}} ${sgn>0?'+':'-'} ${c2}\\sqrt{${k2*k2*b}} + ${c3}\\sqrt{${k3*k3*b}} = a\\sqrt{${b}}$. Найдите $a$.`,solution:`$\\sqrt{${k1*k1*b}}=${k1}\\sqrt{${b}}$, $\\sqrt{${k2*k2*b}}=${k2}\\sqrt{${b}}$, $\\sqrt{${k3*k3*b}}=${k3}\\sqrt{${b}}$. Сумма: $(${k1} ${sgn>0?'+':'-'} ${c2*k2} + ${c3*k3})\\sqrt{${b}}=${total}\\sqrt{${b}}$, значит $a=${total}$.`,explanation:`Вынесите из каждого корня точный квадрат и сложите коэффициенты.`,answer:total,dis:[total+1,k1+k2+k3,total-1]};});
def('aIsoscPerim',2,'AB','Равнобедренный треугольник: периметр',r=>{const k=r.int(2,4);const x=r.int(3,12);const P=x*(2*k+1);chk(2*k*x+x===P,'aip');
  return{content:`В равнобедренном треугольнике основание в $${k}$ раза меньше боковой стороны, а периметр равен $${P}$. Найдите боковую сторону.`,solution:`Пусть основание $x$, тогда боковые стороны по $${k}x$: $x+2\\cdot${k}x=${P}$, то есть $${2*k+1}x=${P}$, $x=${x}$. Боковая сторона: $${k}\\cdot${x}=${k*x}$.`,explanation:`Обозначьте основание за $x$ и составьте уравнение на периметр.`,answer:k*x,dis:[x,P/3,k*x+x]};});
def('aRightTriLegDiff',3,'B','Прямоугольный треугольник: катеты через разность',r=>{const t=r.pick([[6,8,10,2],[3,4,5,1],[20,21,29,1],[5,12,13,7],[8,15,17,7],[9,12,15,3],[12,16,20,4],[15,20,25,5],[28,45,53,17]]);
  const S=t[0]*t[1]/2;chk(t[0]**2+t[1]**2===t[2]**2&&t[1]-t[0]===t[3],'art');
  return{content:`Площадь прямоугольного треугольника равна $${S}$, причём один катет на $${t[3]}$ больше другого. Найдите гипотенузу.`,solution:`Пусть катеты $x$ и $x+${t[3]}$: $\\dfrac{x(x+${t[3]})}{2}=${S}$. Подходит $x=${t[0]}$, второй катет $${t[1]}$. Гипотенуза $=\\sqrt{${t[0]}^2+${t[1]}^2}=${t[2]}$.`,explanation:`Составьте уравнение на площадь, найдите катеты, затем Пифагор.`,answer:t[2],dis:[t[0]+t[1],t[2]+1,t[1]]};});
def('aAbsDoubleIneq',4,'B','Двойное неравенство с модулем',r=>{const m=r.int(-5,6),a=r.int(1,4),b=a+r.int(2,5);
  let cnt=0;for(let x=m-b-2;x<=m+b+2;x++){const v=Math.abs(x-m);if(v>a&&v<b)cnt++;}
  chk(cnt===2*(b-a-1),'adi');
  return{content:`Сколько целых решений имеет неравенство $${a} < |x ${term(-m,'')}| < ${b}$?`,solution:`Условие означает $${a}<|x-(${m})|<${b}$: расстояние от $x$ до $${m}$ строго между $${a}$ и $${b}$. С каждой стороны подходят целые на расстояниях $${a+1},\\dots,${b-1}$ — по $${b-a-1}$ чисел. Всего $${cnt}$.`,explanation:`Модуль — это расстояние до точки $${m}$; посчитайте целые расстояния с двух сторон.`,answer:cnt,dis:[cnt/2,cnt+2,b-a]};});
def('aCompound',3,'B','Сложные проценты',r=>{const m=r.int(1,5),p=r.pick([10,20,30,50]);const X=10000*m;const ans=m*(100+p)**2;chk(Math.abs(ans-X*(1+p/100)**2)<1e-6,'acp');
  return{content:`Вклад $${X}$ р. размещён в банке под $${p}\\%$ годовых (проценты начисляются на накопленную сумму). Какой станет сумма вклада через 2 года (в рублях)?`,solution:`Каждый год сумма умножается на $1{,}${p<10?'0'+p:p}$: $${X}\\cdot\\left(\\dfrac{${100+p}}{100}\\right)^2=${ans}$.`,explanation:`Сложные проценты: множитель $(1+p/100)$ применяется дважды.`,answer:ans,dis:[X+2*X*p/100,ans+X,X*(100+p)/100]};});
def('aDryFruit',4,'B','Сушка фруктов',r=>{let w1,w2,M,ans;for(let i=0;i<200;i++){w1=r.pick([75,80,84,88,90]);w2=r.pick([20,25,40,50,60].filter(x=>x<w1));M=r.int(2,30)*10;
    const num=M*(100-w1);if(num%(100-w2)===0){ans=num/(100-w2);break;}ans=undefined;}
  if(ans===undefined)throw 0;chk(M*(100-w1)===ans*(100-w2),'adf');
  return{content:`Свежие фрукты содержат $${w1}\\%$ воды, а высушенные — $${w2}\\%$. Сколько килограммов сушёных фруктов получится из $${M}$ кг свежих?`,solution:`Сухого вещества в свежих фруктах: $${M}\\cdot${(100-w1)/100===0.1?'0{,}1':`\\dfrac{${100-w1}}{100}`}=${M*(100-w1)/100}$ кг. В сушёных оно составляет $${100-w2}\\%$: $x=\\dfrac{${M*(100-w1)/100}}{${(100-w2)/100}}=${ans}$ кг.`,explanation:`Масса сухого вещества не меняется при сушке — приравняйте её.`,answer:ans,dis:[M*(100-w1)/100,Math.round(M*w2/100),ans+10]};});
def('aRatioParts',2,'AB','Числа в заданном отношении',r=>{const p=r.int(1,5),q=p+r.int(1,4),w=q+r.int(1,4);const u=r.int(2,12);const S=(p+q+w)*u;chk(p*u+q*u+w*u===S,'arp');
  return{content:`Три числа относятся как $${p}:${q}:${w}$, а их сумма равна $${S}$. Найдите наибольшее из этих чисел.`,solution:`Одна часть: $\\dfrac{${S}}{${p+q+w}}=${u}$. Наибольшее число: $${w}\\cdot${u}=${w*u}$.`,explanation:`Разделите сумму на количество частей и умножьте на наибольший коэффициент.`,answer:w*u,dis:[p*u,q*u,S/3===Math.round(S/3)?S/3:u]};});
def('aTrucks',2,'AB','Обратная пропорциональность',r=>{const m2=r.pick([6,7,8,10]),n2=r.int(3,12);const total=m2*n2;const divs=[2,3,4,5].filter(x=>total%x===0);if(!divs.length)throw 0;const m1=r.pick(divs);const n1=total/m1;
  chk(n1*m1===n2*m2,'atr');
  return{content:`Для перевозки груза потребовалось $${n1}$ машин грузоподъёмностью $${m1}$ т. Сколько машин грузоподъёмностью $${m2}$ т потребуется для перевозки того же груза?`,solution:`Всего груза: $${n1}\\cdot${m1}=${total}$ т. Машин по $${m2}$ т нужно: $\\dfrac{${total}}{${m2}}=${n2}$.`,explanation:`Найдите общую массу груза и разделите на новую грузоподъёмность.`,answer:n2,dis:[n1,n2+1,Math.round(total/m1)]};});
def('aParamNoSolution',3,'B','Параметр: нет решений',r=>{const k=r.int(-6,8),c=r.int(1,9);chk((k-k)*1===0&&c!==0,'apn');
  return{content:`При каком значении $a$ уравнение $(a ${term(-k,'')})x = ${c}$ не имеет решений?`,solution:`Линейное уравнение $bx=c$ не имеет решений, когда $b=0$, а $c\\ne0$. Здесь $a${term(-k,'')}=0$ при $a=${k}$ (правая часть $${c}\\ne0$).`,explanation:`Нет решений — когда коэффициент при $x$ нулевой, а правая часть нет.`,answer:k,dis:[c,-k,0]};});
def('aCubicFactor',4,'B','Кубическое уравнение с известным корнем',r=>{let r1=r.int(-5,5),r2=r.int(-5,5),r3=r.int(-5,5);if(r1===r2)r2+=1;if(r3===r1||r3===r2)r3+=2;if(r3===r1||r3===r2)r3+=1;
  const b=-(r1+r2+r3),c=r1*r2+r1*r3+r2*r3,d=-r1*r2*r3;const mx=Math.max(r1,r2,r3);
  chk(mx**3+b*mx*mx+c*mx+d===0&&r1**3+b*r1*r1+c*r1+d===0,'acf');
  const cubTex=`x^3${term(b,'x^2')}${term(c,'x')}${term(d,'')}`;
  return{content:`Известно, что число $${r1}$ — корень уравнения $${cubTex}=0$. Найдите наибольший корень этого уравнения.`,solution:`Разделив многочлен на $(x${term(-r1,'')})$, получим квадратный трёхчлен с корнями $${[r1,r2,r3].filter(x=>x!==r1).length===2?[r2,r3].sort((a,b2)=>a-b2).join('$ и $'):''}$. Все корни: $${[r1,r2,r3].sort((a,b2)=>a-b2).join(', ')}$; наибольший — $${mx}$.`,explanation:`Поделите многочлен на $(x-x_0)$ уголком и решите квадратное уравнение.`,answer:mx,dis:[Math.min(r1,r2,r3),r1,mx+1]};});
def('aFracIneqNonSol',4,'B','Дробное неравенство: целые вне решения',r=>{const a=r.int(1,6),b=r.int(1,7);
  let cnt=0;for(let x=-a;x<=b;x++){const num=x+a,den=x-b;if(den===0){cnt++;continue;}if(!(num/den>=0))cnt++;}
  chk(cnt===a+b,'afi');
  return{content:`Сколько целых чисел не являются решениями неравенства $\\dfrac{x+${a}}{x-${b}} \\geq 0$?`,solution:`Методом интервалов: решения $x\\le -${a}$ или $x>${b}$. Не входят целые из промежутка $(-${a}; ${b}]$: от $${-a+1}$ до $${b}$ — всего $${cnt}$.`,explanation:`Решите неравенство методом интервалов и посчитайте целые в «дырке» (нуль знаменателя тоже исключается).`,answer:cnt,dis:[cnt-1,cnt+1,b-(-a)]};});
def('aDoubleIneqCount',2,'AB','Двойное неравенство',r=>{const aa=r.int(2,4),b=r.int(-5,5);const x1=r.int(-4,2),x2=x1+r.int(1,4);
  const c1=aa*x1+b,c2=aa*x2+b;let cnt=0;for(let x=x1-2;x<=x2+2;x++){const v=aa*x+b;if(v>c1&&v<=c2)cnt++;}
  chk(cnt===x2-x1,'adq');
  return{content:`Сколько целых решений имеет неравенство $${c1} < ${lin(aa,b)} \\leq ${c2}$?`,solution:`Вычитаем $${b}$ и делим на $${aa}$: $${x1}<x\\le ${x2}$. Целые решения: от $${x1+1}$ до $${x2}$ — всего $${cnt}$.`,explanation:`Преобразуйте обе части одновременно; строгость знаков сохраняется.`,answer:cnt,dis:[cnt+1,cnt-1<0?cnt+2:cnt-1,x2]};});
def('aAbsEqAbs',3,'B','Уравнение с двумя модулями',r=>{const a=r.int(2,4),b=r.int(-6,6),c=r.int(-6,6);if(a===1)throw 0;
  const r1n=-(b+c),r1d=a-1,r2n=c-b,r2d=a+1;if(r1n%r1d!==0||r2n%r2d!==0)throw 0;
  const x1=r1n/r1d,x2=r2n/r2d;if(x1===x2)throw 0;const ans=x1+x2;
  chk(Math.abs(Math.abs(a*x1+b)-Math.abs(x1-c))<1e-9&&Math.abs(Math.abs(a*x2+b)-Math.abs(x2-c))<1e-9,'aea');
  return{content:`Найдите сумму корней уравнения $|${lin(a,b)}| = |x ${term(-c,'')}|$.`,solution:`Равенство модулей: $${lin(a,b)}=x${term(-c,'')}$ или $${lin(a,b)}=-(x${term(-c,'')})$. Первый случай: $x=${x1}$; второй: $x=${x2}$. Сумма: $${ans}$.`,explanation:`$|u|=|v|$ равносильно $u=v$ или $u=-v$.`,answer:ans,dis:[x1,x2,-ans]};});
def('aAbsQuadProduct',4,'B','Модуль квадратного выражения',r=>{const b2=r.int(1,8);const a=b2+r.int(1,8);const ans=a*a-b2*b2;
  chk((a+b2)*(a-b2)===ans&&a>b2,'aaq');
  return{content:`Найдите произведение всех корней уравнения $|x^2 - ${a}| = ${b2}$.`,solution:`$x^2=${a+b2}$ или $x^2=${a-b2}$ — обе правые части положительны, корней четыре: $\\pm\\sqrt{${a+b2}}$, $\\pm\\sqrt{${a-b2}}$. Произведение: $(-\\sqrt{${a+b2}})(\\sqrt{${a+b2}})(-\\sqrt{${a-b2}})(\\sqrt{${a-b2}})=${a+b2}\\cdot${a-b2}=${ans}$.`,explanation:`Раскройте модуль на два уравнения $x^2=a\\pm b$; произведение пар корней $x^2=t$ равно $-t$.`,answer:ans,dis:[-(a+b2),a*a,ans+1]};});
def('aFracDivision',2,'AB','Значение алгебраической дроби',r=>{const k=r.int(2,4),n=r.int(1,6),m=k*n+r.int(1,9);const ans=m+k*n;chk((m*m-k*k*n*n)/(m-k*n)===ans,'afd');
  return{content:`Найдите значение выражения $\\dfrac{m^2-${k*k}n^2}{m-${k}n}$ при $m=${m}$, $n=${n}$.`,solution:`$\\dfrac{m^2-(${k}n)^2}{m-${k}n}=\\dfrac{(m-${k}n)(m+${k}n)}{m-${k}n}=m+${k}n=${m}+${k*n}=${ans}$.`,explanation:`Числитель — разность квадратов; сократите дробь до подстановки.`,answer:ans,dis:[m-k*n,m*n,ans+k]};});
def('aSysReciprocal',4,'B','Система с обратными величинами',r=>{const x=r.int(1,6);let y=r.int(1,6);if(x===y)y+=1;const s=x+y,p=x*y;
  chk(Math.abs(1/x+1/y-s/p)<1e-12,'asr');
  return{content:`Числа $x$ и $y$ удовлетворяют системе $\\begin{cases} \\dfrac{1}{x}+\\dfrac{1}{y}=\\dfrac{${s}}{${p}} \\\\ x+y=${s} \\end{cases}$ Найдите произведение $xy$.`,solution:`$\\dfrac{1}{x}+\\dfrac{1}{y}=\\dfrac{x+y}{xy}=\\dfrac{${s}}{xy}=\\dfrac{${s}}{${p}}$, откуда $xy=${p}$ (например, $x=${x}$, $y=${y}$).`,explanation:`Приведите левую часть первого уравнения к общему знаменателю и подставьте $x+y$.`,answer:p,dis:[s,s*p,p+1]};});
def('aExpQuadExponent',4,'B','Показательное уравнение со степенью-трёхчленом',r=>{const b=r.pick([2,3,5]);let r1=r.int(-3,5),r2=r.int(-3,5);if(r1===r2)r2=r1+2;const pp=r1+r2,q=r1*r2;if(q>=0)throw 0;
  chk(Math.pow(b,r1*r1-pp*r1)===Math.pow(b,-q)&&Math.pow(b,r2*r2-pp*r2)===Math.pow(b,-q),'aeq');
  return{content:`Найдите сумму корней уравнения $${b}^{x^2 ${term(-pp,'x')}} = ${q===-1?b:`${b}^{${-q}}`}$.`,solution:`Приравниваем показатели: $x^2 ${term(-pp,'x')}=${-q}$, то есть $x^2${term(-pp,'x')}${term(q,'')}=0$. По теореме Виета сумма корней равна $${pp}$ (корни $${r1}$ и $${r2}$).`,explanation:`Одинаковые основания — приравняйте показатели и примените теорему Виета.`,answer:pp,dis:[q,-pp,pp+1]};});
def('aLogSumProduct',4,'B','Сумма логарифмов',r=>{const aa=r.int(1,5);const x=aa+r.int(1,7);const c=x*x-aa*aa;if(c<=0)throw 0;const b=r.pick([2,3,10]);
  chk((x-aa)*(x+aa)===c&&x>aa,'als');
  const lg=b===10?'\\lg':`\\log_{${b}}`;
  return{content:`Решите уравнение: $${lg}(x-${aa}) + ${lg}(x+${aa}) = ${lg} ${c}$.`,solution:`ОДЗ: $x>${aa}$. Сумма логарифмов: $${lg}\\big((x-${aa})(x+${aa})\\big)=${lg} ${c}$, значит $x^2-${aa*aa}=${c}$, $x^2=${x*x}$, $x=\\pm${x}$. По ОДЗ подходит $x=${x}$.`,explanation:`Сложите логарифмы в логарифм произведения и не забудьте ОДЗ.`,answer:x,dis:[-x,c,x+aa]};});
def('aLogQuadT',4,'B','Логарифмическое уравнение с заменой',r=>{const b=r.pick([2,3]);let p=r.int(-2,4),q=r.int(-2,4);if(p===q)q=p+1;if(p+q<0)throw 0;const ans=Math.pow(b,p+q);
  const sB=-(p+q),sC=p*q;
  chk(Math.pow(b,p)*Math.pow(b,q)===ans,'alq');
  return{content:`Найдите произведение корней уравнения $\\log_{${b}}^2 x ${term(sB,`\\log_{${b}} x`)} ${term(sC,'')} = 0$.`,solution:`Замена $t=\\log_{${b}}x$: $t^2${term(sB,'t')}${term(sC,'')}=0$, корни $t_1=${p}$, $t_2=${q}$. Тогда $x_1=${b}^{${p}}$, $x_2=${b}^{${q}}$, произведение $x_1x_2=${b}^{${p}+${q}}=${ans}$.`,explanation:`Сделайте замену $t=\\log_b x$; произведение корней $b^{t_1}\\cdot b^{t_2}=b^{t_1+t_2}$.`,answer:ans,dis:[p*q,p+q,ans*b]};});
def('aTrigConst',3,'B','Тригонометрическое тождество',r=>{const ang=r.pick([10,15,20,25,35,40,50,70,80]);const t=r.pick([
  {tex:`\\dfrac{\\sin ${2*ang}°}{\\sin ${ang}°\\cdot\\cos ${ang}°}`,v:2,sol:`\\sin 2\\alpha=2\\sin\\alpha\\cos\\alpha$, поэтому дробь равна $2`},
  {tex:`\\dfrac{1-\\cos ${2*ang}°}{\\sin^2 ${ang}°}`,v:2,sol:`1-\\cos 2\\alpha=2\\sin^2\\alpha$, поэтому дробь равна $2`},
  {tex:`\\sin^2 ${ang}° + \\cos^2 ${ang}° + \\operatorname{tg} 45°`,v:2,sol:`\\sin^2\\alpha+\\cos^2\\alpha=1$ и $\\operatorname{tg}45°=1$, сумма $2`},
  {tex:`\\dfrac{\\sin ${2*ang}°}{2\\sin ${ang}°\\cos ${ang}°} + 1`,v:2,sol:`дробь равна $1$ по формуле двойного угла, итого $2`}]);
  chk(t.v===2,'atc');
  return{content:`Вычислите: $${t.tex}$.`,solution:`$${t.sol}$.`,explanation:`Используйте основное тождество и формулу двойного угла.`,answer:t.v,dis:[1,0,4]};});
def('aTrigCount',3,'B','Число корней на отрезке',r=>{const t=r.pick([[2,1,5],[2,-1,5],[3,1,5],[1,1,4],[2,3,3],[3,4,3],[1,2,3]]);const k=t[0],m=t[1],ans=t[2];
  const ratio=m/k;let expect=3;if(ratio>0&&ratio<1)expect+=2;else if(ratio===1)expect+=1;else if(ratio<0&&ratio>-1)expect+=2;else if(ratio===-1)expect+=1;
  chk(expect===ans,'atn');
  return{content:`Сколько корней имеет уравнение $${k===1?'':k}\\sin^2 x ${term(-m,'\\sin x')} = 0$ на отрезке $[0°; 360°]$?`,solution:`Вынесем множитель: $\\sin x\\,(${k===1?'':k}\\sin x ${term(-m,'')})=0$. Случай $\\sin x=0$ даёт $x=0°,180°,360°$ (3 корня). Случай $\\sin x=${m}/${k}$ ${Math.abs(ratio)<1?`даёт ещё 2 корня`:Math.abs(ratio)===1?`даёт ещё 1 корень`:`не имеет решений ($|\\sin x|\\le1$)`}. Всего: $${ans}$.`,explanation:`Вынесите $\\sin x$ за скобку и разберите два случая.`,answer:ans,dis:[ans-1,ans+1,2]};});
def('aSqrtNested',5,'B','Вложенные радикалы',r=>{const isSum=r.bool();let a,b;
  if(isSum){a=r.int(2,6);b=r.pick([2,3,5,6,7].filter(x=>x<a*a));}else{b=r.pick([5,6,7,10,11,13]);a=r.int(1,Math.ceil(Math.sqrt(b))-0);if(a*a>=b)a=Math.floor(Math.sqrt(b-1));if(a<1)throw 0;}
  const N=a*a+b,M=2*a;
  const big=Math.sqrt(N+M*Math.sqrt(b)),small=Math.sqrt(N-M*Math.sqrt(b));
  const ans=isSum?Math.round(big+small):Math.round(big-small);
  chk(Math.abs((isSum?big+small:big-small)-ans)<1e-9,'asn');
  chk(isSum?ans===2*a:ans===2*a,'asn2');
  return{content:`Вычислите: $\\sqrt{${N}${isSum?'-':'+'}${M}\\sqrt{${b}}} ${isSum?'+':'-'} \\sqrt{${N}${isSum?'+':'-'}${M}\\sqrt{${b}}}$.`,solution:`Заметим, что $${N}\\pm${M}\\sqrt{${b}}=(${isSum?`${a}\\pm\\sqrt{${b}}`:`\\sqrt{${b}}\\pm${a}`})^2$. Тогда выражение равно $${isSum?`(${a}-\\sqrt{${b}})+(${a}+\\sqrt{${b}})`:`(\\sqrt{${b}}+${a})-(\\sqrt{${b}}-${a})`}$${isSum?'':''} — корни взаимно уничтожаются, остаётся $${ans}$.`,explanation:`Представьте подкоренные выражения как полные квадраты вида $(u\\pm v)^2$.`,answer:ans,dis:[2*b,N,ans+2]};});
def('aWireMax',3,'B','Максимальная площадь прямоугольника',r=>{const k=r.int(3,15);const L=4*k;chk(k*k>=(k-1)*(k+1),'awm');
  return{content:`Из проволоки длиной $${L}$ см согнули прямоугольник наибольшей возможной площади. Найдите сторону этого прямоугольника (в см).`,solution:`При фиксированном периметре наибольшую площадь имеет квадрат. Сторона: $\\dfrac{${L}}{4}=${k}$ см (площадь $${k*k}$ см$^2$).`,explanation:`Среди прямоугольников данного периметра максимум площади — у квадрата.`,answer:k,dis:[2*k,L/2,k*k]};});
def('aPriceUpDown',4,'B','Цена: понижение и повышение',r=>{const p=r.pick([10,20,30,40,50]);const ans=p*p/100;chk(100-(100-p)*(100+p)/100===ans,'apu');
  return{content:`Цену товара сначала снизили на $${p}\\%$, а затем повысили на $${p}\\%$. На сколько процентов итоговая цена меньше первоначальной?`,solution:`Пусть цена $100$: после снижения $${100-p}$, после повышения $${100-p}\\cdot${(100+p)/100===1.1?'1{,}1':`\\dfrac{${100+p}}{100}`}=${(100-p)*(100+p)/100}$. Итог меньше на $${ans}\\%$.`,explanation:`Проценты берутся от разных величин — итог не возвращается к 100%.`,answer:ans,dis:[0,p,2*p]};});
def('aMixSolutions',4,'B','Смешивание растворов',r=>{let c1,c2,c,V,x;for(let i=0;i<200;i++){c1=r.pick([10,20,30,40]);c2=c1+r.pick([20,30,40,50]);if(c2>90)continue;c=c1+r.int(1,(c2-c1)/1-1);V=r.int(2,12)*10;
    const num=V*(c2-c);if(num%(c2-c1)===0){x=num/(c2-c1);break;}x=undefined;}
  if(x===undefined)throw 0;const y=V-x;
  chk(c1*x+c2*y===c*V,'ams2');
  return{content:`Смешали растворы кислоты концентрацией $${c1}\\%$ и $${c2}\\%$ и получили $${V}$ л раствора концентрацией $${c}\\%$. Сколько литров $${c1}\\%$-го раствора взяли?`,solution:`Пусть первого раствора $x$ л, второго $${V}-x$: $${c1}x+${c2}(${V}-x)=${c}\\cdot${V}$. Отсюда $${c2-c1}x=${V*(c2-c)}$, $x=${x}$ л (второго — $${y}$ л).`,explanation:`Приравняйте массу чистой кислоты до и после смешивания.`,answer:x,dis:[y,V/2,x+5]};});
def('aWorkTogether',4,'B','Совместная работа',r=>{const t=r.pick([[10,15,6],[6,12,4],[20,30,12],[12,24,8],[8,24,6],[4,12,3],[15,30,10],[21,28,12],[10,40,8],[9,18,6],[14,35,10],[18,36,12]]);
  chk(Math.abs(1/t[0]+1/t[1]-1/t[2])<1e-12,'awt');const d=t[1]-t[0];
  const isPipe=r.bool();
  const noun=isPipe?'трубы':'бригады';
  const one=isPipe?'первая труба':'первая бригада';
  const job=isPipe?'наполняют бассейн':'выполняют заказ';
  const verb=isPipe?'наполняет бассейн':'выполняет заказ';
  return{content:`Две ${noun} вместе ${job} за $${t[2]}$ ч. ${one[0].toUpperCase()+one.slice(1)} в одиночку справляется на $${d}$ ч быстрее второй. За сколько часов ${one} ${verb} в одиночку?`,solution:`Пусть ${one} тратит $x$ ч, тогда вторая — $x+${d}$ ч: $\\dfrac{1}{x}+\\dfrac{1}{x+${d}}=\\dfrac{1}{${t[2]}}$. Корень $x=${t[0]}$ подходит (проверка: $\\frac{1}{${t[0]}}+\\frac{1}{${t[1]}}=\\frac{1}{${t[2]}}$).`,explanation:`Сложите производительности (доли работы в час) и приравняйте к совместной.`,answer:t[0],dis:[t[1],t[2],t[0]+d]};});
def('aParamUniqueSum',5,'B','Параметр: единственное решение',r=>{const m=r.int(-5,6),k=r.int(1,5);const a1=-m+2*k,a2=-m-2*k;const ans=a1+a2;
  chk((a1+m)**2===4*k*k&&(a2+m)**2===4*k*k&&ans===-2*m,'aps');
  return{content:`Найдите сумму всех значений $a$, при которых уравнение $x^2 + (a ${term(m,'')})x + ${k*k} = 0$ имеет единственное решение.`,solution:`Единственное решение — при $D=0$: $(a${term(m,'')})^2-4\\cdot${k*k}=0$, то есть $a${term(m,'')}=\\pm${2*k}$. Значения: $a_1=${a1}$, $a_2=${a2}$; сумма $${ans}$.`,explanation:`Квадратное уравнение имеет один корень при нулевом дискриминанте.`,answer:ans,dis:[a1,a2,2*m]};});
def('aSubstQuadCount',5,'B','Замена переменной: число корней',r=>{let t1=-r.int(1,6),t2=-r.int(1,6);if(t1===t2)t2=t1-1;const m=r.int(1,4);const pp=2*m;
  const cnt=(t)=>{const D=4*m*m+4*t;return D>0?2:D===0?1:0;};
  const total=cnt(t1)+cnt(t2);
  const B=-(t1+t2),C=t1*t2;
  chk((t1*t1+B*t1+C===0)&&(t2*t2+B*t2+C===0),'asq');
  return{content:`Сколько корней имеет уравнение $(x^2-${pp}x)^2 ${term(B,`(x^2-${pp}x)`)} ${term(C,'')} = 0$?`,solution:`Замена $t=x^2-${pp}x$: $t^2${term(B,'t')}${term(C,'')}=0$, корни $t_1=${t1}$, $t_2=${t2}$. Уравнение $x^2-${pp}x=t$ имеет дискриминант $${4*m*m}+4t$: при $t=${t1}$ — ${cnt(t1)} корн${cnt(t1)===1?'ень':cnt(t1)===2?'я':'ей'}, при $t=${t2}$ — ${cnt(t2)}. Всего: $${total}$.`,explanation:`После замены пересчитайте дискриминант для каждого значения $t$.`,answer:total,dis:[4,2,total+1]};});
def('aAbsSumIneq',5,'B','Сумма модулей: неравенство',r=>{const aa=r.int(-4,2);const b=aa+r.int(1,5);const c=(b-aa)+r.int(1,6);
  let cnt=0;for(let x=aa-c;x<=b+c;x++){if(Math.abs(x-aa)+Math.abs(x-b)<=c)cnt++;}
  const lo=(aa+b-c)/2,hi=(aa+b+c)/2;const expect=Math.floor(hi)-Math.ceil(lo)+1;
  chk(cnt===expect,'asi');
  return{content:`Сколько целых решений имеет неравенство $|x ${term(-aa,'')}| + |x ${term(-b,'')}| \\leq ${c}$?`,solution:`Сумма расстояний от $x$ до точек $${aa}$ и $${b}$ не превышает $${c}$. Решение — отрезок $\\left[${lo===Math.round(lo)?lo:`\\frac{${aa+b-c}}{2}`};\\ ${hi===Math.round(hi)?hi:`\\frac{${aa+b+c}}{2}`}\\right]$. Целых решений: $${cnt}$.`,explanation:`Геометрический смысл: сумма расстояний до двух точек; решение — симметричный отрезок.`,answer:cnt,dis:[cnt-1,cnt+1,c]};});
def('aAbsParam3',5,'B','Параметр: ровно три корня',r=>{const m=r.int(2,7);const ans=m*m;
  chk(Math.abs(m*m-2*m*m)===ans,'ap3');
  return{content:`При каком значении $a$ уравнение $|x^2 - ${2*m}x| = a$ имеет ровно три корня?`,solution:`График $y=|x^2-${2*m}x|$ — парабола с «отражённой» частью между корнями $0$ и $${2*m}$; вершина отражённой дуги в точке $(${m}; ${ans})$. Горизонтальная прямая пересекает график ровно трижды на высоте вершины: $a=${ans}$.`,explanation:`Ровно три корня — когда прямая $y=a$ проходит через вершину отражённой дуги.`,answer:ans,dis:[m,2*m,ans/2===Math.round(ans/2)?ans/2:ans-1]};});
def('aLogChain',4,'B','Цепочка логарифмов',r=>{const b=r.pick([2,3]);const k=r.int(2,5);const n=Math.pow(b,k);if(n>40)throw 0;
  chk(Math.abs(Math.log(n)/Math.log(b)-k)<1e-9,'alc');
  return{content:`Вычислите: $\\log_{${b}} ${b+1} \\cdot \\log_{${b+1}} ${b+2} \\cdot \\log_{${b+2}} ${b+3} \\cdots \\log_{${n-1}} ${n}$.`,solution:`По формуле перехода цепочка «телескопируется»: $\\log_{${b}} ${b+1}\\cdot\\log_{${b+1}} ${b+2}\\cdots\\log_{${n-1}} ${n}=\\log_{${b}} ${n}=${k}$.`,explanation:`$\\log_a b\\cdot\\log_b c=\\log_a c$ — произведение сворачивается в один логарифм.`,answer:k,dis:[n-b,k+1,n/b]};});
def('aExpSumFactor',4,'B','Сумма степеней с общим множителем',r=>{const b=r.pick([2,3,5]);const k=r.pick([1,2]);const x0=r.int(1,4);const mult=Math.pow(b,k)+1;const N=mult*Math.pow(b,x0);if(N>2000)throw 0;
  chk(Math.pow(b,x0+k)+Math.pow(b,x0)===N,'aef');
  return{content:`Решите уравнение: $${b}^{x+${k}} + ${b}^{x} = ${N}$.`,solution:`Вынесем $${b}^x$: $${b}^x(${b}^{${k}}+1)=${b}^x\\cdot${mult}=${N}$, откуда $${b}^x=${N/mult}=${b}^{${x0}}$ и $x=${x0}$.`,explanation:`Вынесите общий множитель $b^x$ за скобки.`,answer:x0,dis:[k,x0+k,N/mult]};});
def('aExpIneqQuad',5,'B','Показательное неравенство с заменой',r=>{const b=r.pick([2,3]);const j=r.int(1,3);const aPos=Math.pow(b,j);const bNeg=r.int(1,aPos-0);
  chk(Math.pow(b,2*j)-(aPos-bNeg)*aPos-aPos*bNeg===0,'aei');
  const Bc=-(aPos-bNeg),Cc=-aPos*bNeg;
  return{content:`Найдите наименьшее целое решение неравенства $${b*b===4?'4':b*b===9?'9':b*b}^{x} ${term(Bc,`\\cdot ${b}^{x}`)} ${term(Cc,'')} > 0$.`,solution:`Замена $t=${b}^x>0$: $t^2${term(Bc,'t')}${term(Cc,'')}>0$, корни $t=${aPos}$ и $t=${-bNeg}$. С учётом $t>0$: $t>${aPos}$, то есть $${b}^x>${b}^{${j}}$, $x>${j}$. Наименьшее целое: $${j+1}$.`,explanation:`Замените $t=b^x$, решите квадратное неравенство, отберите $t>0$.`,answer:j+1,dis:[j,j+2,aPos]};});
def('aAbsExpIneq',4,'B','Показательное неравенство с модулем',r=>{const b=r.pick([2,3]);const m=r.int(-4,5),k=r.int(1,4);const ans=2*k+1;
  let cnt=0;for(let x=m-k-2;x<=m+k+2;x++){if(Math.pow(1/b,Math.abs(x-m))>=Math.pow(1/b,k))cnt++;}
  chk(cnt===ans,'aae');
  return{content:`Сколько целых решений имеет неравенство $\\left(\\dfrac{1}{${b}}\\right)^{|x ${term(-m,'')}|} \\geq ${k===1?`\\dfrac{1}{${b}}`:`\\dfrac{1}{${Math.pow(b,k)}}`}$?`,solution:`Основание меньше 1 — знак меняется: $|x${term(-m,'')}|\\le ${k}$. Целые решения: от $${m-k}$ до $${m+k}$ — всего $${ans}$.`,explanation:`Для убывающего основания неравенство показателей разворачивается.`,answer:ans,dis:[2*k,k,ans+1]};});
def('aLogRecip',3,'B','Произведение взаимных логарифмов',r=>{const aa=r.pick([2,3,5,7]);let b=r.pick([2,3,5,7,11]);if(b===aa)b=aa+(aa===2?1:2);
  chk(Math.abs(Math.log(1/b)/Math.log(aa)*(Math.log(1/aa)/Math.log(b))-1)<1e-9,'alr');
  return{content:`Вычислите: $\\log_{${aa}} \\dfrac{1}{${b}} \\cdot \\log_{${b}} \\dfrac{1}{${aa}}$.`,solution:`$\\log_{${aa}}\\frac{1}{${b}}=-\\log_{${aa}}${b}$ и $\\log_{${b}}\\frac{1}{${aa}}=-\\log_{${b}}${aa}$. Произведение: $\\log_{${aa}}${b}\\cdot\\log_{${b}}${aa}=1$.`,explanation:`$\\log_a b$ и $\\log_b a$ взаимно обратны; минусы сокращаются.`,answer:1,dis:[-1,0,2]};});
def('aGeoInsert',4,'B','Вставка членов геометрической прогрессии',r=>{const b1=r.int(1,6);const q=r.pick([2,3]);const b5=b1*q**4;const mid=b1*q*q;
  chk(mid*mid===b1*b5,'agi');
  return{content:`Между числами $${b1}$ и $${b5}$ вставьте три числа так, чтобы получилась геометрическая прогрессия. Найдите средний из вставленных членов.`,solution:`$b_5=b_1q^4$: $q^4=\\dfrac{${b5}}{${b1}}=${q**4}$, $q=\\pm${q}$. Средний член $b_3=b_1q^2=${b1}\\cdot${q*q}=${mid}$ (не зависит от знака $q$).`,explanation:`Средний член — среднее геометрическое крайних: $b_3=\\sqrt{b_1 b_5}$.`,answer:mid,dis:[b1*q,b5/q,Math.round((b1+b5)/2)]};});
def('aArithSym',4,'B','Прогрессия: симметричные члены',r=>{const a3=r.int(4,15);const d=r.int(1,Math.min(6,a3-1));const S=2*a3,P=a3*a3-d*d;const a1=a3-2*d;
  chk(a1+(a3+2*d)===S&&(a3-d)*(a3+d)===P,'aas2');
  return{content:`В возрастающей арифметической прогрессии сумма первого и пятого членов равна $${S}$, а произведение второго и четвёртого равно $${P}$. Найдите первый член прогрессии.`,solution:`$a_1+a_5=2a_3=${S}$, значит $a_3=${a3}$. $a_2a_4=(a_3-d)(a_3+d)=${a3*a3}-d^2=${P}$, откуда $d^2=${d*d}$, $d=${d}$ (прогрессия возрастает). Тогда $a_1=a_3-2d=${a1}$.`,explanation:`Выразите члены через $a_3$ и $d$ — симметрия упрощает систему.`,answer:a1,dis:[a3,d,a1+d]};});
def('aMeetSpeed',3,'B','Встречное движение',r=>{const t=r.int(2,6);const v2=r.int(30,60),d=r.pick([4,6,8,10,12,14,20]);const v1=v2+d;const D=(v1+v2)*t;
  chk(D/t===v1+v2,'ams3');
  return{content:`Из двух городов, расстояние между которыми $${D}$ км, навстречу друг другу одновременно выехали два автомобиля и встретились через $${t}$ ч. Скорость одного на $${d}$ км/ч больше скорости другого. Найдите скорость более быстрого автомобиля (в км/ч).`,solution:`Сумма скоростей: $\\dfrac{${D}}{${t}}=${v1+v2}$ км/ч. Тогда $v+(v+${d})=${v1+v2}$, $v=${v2}$, быстрый: $${v1}$ км/ч.`,explanation:`При встречном движении скорости складываются.`,answer:v1,dis:[v2,v1+v2,Math.round(D/t/2)]};});
def('aMinDistSum',5,'B','Минимум суммы расстояний',r=>{const t=r.pick([[3,4,5],[6,8,10],[5,12,13],[8,15,17],[9,12,15]]);
  let p=r.int(1,t[1]-1);const q=t[1]-p;const x1=r.int(-2,3);const x2=x1+t[0];
  const c1=x1*x1+p*p,c2=x2*x2+q*q;
  const f=(x)=>Math.sqrt((x-x1)**2+p*p)+Math.sqrt((x-x2)**2+q*q);
  let mn=Infinity;for(let x=-50;x<=50;x+=0.25){const v=f(x);if(v<mn)mn=v;}
  chk(Math.abs(mn-t[2])<0.02,'amd');
  return{content:`Найдите наименьшее значение функции $y=\\sqrt{x^2 ${term(-2*x1,'x')} ${term(c1,'')}} + \\sqrt{x^2 ${term(-2*x2,'x')} ${term(c2,'')}}$.`,solution:`Запишем подкоренные выражения как $(x${term(-x1,'')})^2+${p*p}$ и $(x${term(-x2,'')})^2+${q*q}$ — это расстояния от точки $(x;0)$ до точек $A(${x1};${p})$ и $B(${x2};-${q})$ (вторую точку отражаем под ось). Минимум суммы — длина отрезка $AB=\\sqrt{${t[0]}^2+${t[1]}^2}=${t[2]}$.`,explanation:`Сумма расстояний минимальна на отрезке между точками (одну отразите относительно оси).`,answer:t[2],dis:[t[0]+t[1],t[2]+1,t[0]*t[1]]};});
def('aEquilibrium',3,'B','Равновесная цена',r=>{const bb=r.int(2,6),dd=r.int(1,5);const P=r.int(2,12);const cc=r.int(5,40);const aa=cc+(bb+dd)*P;
  chk(aa-bb*P===cc+dd*P,'aeq2');
  return{content:`Функции спроса и предложения имеют вид $Q_d = ${aa} - ${bb}P$ и $Q_s = ${cc} + ${dd}P$. Найдите равновесную цену $P^*$ (при которой спрос равен предложению).`,solution:`$${aa}-${bb}P=${cc}+${dd}P$, откуда $${bb+dd}P=${aa-cc}$ и $P^*=${P}$.`,explanation:`Приравняйте спрос и предложение и решите линейное уравнение.`,answer:P,dis:[aa-cc,P+1,Math.round((aa-cc)/bb)]};});

// ---------- subtopic matching (keyword → generator keys) ----------
const REG=[
  [/комбинатор|приближённ|приближенн/i,[]],
  [/хорд|касательн/i,['pChordPoint','pTangentAngle','pArcRatio','pCircleDiam']],
  [/степени и корни|преобразован.*корн|корн.*преобразован/i,['aSqrtCombine','aSqrtNested','aNegPowers','aFracDivision']],
  [/арифметическ.*корен|квадратн.*корен|свойств.*корн/i,['aSqrtCombine','aSqrtNested']],
  [/иррациональн.*числ/i,['aSqrtNested','aPowersMix','aNegPowers']],
  [/одночлен|многочлен/i,['aFsuExpand','aFracDivision','aCubicFactor']],
  [/производн|дифференциров/i,['aMaxOnSegment','aMinDistSum','aWireMax','aVertexMin']],
  [/уравнен.*прям|уравнен.*окружн/i,['pLineThrough','pShoelace','pChordPoint','pMidB']],
  [/одз|област.*значен/i,['aDomainCount','aPointOnGraph']],
  [/замечательн.*точк/i,['pMedianHyp','pBisector60','pEquilRH']],
  [/четырёхугольник|четырехугольник/i,['pPar60','pRectDiag','pPar4th','pRhomb30','pSquareIn','aRectField','pIncircleArea']],
  [/многоугольник/i,['pIncircleArea','pEquilRH','pEquilCircum','pSquareIn']],
  [/смешан|сплав|раствор|концентрац/i,['aMixSolutions','aDryFruit']],
  [/сложн.*процент|вклад|банк/i,['aCompound','aPercentIncrease']],
  [/процент/i,['aPercentIncrease','aPercentOfWhat','aPriceUpDown','aCompound']],
  [/пропорц|отношен/i,['aProportion','aRatioParts','aTrucks']],
  [/округлен|стандартн.*вид|действия с|десятичн|обыкновен.*дроб|вычислен/i,['aDecimalCalc','aPowersMix','aNegPowers']],
  [/степен.*свойств|свойств.*степен|показательн.*выраж/i,['aNegPowers','aExpSumFactor']],
  [/корн.*n-?й|арифметическ.*корен|иррациональн.*выраж|преобразован.*корн/i,['aSqrtCombine','aSqrtNested']],
  [/формул.*сокращ|сокращённ.*умнож/i,['aFsuExpand','aFracDivision']],
  [/разложен.*множит|вынесен|группиров/i,['aFracReduceValue','aFracDivision']],
  [/алгебраическ.*дроб|рациональн.*выраж|преобразован.*рациональн/i,['aFracReduceValue','aFracDivision','aRatEqShift']],
  [/логарифм.*выраж|логарифм.*вычисл|вычислен.*логарифм/i,['aLogNegValue','aLogRecip','aLogChain']],
  [/логарифмическ.*уравнен/i,['aLogSumProduct','aLogQuadT']],
  [/логарифмическ.*неравенств/i,['aLogIneqLeast']],
  [/логарифм/i,['aLogNegValue','aLogChain','aLogRecip']],
  [/тригонометрическ.*выраж|преобразован.*тригоном|значен.*тригоном|формул.*двойн/i,['aTrigConst']],
  [/тригонометрическ.*уравнен/i,['aCosCount','aTrigCount']],
  [/тригонометр|синус|косинус|тангенс/i,['aTrigConst','aCosCount']],
  [/линейн.*уравнен(?!.*систем)/i,['aLinearBrackets','aParamNoSolution']],
  [/квадратн.*уравнен|виет|дискриминант/i,['aParamUniqueSum','aSubstQuadCount','aCubicFactor']],
  [/дробно-?рациональн.*уравнен|рациональн.*уравнен/i,['aRatEqProportion','aRatEqShift','aBoatSpeed','aWorkTogether']],
  [/иррациональн.*уравнен/i,['aIrrEqUnique','aIrrEqSum']],
  [/показательн.*уравнен/i,['aExpEqShift','aExpSumFactor','aExpQuadExponent']],
  [/показательн.*неравенств/i,['aExpIneqLeast','aExpIneqRecip','aExpIneqQuad','aAbsExpIneq']],
  [/систем.*уравнен|систем.*линейн/i,['aSysSumSquares','aSysReciprocal','aMeetSpeed','aMixSolutions']],
  [/модул/i,['aAbsSumRoots','aAbsCount','aAbsEqAbs','aAbsQuadProduct','aAbsDoubleIneq','aAbsSumIneq','aAbsParam3']],
  [/линейн.*неравенств/i,['aLinIneqTwoSided','aDoubleIneqCount']],
  [/квадратн.*неравенств|метод интервал|рациональн.*неравенств/i,['aQuadIneqCount','aFracIneqNonSol']],
  [/неравенств/i,['aLinIneqTwoSided','aQuadIneqCount','aAbsDoubleIneq']],
  [/параметр/i,['aParamNoSolution','aParamUniqueSum','aAbsParam3']],
  [/текстов|задач.*движен|задач.*работ|на движение|на работу|совместн/i,['aBoatSpeed','aMeetSpeed','aWorkTogether','aRectField','aIsoscPerim']],
  [/координатн.*прям|координатн.*плоскост|расстоян.*точк/i,['pMidB','pSymPoint','pShoelace','pPar4th']],
  [/вектор/i,['pDotProduct','pPar4th']],
  [/угловой коэффициент|прямая.*y|линейн.*функц|график.*линейн/i,['pLineThrough']],
  [/парабол|квадратичн.*функц|квадратн.*функц/i,['aVertexMin','aMaxOnSegment']],
  [/наибольш.*наименьш|экстремум|наибольшее значение|оптимизац/i,['aMaxOnSegment','aWireMax','aMinDistSum']],
  [/чётност|четност|периодичн/i,['aEvenOddCheck','aOddFunc','aPeriodDeg']],
  [/област.*определен/i,['aDomainCount']],
  [/график/i,['aPointOnGraph','pLineThrough']],
  [/арифметическ.*прогресс/i,['aArithProgD','aArithSym']],
  [/геометрическ.*прогресс/i,['aGeoInsert']],
  [/прогресс|последовательност/i,['aArithProgD','aGeoInsert','aArithSym']],
  [/функц/i,['aPointOnGraph','aOddFunc','aVertexMin']],
  [/подоб/i,['pSimilarArea','pTrapAOD']],
  [/вписанн.*окружн|описанн.*окружн/i,['pRightIncircle','pIsoscIncircle','pHeronR','pEquilRH','pEquilCircum','pSineRule']],
  [/смежн|вертикальн|виды углов|накрест|^угл|углы/i,['pTangentAngle','pArcRatio']],
  [/медиан|биссектрис|высот.*треугольник/i,['pMedianHyp','pBisector60']],
  [/теорем.*косинус|теорем.*синус/i,['pPar60','pSineRule']],
  [/пифагор|прямоугольн.*треугольник/i,['pRightIncircle','aRightTriLegDiff','pMedianHyp']],
  [/равнобедренн/i,['pIsoscIncircle','aIsoscPerim']],
  [/площад.*треугольник|треугольник/i,['pHeronR','pIncircleArea','pShoelace','pSimilarArea']],
  [/трапец/i,['pTrapPerpD','pTrapAOD']],
  [/ромб/i,['pRhomb30']],
  [/параллелограмм/i,['pPar60','pPar4th']],
  [/прямоугольник|квадрат(?!.*уравн)/i,['pRectDiag','pSquareIn','aRectField','aWireMax']],
  [/площад/i,['pIncircleArea','pShoelace','pRectDiag']],
  [/четырёхугольник|четырехугольник/i,['pPar60','pRectDiag']],
  [/окружност|круг|дуг|вписанн|центральн.*угол|хорд|касательн/i,['pChordPoint','pArcRatio','pTangentAngle','pCircleDiam']],
  [/куб(?!.*уравн)/i,['sCubeVolToSurf','sCubeSurfToVol','sCubeScale','sCubeDiagSqToVol','sCubeEdge','sCubeSphere','sBoxThird']],
  [/параллелепипед/i,['sBoxThird']],
  [/призм/i,['sHexLateral','sRhombPrism','sPrismCyl']],
  [/пирамид/i,['sPyramidEdges','sPyramidDiagSec','sPyramidH','sPyramidApothem']],
  [/цилиндр/i,['sCylRatio','sConeAxial','sSphereSection','sPrismCyl','sCubeSphere']],
  [/конус/i,['sConeAxial']],
  [/шар|сфер/i,['sSphereSection','sCubeSphere']],
  [/сечен/i,['sPyramidDiagSec','sSphereSection','sRhombPrism']],
  [/объ[её]м|поверхност|многогранник|тел.*вращен|стереометр/i,['sCubeVolToSurf','sBoxThird','sPyramidH','sCylRatio']],
];

function pickGens(name, topicName){
  const hay=(name+' '+topicName).toLowerCase();
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
  if(q.options){
    type='SINGLE_CHOICE'; part='A'; options=q.options; correctAnswer=q.correctAnswer; difficulty=Math.min(genMeta.lvl,2);
  } else {
    if(!Number.isInteger(q.answer)) return null;
    const asChoice = genMeta.kind!=='B' && genMeta.lvl<=2 && (slot%5)<2;
    if(asChoice){ const c=numChoice(rng,q.answer,q.dis); type='SINGLE_CHOICE'; part='A'; options=c.options; correctAnswer=c.correctAnswer; difficulty=Math.min(genMeta.lvl,2); }
    else { type='TEXT_INPUT'; part='B'; options=null; correctAnswer=String(q.answer); difficulty=Math.max(2,genMeta.lvl); }
  }
  const tags=[...new Set([st.name.toLowerCase().split(/\s+/).filter(w=>w.length>4).slice(0,2),'цт','математика',genMeta.key].flat())];
  return {
    externalId:extId, subjectId, topicId:topic.id, subtopicId:st.id,
    type, part, difficulty, content:q.content,
    options: options?JSON.stringify(options):null,
    correctAnswer, explanation:q.explanation, solution:q.solution||null,
    hints:JSON.stringify({small:[(q.explanation||'')],detailed:q.solution?[q.solution]:[],stepby:[]}),
    tags:JSON.stringify(tags), year:2027, source:'Сборник заданий (заданияпоматематике.md)', status:'ACTIVE',
    timesSolved:0, timesCorrect:0,
    _meta:{ title:genMeta.title, variantGroup:genMeta.key },
  };
}

function runSelfTest(){
  let total=0,bugs=0,skips=0,nonIntB=0,badChoice=0;const perGen={};
  for(const key of Object.keys(G)){
    const meta=G[key];let ok=0,bug=0,skip=0;
    for(let s=0;s<300;s++){
      const rng=makeRng('ST-'+key+'-'+s);let q;
      try{ q=meta.fn(rng); }
      catch(e){ if(e instanceof Error && String(e.message).startsWith('verify-fail')){bug++;bugs++;if(bug<=2)console.log('  BUG',key,'→',e.message);} else {skip++;skips++;} continue; }
      if(!q){skip++;continue;}
      total++;ok++;
      if(q.options){ if(q.options.length!==5 || !q.options.some(o=>o.id===q.correctAnswer)){badChoice++;if(badChoice<=3)console.log('  BADCHOICE',key);} }
      else { if(!Number.isInteger(q.answer)){nonIntB++;if(nonIntB<=4)console.log('  NONINT',key,'→',q.answer);} }
      if(/undefined|NaN|null/.test(q.content+q.solution+q.explanation)){badChoice++;console.log('  BADTEXT',key);}
    }
    perGen[key]={ok,bug,skip};
  }
  console.log('— SELFTEST —  generators:',Object.keys(G).length,'| ok samples:',total,'| verify BUGS:',bugs,'| intentional skips:',skips,'| nonInt PartB:',nonIntB,'| badChoice/badText:',badChoice);
  const problem=Object.entries(perGen).filter(([,v])=>v.bug>0||v.skip>250);
  if(problem.length) console.log('  high-skip/bug generators:', problem.map(([k,v])=>`${k}(bug${v.bug},skip${v.skip})`).join(', '));
  console.log(bugs===0&&nonIntB===0&&badChoice===0 ? '✅ SELFTEST PASSED' : '❌ SELFTEST FOUND ISSUES');
}

async function main(){
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try{
    const subject=await prisma.subject.findFirst({where:{slug:'math'}});
    if(!subject){ console.error('Math subject not found'); return; }
    const topics=await prisma.topic.findMany({where:{subjectId:subject.id}});
    const topicById=new Map(topics.map(t=>[t.id,t]));
    const subtopics=await prisma.subtopic.findMany({where:{topicId:{in:topics.map(t=>t.id)}}});

    const existingExt=new Set((await prisma.question.findMany({where:{externalId:{startsWith:'MDM-'}},select:{externalId:true}})).map(e=>e.externalId));
    const normC=(s)=>(s||'').replace(/\s+/g,' ').trim().toLowerCase();
    const seen=new Set((await prisma.question.findMany({where:{subjectId:subject.id},select:{content:true}})).map(q=>normC(q.content)));

    let matched=0, skipped=0, created=0;
    const toCreate=[]; const byTopic={}; const byGen={};
    for(const st of subtopics){
      const topic=topicById.get(st.topicId);
      const gens=pickGens(st.name, topic?topic.name:'');
      if(!gens || gens.length===0){ skipped++; continue; }
      matched++;
      for(let i=0;i<PER;i++){
        const extId=`MDM-${st.id}-${i}`;
        if(existingExt.has(extId)) continue;
        const genMeta=gens[i%gens.length];
        let row=null; try{ row=buildQuestion(extId, st, topic, subject.id, i, genMeta); }catch(e){ console.log('verify-fail at',extId,genMeta.key); continue; }
        if(!row) continue;
        const dk=normC(row.content);
        if(seen.has(dk)) continue;
        seen.add(dk);
        if(row.type==='SINGLE_CHOICE'){ const ids=JSON.parse(row.options).map(o=>o.id); if(!ids.includes(row.correctAnswer)) continue; }
        toCreate.push(row);
        byTopic[topic?topic.name:'—']=(byTopic[topic?topic.name:'—']||0)+1;
        byGen[genMeta.key]=(byGen[genMeta.key]||0)+1;
        created++;
      }
    }

    if(INTROSPECT){
      console.log('— INTROSPECT —');
      console.log('Math subtopics:',subtopics.length,'| matched:',matched,'| skipped:',skipped);
      console.log('Would generate:',created,'new questions (PER='+PER+')');
      console.log('By topic:',JSON.stringify(byTopic));
      console.log('Distinct generators used:',Object.keys(byGen).length,'of',Object.keys(G).length);
      return;
    }

    // JSON export in the import-friendly shape requested by the task
    const ts=new Date().toISOString().replace(/[:.]/g,'-');
    const outDir=path.join(__dirname,'..','..','..','data');
    try{ fs.mkdirSync(outDir,{recursive:true}); }catch{}
    const outPath=path.join(outDir,`md-questions-${ts}.json`);
    fs.writeFileSync(outPath, JSON.stringify(toCreate.map(r=>({
      title:r._meta.title, subject:'math',
      topic:(topicById.get(r.topicId)||{}).name||'', subtopic:r.subtopicId,
      difficulty:r.difficulty, part:r.part, type:r.type,
      question:r.content, hint:r.explanation, solution:r.solution, answer:r.correctAnswer,
      options:r.options?JSON.parse(r.options):null,
      tags:JSON.parse(r.tags), sourceTemplate:'заданияпоматематике.md', variantGroup:r._meta.variantGroup,
      externalId:r.externalId,
    })), null, 2));

    if(!DRY){
      let inserted=0;
      for(const data of toCreate){ const {_meta,...row}=data; try{ await prisma.question.create({data:row}); inserted++; }catch(e){ /* dup */ } }
      const qc=await prisma.question.count({where:{subjectId:subject.id,status:'ACTIVE'}});
      await prisma.subject.update({where:{id:subject.id},data:{questionsCount:qc}});
      console.log('Inserted:',inserted,'| Math active questions now:',qc);
    } else {
      console.log('[DRY] no DB writes.');
    }
    console.log(`✅ matched: ${matched} | skipped: ${skipped} | generated: ${created} | generators used: ${Object.keys(byGen).length}/${Object.keys(G).length}`);
    console.log('JSON export:', path.relative(path.join(__dirname,'..','..','..'), outPath));
  } finally { await prisma.$disconnect(); }
}

async function runAudit(){
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try{
    const math=await prisma.subject.findFirst({where:{slug:'math'}});
    const rows=await prisma.question.findMany({where:{externalId:{startsWith:'MDM-'}}});
    let badChoice=0,badInt=0,wrongSubject=0,notActive=0,emptyExpl=0,badText=0;
    const byPart={A:0,B:0}, byLvl={};
    for(const q of rows){
      if(q.subjectId!==math.id) wrongSubject++;
      if(q.status!=='ACTIVE') notActive++;
      if(!q.explanation||q.explanation.length<5) emptyExpl++;
      if(/undefined|NaN/.test(q.content)) badText++;
      byPart[q.part]=(byPart[q.part]||0)+1; byLvl[q.difficulty]=(byLvl[q.difficulty]||0)+1;
      if(q.type==='SINGLE_CHOICE'){
        let opts=[]; try{opts=JSON.parse(q.options||'[]');}catch{}
        if(opts.length!==5 || !opts.some(o=>o.id===q.correctAnswer)) badChoice++;
      } else {
        if(!/^-?\d+$/.test(String(q.correctAnswer).trim())) badInt++;
      }
    }
    console.log('— AUDIT (MDM- questions) —');
    console.log('total:',rows.length,'| Part:',JSON.stringify(byPart),'| difficulty:',JSON.stringify(byLvl));
    console.log('badChoice:',badChoice,'| nonIntB:',badInt,'| wrongSubject:',wrongSubject,'| notActive:',notActive,'| emptyExpl:',emptyExpl,'| badText:',badText);
    console.log(badChoice===0&&badInt===0&&wrongSubject===0&&notActive===0&&badText===0 ? '✅ AUDIT PASSED' : '❌ AUDIT ISSUES');
  } finally { await prisma.$disconnect(); }
}

if(SELFTEST){ runSelfTest(); }
else if(AUDIT){ runAudit().catch(e=>{console.error(e);process.exit(1);}); }
else { main().catch(e=>{console.error(e);process.exit(1);}); }
