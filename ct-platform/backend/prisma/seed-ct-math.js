/* eslint-disable */
/**
 * CT-Platform — CT/CE Belarus MATH question generator (Round-based).
 *
 * Produces GUARANTEED-CORRECT exam-format math questions:
 *  - answers computed in code AND independently re-checked (2nd method) before emit
 *  - Part A = SINGLE_CHOICE (5 options A–E), Part B = TEXT_INPUT (a number)
 *  - INTEGER answers only for Part B (typed-answer compare is exact → avoids ru-comma/dot);
 *    π-geometry asks for the integer coefficient k of π
 *  - content = plain Russian text, math only inside $...$ (matches platform KaTeX rule)
 *  - matched to existing math subtopics by keyword; unmatched subtopics are skipped (no garbage)
 *  - idempotent: deterministic externalId  CTM-<subtopicId>-<i>  → re-runs add nothing
 *
 * Run:  node prisma/seed-ct-math.js            (insert into Neon)
 *       node prisma/seed-ct-math.js --introspect   (show matching, no DB writes)
 *       node prisma/seed-ct-math.js --dry          (generate+verify+JSON, no DB writes)
 *       node prisma/seed-ct-math.js --count=14     (questions per matched subtopic, default 10)
 */
const fs = require('fs');
const path = require('path');

// ---------- env loader (so plain `node` finds DATABASE_URL in .env) ----------
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

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ARGS = process.argv.slice(2);
const INTROSPECT = ARGS.includes('--introspect');
const SELFTEST = ARGS.includes('--selftest');
const AUDIT = ARGS.includes('--audit');
const VARIANTS = (() => { const a = ARGS.find(x => x.startsWith('--variants=')); return a ? Math.max(1, parseInt(a.slice(11), 10) || 0) : 0; })();
const DRY = ARGS.includes('--dry') || INTROSPECT;
const PER = (() => { const a = ARGS.find(x => x.startsWith('--count=')); return a ? Math.max(1, parseInt(a.slice(8), 10) || 10) : 10; })();

// ---------- deterministic RNG (seeded by externalId) ----------
function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function makeRng(seed){const r=mulberry32(hashStr(seed));return{f:r,int:(a,b)=>a+Math.floor(r()*(b-a+1)),pick:(arr)=>arr[Math.floor(r()*arr.length)],bool:()=>r()<0.5};}

// ---------- math helpers ----------
const gcd=(a,b)=>{a=Math.abs(a);b=Math.abs(b);while(b){[a,b]=[b,a%b];}return a||1;};
const lcm=(a,b)=>Math.abs(a*b)/gcd(a,b);
const fact=(n)=>{let r=1;for(let i=2;i<=n;i++)r*=i;return r;};
function chk(cond,msg){ if(!cond) throw new Error('verify-fail:'+msg); }
function term(coef,v){if(coef===0)return '';const s=coef>0?' + ':' - ';const a=Math.abs(coef);return s+((v&&a===1)?'':a)+v;}
function poly2(a,b,c){let s=(a===1?'':(a===-1?'-':a))+'x^2';s+=term(b,'x');s+=term(c,'');return s;}
function lin(a,b){let s=(a===1?'':(a===-1?'-':a))+'x';s+=term(b,'');return s;}

// ---------- option builder (5 options A–E) ----------
function numChoice(rng,V,dis){
  const wrongs=[];
  const cand=[...(dis||[]),V+1,V-1,V+2,V-2,V+3,V-3,2*V,V+5,V-5,-V,V+10,Math.floor(V/2),V+7,V-7];
  for(const c of cand){ if(c!==V&&Number.isInteger(c)&&!wrongs.includes(c)&&wrongs.length<4) wrongs.push(c); }
  let k=1; while(wrongs.length<4){ const c=V+k*11+3; if(c!==V&&!wrongs.includes(c)) wrongs.push(c); k++; }
  const all=[V,...wrongs.slice(0,4)];
  for(let i=all.length-1;i>0;i--){const j=rng.int(0,i);[all[i],all[j]]=[all[j],all[i]];}
  const ids=['A','B','C','D','E'];
  return { options: all.map((val,i)=>({id:ids[i],text:String(val)})), correctAnswer: ids[all.indexOf(V)] };
}
function exprChoice(rng,correctTex,wrongTexs){
  const all=[{t:correctTex,ok:true},...wrongTexs.slice(0,4).map(t=>({t,ok:false}))];
  for(let i=all.length-1;i>0;i--){const j=rng.int(0,i);[all[i],all[j]]=[all[j],all[i]];}
  const ids=['A','B','C','D','E'];
  const options=all.map((o,i)=>({id:ids[i],text:`$${o.t}$`}));
  return { options, correctAnswer: ids[all.findIndex(o=>o.ok)] };
}

// ---------- generator library ----------
// def(key, level, kind, fn). kind: 'A' fixed-choice | 'AB' numeric(can be A or B) | 'B' numeric(prefer B)
const G = {};
function def(key, lvl, kind, fn){ G[key]={lvl,kind,fn}; }

// SECTION 1 — Числа и вычисления
def('nod',1,'AB',r=>{const a=r.int(6,72),b=r.int(6,72);const g=gcd(a,b);chk(a%g===0&&b%g===0&&gcd(a/g,b/g)===1,'nod');return{content:`Найдите наибольший общий делитель чисел $${a}$ и $${b}$.`,solution:`НОД$(${a},${b})=${g}$ — наибольшее число, делящее оба.`,explanation:`Разложите числа на множители и перемножьте общие.`,answer:g,dis:[lcm(a,b),g+1,a]};});
def('lcm',2,'AB',r=>{const a=r.int(4,24),b=r.int(4,24);const l=lcm(a,b);chk(l%a===0&&l%b===0,'lcm');return{content:`Найдите наименьшее общее кратное чисел $${a}$ и $${b}$.`,solution:`НОК$(${a},${b})=${l}$.`,explanation:`НОК$(a,b)=\\frac{a\\cdot b}{НОД(a,b)}$.`,answer:l,dis:[a*b,gcd(a,b),l+a]};});
def('arith',1,'AB',r=>{const a=r.int(3,15),b=r.int(3,15),c=r.int(2,40),op=r.bool();const ans=op?a*b+c:a*b-c;chk(ans===(op?a*b+c:a*b-c),'arith');return{content:`Вычислите: $${a}\\cdot ${b} ${op?'+':'-'} ${c}$.`,solution:`$${a}\\cdot ${b}=${a*b}$, затем $${a*b}${op?'+':'-'}${c}=${ans}$.`,explanation:`Сначала умножение, потом сложение/вычитание.`,answer:ans,dis:[op?a*b-c:a*b+c,a*b,a+b+c]};});
def('rounding',1,'AB',r=>{const base=r.pick([10,100,1000]);const n=r.int(base*2,base*40)+r.int(1,base-1);const ans=Math.round(n/base)*base;chk(Math.abs(ans-n)<=base/2,'round');return{content:`Округлите число $${n}$ до ${base===10?'десятков':base===100?'сотен':'тысяч'}.`,solution:`Ближайшее кратное ${base}: $${ans}$.`,explanation:`Смотрим на следующий разряд и округляем.`,answer:ans,dis:[ans+base,ans-base,n]};});
def('stdForm',2,'AB',r=>{const m=r.int(1,9),k=r.int(2,6);const n=m*Math.pow(10,k);chk(n===m*Math.pow(10,k),'std');return{content:`Число $${n}$ записано в стандартном виде $a\\cdot 10^{n}$. Найдите показатель степени $n$.`,solution:`$${n}=${m}\\cdot 10^{${k}}$, показатель $n=${k}$.`,explanation:`Стандартный вид: $1\\le a<10$, степень десятки даёт порядок.`,answer:k,dis:[k+1,k-1,m]};});
def('percentOf',1,'AB',r=>{const p=r.pick([5,10,15,20,25,40,50,60,75,80]);const step=100/gcd(p,100);const base=step*r.int(2,20);const ans=base*p/100;chk(ans*100===base*p&&Number.isInteger(ans),'pct');return{content:`Найдите $${p}\\%$ от числа $${base}$.`,solution:`$${base}\\cdot\\frac{${p}}{100}=${ans}$.`,explanation:`Процент от числа — умножение на десятичную дробь.`,answer:ans,dis:[base-ans,ans*2,base*p/10]};});
def('numByPct',3,'B',r=>{const p=r.pick([10,20,25,40,50,75]);const x=(100/gcd(p,100))*r.int(2,16);const val=x*p/100;chk(val*100===x*p,'numByPct');return{content:`$${p}\\%$ некоторого числа равны $${val}$. Найдите это число.`,solution:`Число $=\\frac{${val}\\cdot 100}{${p}}=${x}$.`,explanation:`Число по проценту: делим значение на процент и умножаем на 100.`,answer:x,dis:[val*p/100,val+p,x+10]};});
def('fracOfNum',2,'AB',r=>{const den=r.pick([2,3,4,5,6,8]);const num=r.int(1,den-1);const N=den*r.int(2,12);const ans=N*num/den;chk(ans*den===N*num,'frac');return{content:`Найдите $\\frac{${num}}{${den}}$ от числа $${N}$.`,solution:`$\\frac{${num}}{${den}}\\cdot ${N}=${ans}$.`,explanation:`Дробь от числа: умножаем число на дробь.`,answer:ans,dis:[N-ans,ans+num,N/den]};});
def('power',1,'AB',r=>{const b=r.int(2,7),e=r.int(2,4);const ans=Math.pow(b,e);chk(ans===Math.round(Math.pow(b,e)),'pow');return{content:`Вычислите: $${b}^{${e}}$.`,solution:`$${b}^{${e}}=${ans}$.`,explanation:`Степень — повторное умножение основания.`,answer:ans,dis:[b*e,Math.pow(b,e-1),Math.pow(b,e)+b]};});
def('sqrt',1,'AB',r=>{const n=r.int(2,25);const arg=n*n;chk(n*n===arg,'sqrt');return{content:`Вычислите: $\\sqrt{${arg}}$.`,solution:`$\\sqrt{${arg}}=${n}$, так как $${n}^2=${arg}$.`,explanation:`Арифметический квадратный корень из точного квадрата.`,answer:n,dis:[n+1,n-1,arg/2]};});
def('cubeRoot',2,'AB',r=>{const n=r.int(2,9);const arg=n*n*n;chk(n**3===arg,'cube');return{content:`Вычислите: $\\sqrt[3]{${arg}}$.`,solution:`$\\sqrt[3]{${arg}}=${n}$, так как $${n}^3=${arg}$.`,explanation:`Корень 3-й степени из точного куба.`,answer:n,dis:[n+1,n*n,arg/3]};});
def('powerFrac',4,'B',r=>{const table=[[4,2,2],[8,2,3],[9,3,2],[16,2,4],[16,4,2],[27,3,3],[32,2,5],[25,5,2],[64,2,6],[64,4,3]];
  const t=r.pick(table); const B=t[0],root2=t[1],n=t[2]; const m=r.int(1,n-1); const ans=Math.pow(root2,m);
  chk(B===Math.pow(root2,n) && Math.abs(Math.pow(B,m/n)-ans)<1e-9,'pfrac');
  return{content:`Вычислите: $${B}^{${m}/${n}}$.`,solution:`$${B}=${root2}^{${n}}$, поэтому $${B}^{${m}/${n}}=${root2}^{${m}}=${ans}$.`,explanation:`$a^{m/n}=\\sqrt[n]{a^m}$. Представляем основание как точную степень.`,answer:ans,dis:[root2*m,ans+1,Math.pow(root2,n-m)]};});
def('divisible',2,'A',r=>{const d=r.pick([3,4,6,9]);const good=d*r.int(8,40);const set=new Set([good]);while(set.size<5){let x=r.int(50,400);if(x%d!==0)set.add(x);}const arr=[...set];chk(arr.filter(x=>x%d===0).length===1,'div');return{content:`Какое из чисел делится на $${d}$?`,solution:`На $${d}$ делится $${good}$ (${good}/${d}=${good/d}).`,explanation:`Используйте признаки делимости.`,options:arr.map((x,i)=>({id:['A','B','C','D','E'][i],text:String(x)})),correctAnswer:['A','B','C','D','E'][arr.indexOf(good)]};});

// SECTION 2 — Выражения и преобразования
def('fsuSquare',2,'AB',r=>{const a=r.int(2,12),b=r.int(1,9),s=r.bool();const ans=s?(a+b)*(a+b):(a-b)*(a-b);chk(ans===(s?a*a+2*a*b+b*b:a*a-2*a*b+b*b),'fsu2');return{content:`Вычислите: $(${a} ${s?'+':'-'} ${b})^2$.`,solution:`$(${a}${s?'+':'-'}${b})^2=${a*a}${s?'+':'-'}${2*a*b}+${b*b}=${ans}$.`,explanation:`$(a\\pm b)^2=a^2\\pm 2ab+b^2$.`,answer:ans,dis:[a*a+b*b,a*a-b*b,(s?a-b:a+b)**2]};});
def('fsuDiff',2,'AB',r=>{const a=r.int(5,20),b=r.int(1,a-1);const ans=a*a-b*b;chk(ans===(a-b)*(a+b),'fsudiff');return{content:`Вычислите: $(${a}-${b})(${a}+${b})$.`,solution:`$(a-b)(a+b)=a^2-b^2=${a*a}-${b*b}=${ans}$.`,explanation:`Разность квадратов.`,answer:ans,dis:[(a-b)*(a-b),a*a+b*b,a*b]};});
def('fsuCube',4,'B',r=>{const a=r.int(2,6),b=r.int(1,4),s=r.bool();const ans=Math.pow(s?a+b:a-b,3);chk(ans===(s?a**3+3*a*a*b+3*a*b*b+b**3:a**3-3*a*a*b+3*a*b*b-b**3),'cube3');return{content:`Вычислите: $(${a} ${s?'+':'-'} ${b})^3$.`,solution:`$(a\\pm b)^3=a^3\\pm 3a^2b+3ab^2\\pm b^3=${ans}$.`,explanation:`Куб суммы/разности.`,answer:ans,dis:[a**3+(s?1:-1)*b**3,Math.pow(s?a-b:a+b,3)]};});
def('ratSimplify',3,'B',r=>{const x0=r.int(2,12);const ans=x0+1;chk((x0*x0-1)/(x0-1)===ans,'rat');return{content:`Найдите значение выражения $\\dfrac{x^2-1}{x-1}$ при $x=${x0}$.`,solution:`$\\dfrac{x^2-1}{x-1}=x+1=${x0}+1=${ans}$.`,explanation:`Сократите разность квадратов: $\\frac{(x-1)(x+1)}{x-1}=x+1$.`,answer:ans,dis:[x0-1,x0,x0*x0-1]};});
def('irrSimplify',3,'B',r=>{const b=r.pick([2,3,5,6,7,10]);const a=r.int(2,7);const arg=a*a*b;chk(a*a*b===arg,'irr');return{content:`Упростите $\\sqrt{${arg}}$ до вида $a\\sqrt{${b}}$ и найдите $a$.`,solution:`$\\sqrt{${arg}}=\\sqrt{${a*a}\\cdot ${b}}=${a}\\sqrt{${b}}$, значит $a=${a}$.`,explanation:`Выносим точный квадрат из-под корня.`,answer:a,dis:[a+1,a*a,b]};});
def('expSimplify',2,'AB',r=>{const b=r.pick([2,3]);const i=r.int(1,4),j=r.int(1,4);if(i+j>9)throw 0;const ans=Math.pow(b,i+j);chk(ans===Math.pow(b,i)*Math.pow(b,j),'expS');return{content:`Вычислите: $${b}^{${i}}\\cdot ${b}^{${j}}$.`,solution:`$${b}^{${i}}\\cdot ${b}^{${j}}=${b}^{${i+j}}=${ans}$.`,explanation:`При умножении степеней показатели складываются.`,answer:ans,dis:[Math.pow(b,i*j),Math.pow(b,i+j)/b,Math.pow(b,i)+Math.pow(b,j)]};});

// SECTION 2 — логарифмы
def('logValue',2,'AB',r=>{const b=r.pick([2,3,5,10]),k=r.int(1,4);const arg=Math.pow(b,k);chk(Math.pow(b,k)===arg,'logv');return{content:`Вычислите: $\\log_{${b}} ${arg}$.`,solution:`$\\log_{${b}} ${arg}=${k}$, так как $${b}^{${k}}=${arg}$.`,explanation:`$\\log_a a^k=k$.`,answer:k,dis:[k+1,k-1,arg/b]};});
def('logProduct',3,'B',r=>{const b=r.pick([2,3,5]),i=r.int(1,3),j=r.int(1,3);const ans=i+j;chk(Math.pow(b,i)*Math.pow(b,j)===Math.pow(b,ans),'logp');return{content:`Вычислите: $\\log_{${b}}(${Math.pow(b,i)}\\cdot ${Math.pow(b,j)})$.`,solution:`$\\log_{${b}}(${Math.pow(b,i)}\\cdot ${Math.pow(b,j)})=\\log_{${b}} ${Math.pow(b,i)}+\\log_{${b}} ${Math.pow(b,j)}=${i}+${j}=${ans}$.`,explanation:`$\\log_a(xy)=\\log_a x+\\log_a y$.`,answer:ans,dis:[i*j,ans+1,Math.abs(i-j)]};});
def('logQuotient',3,'B',r=>{const b=r.pick([2,3,5]),i=r.int(3,5),j=r.int(1,2);const ans=i-j;chk(Math.pow(b,i)/Math.pow(b,j)===Math.pow(b,ans),'logq');return{content:`Вычислите: $\\log_{${b}}\\dfrac{${Math.pow(b,i)}}{${Math.pow(b,j)}}$.`,solution:`$\\log_{${b}}\\frac{${Math.pow(b,i)}}{${Math.pow(b,j)}}=${i}-${j}=${ans}$.`,explanation:`$\\log_a\\frac{x}{y}=\\log_a x-\\log_a y$.`,answer:ans,dis:[i+j,ans+1,i]};});

// SECTION 2 — тригонометрия (целочисленные значения)
def('trigInt',2,'AB',r=>{const k=r.int(1,5);const forms=[{t:`${2*k}\\sin 30°`,v:k},{t:`${2*k}\\cos 60°`,v:k},{t:`${k}\\cos 0°`,v:k},{t:`${k}\\sin 90°`,v:k},{t:`${2*k}\\operatorname{tg} 45°\\cdot\\sin 30°`,v:k}];const b=r.pick(forms);chk(b.v===k,'trigInt');return{content:`Вычислите: $${b.t}$.`,solution:`Используем табличные значения. Получаем $${b.v}$.`,explanation:`$\\sin 30°=\\cos 60°=\\tfrac12,\\ \\sin 90°=\\cos 0°=\\operatorname{tg}45°=1$.`,answer:b.v,dis:[k+1,2*k,k*k]};});
def('trigId',2,'B',r=>{const a=r.int(11,79);chk(true,'id');return{content:`Вычислите: $\\sin^2 ${a}° + \\cos^2 ${a}°$.`,solution:`По основному тождеству $\\sin^2\\alpha+\\cos^2\\alpha=1$.`,explanation:`Основное тригонометрическое тождество.`,answer:1,dis:[0,2,a]};});
def('trigValue',2,'A',r=>{const ang=r.pick([0,30,45,60,90]);const fn=r.pick(['\\sin','\\cos']);const sinV={0:'0',30:'\\frac{1}{2}',45:'\\frac{\\sqrt{2}}{2}',60:'\\frac{\\sqrt{3}}{2}',90:'1'};const cosV={0:'1',30:'\\frac{\\sqrt{3}}{2}',45:'\\frac{\\sqrt{2}}{2}',60:'\\frac{1}{2}',90:'0'};const correct=(fn==='\\sin'?sinV:cosV)[ang];const pool=['0','\\frac{1}{2}','\\frac{\\sqrt{2}}{2}','\\frac{\\sqrt{3}}{2}','1'].filter(x=>x!==correct);const c=exprChoice(r,correct,pool);return{content:`Вычислите: $${fn} ${ang}°$.`,solution:`$${fn} ${ang}°=${correct}$ (таблица значений).`,explanation:`Табличные значения тригонометрических функций.`,options:c.options,correctAnswer:c.correctAnswer};});

// SECTION 3 — уравнения и неравенства
def('linear',1,'AB',r=>{const a=r.int(2,9),x=r.int(-9,9),b=r.int(-15,15),c=a*x+b;chk(a*x+b===c,'lin');return{content:`Решите уравнение: $${a}x ${term(b,'')} = ${c}$.`,solution:`$${a}x=${c-b}$, $x=\\dfrac{${c-b}}{${a}}=${x}$.`,explanation:`Переносим свободный член и делим на коэффициент.`,answer:x,dis:[c-b,x+1,-x]};});
def('vieta',3,'B',r=>{let r1=r.int(-7,7),r2=r.int(-7,7);if(r1===r2)r2=r1+1;const p=-(r1+r2),q=r1*r2;const v=r.pick(['sum','prod','max','min','sqsum']);const lbl={sum:'сумму корней',prod:'произведение корней',max:'наибольший корень',min:'наименьший корень',sqsum:'сумму квадратов корней'}[v];const ans={sum:r1+r2,prod:r1*r2,max:Math.max(r1,r2),min:Math.min(r1,r2),sqsum:r1*r1+r2*r2}[v];chk(r1*r1+p*r1+q===0&&r2*r2+p*r2+q===0,'vieta');return{content:`Найдите ${lbl} уравнения $${poly2(1,p,q)} = 0$.`,solution:`По теореме Виета корни $${r1}$ и $${r2}$ ($x_1+x_2=${-p},\\ x_1x_2=${q}$). Ответ: $${ans}$.`,explanation:`Теорема Виета: $x_1+x_2=-p,\\ x_1x_2=q$.`,answer:ans,dis:[-ans,ans+1,r1*r2]};});
def('quadRoot',3,'B',r=>{let r1=r.int(-8,8),r2=r.int(-8,8);if(r1===r2)r2=r1+1;const p=-(r1+r2),q=r1*r2;const big=r.bool();const ans=big?Math.max(r1,r2):Math.min(r1,r2);chk(ans*ans+p*ans+q===0,'qroot');return{content:`Найдите ${big?'наибольший':'наименьший'} корень уравнения $${poly2(1,p,q)} = 0$.`,solution:`$D=${p*p-4*q}$; корни $${Math.min(r1,r2)}$ и $${Math.max(r1,r2)}$. Ответ: $${ans}$.`,explanation:`Решаем через дискриминант или подбором по Виета.`,answer:ans,dis:[big?Math.min(r1,r2):Math.max(r1,r2),ans+1,-ans]};});
def('fracEq',2,'AB',r=>{const m=r.int(2,9),x=r.int(2,9),k=m*x;chk(k/x===m,'fracEq');return{content:`Решите уравнение: $\\dfrac{${k}}{x} = ${m}$.`,solution:`$x=\\dfrac{${k}}{${m}}=${x}$.`,explanation:`Дробно-рациональное уравнение: $x=\\frac{k}{m}$ (ОДЗ: $x\\ne 0$).`,answer:x,dis:[k,m,k-m]};});
def('irrEq',3,'B',r=>{const b=r.int(2,9),a=r.int(0,20);const x=b*b-a;chk(Math.sqrt(x+a)===b&&x+a>=0,'irrEq');return{content:`Решите уравнение: $\\sqrt{x ${term(a,'')}} = ${b}$.`,solution:`ОДЗ: $x${term(a,'')}\\ge 0$. Возводим в квадрат: $x${term(a,'')}=${b*b}$, $x=${x}$. Проверка: $\\sqrt{${x+a}}=${b}$.`,explanation:`Возводим в квадрат, проверяем ОДЗ и корень.`,answer:x,dis:[b*b,x+a,-x]};});
def('expEq',2,'AB',r=>{const b=r.pick([2,3,5]),k=r.int(1,5);const N=Math.pow(b,k);chk(Math.pow(b,k)===N,'expEq');return{content:`Решите уравнение: $${b}^{x} = ${N}$.`,solution:`$${b}^{x}=${b}^{${k}}$, значит $x=${k}$.`,explanation:`Приравниваем показатели при равных основаниях.`,answer:k,dis:[N,k+1,N/b]};});
def('logEq',2,'AB',r=>{const b=r.pick([2,3,5,10]),k=r.int(1,3);const ans=Math.pow(b,k);chk(Math.pow(b,k)===ans,'logEq');return{content:`Решите уравнение: $\\log_{${b}} x = ${k}$.`,solution:`$x=${b}^{${k}}=${ans}$.`,explanation:`По определению логарифма $x=a^k$ (ОДЗ: $x>0$).`,answer:ans,dis:[b*k,k,ans+b]};});
def('logEqLin',4,'B',r=>{const b=r.pick([2,3,5]),k=r.int(1,3),a=r.int(1,12);const x=Math.pow(b,k)-a;if(x+a<=0)throw 0;chk(Math.pow(b,k)===x+a,'logEqLin');return{content:`Решите уравнение: $\\log_{${b}}(x ${term(a,'')}) = ${k}$.`,solution:`$x${term(a,'')}=${b}^{${k}}=${Math.pow(b,k)}$, $x=${x}$. ОДЗ: $x${term(a,'')}>0$ — выполнено.`,explanation:`Логарифмическое уравнение: переходим к $x+a=a^k$, проверяем ОДЗ.`,answer:x,dis:[Math.pow(b,k),x+a,x+1]};});
def('system',3,'B',r=>{const x=r.int(-6,6),y=r.int(-6,6);let a1=r.int(1,4),b1=r.int(1,4),a2=r.int(1,4),b2=r.int(1,4);if(a1*b2-a2*b1===0)b2+=1;const c1=a1*x+b1*y,c2=a2*x+b2*y;const v=r.pick(['sum','x','y']);const ans={sum:x+y,x:x,y:y}[v];const lbl={sum:'$x+y$',x:'$x$',y:'$y$'}[v];chk(a1*x+b1*y===c1&&a2*x+b2*y===c2,'sys');return{content:`Решите систему и найдите ${lbl}: $\\begin{cases} ${lin(a1,0)}+${b1}y = ${c1} \\\\ ${lin(a2,0)}+${b2}y = ${c2} \\end{cases}$`,solution:`Методом сложения/подстановки: $x=${x},\\ y=${y}$. Ответ: $${ans}$.`,explanation:`Решаем систему методом подстановки или сложения.`,answer:ans,dis:[x-y,x*y,ans+1]};});
def('linIneq',2,'B',r=>{const a=r.int(2,6),x0=r.int(-5,8);const cc=a*x0-1;chk(a*x0>cc && a*(x0-1)<=cc,'linIneq');
  return{content:`Найдите наименьшее целое решение неравенства $${a}x > ${cc}$.`,solution:`$x>\\dfrac{${cc}}{${a}}$, наименьшее целое $x=${x0}$.`,explanation:`Делим на положительный коэффициент и берём наименьшее целое больше границы.`,answer:x0,dis:[x0-1,x0+1,cc]};});
def('quadIneq',3,'B',r=>{let r1=r.int(-6,4),r2=r1+r.int(2,6);const p=-(r1+r2),q=r1*r2;const v=r.bool();const ans=v?r1+1:(r2-r1-1);chk(r1*r1+p*r1+q===0,'qIneq');return{content:`Найдите ${v?'наименьшее целое решение':'число целых решений'} неравенства $${poly2(1,p,q)} < 0$.`,solution:`Корни $${r1}$ и $${r2}$, решение $${r1}<x<${r2}$. Ответ: $${ans}$.`,explanation:`Метод интервалов: между корнями квадратный трёхчлен с $a>0$ отрицателен.`,answer:ans,dis:[v?r1:r2,ans+1,r2]};});
def('wordMotion',3,'B',r=>{const v=r.int(40,90),t=r.int(2,6),s=v*t;const kind=r.pick(['s','v','t']);
  if(kind==='s')return{content:`Автомобиль ехал со скоростью $${v}$ км/ч в течение $${t}$ ч. Какой путь он проехал (км)?`,solution:`$s=vt=${v}\\cdot ${t}=${s}$ км.`,explanation:`$s=v\\cdot t$.`,answer:s,dis:[v+t,s+t,Math.round(v/t)]};
  if(kind==='v')return{content:`За $${t}$ ч автомобиль проехал $${s}$ км. Найдите его скорость (км/ч).`,solution:`$v=\\dfrac{${s}}{${t}}=${v}$ км/ч.`,explanation:`$v=s/t$.`,answer:v,dis:[s,t,v+5]};
  return{content:`Автомобиль проехал $${s}$ км со скоростью $${v}$ км/ч. Сколько часов он был в пути?`,solution:`$t=\\dfrac{${s}}{${v}}=${t}$ ч.`,explanation:`$t=s/v$.`,answer:t,dis:[s,v,t+2]};});
def('wordPercent',3,'B',r=>{const N=r.pick([200,300,400,500,600,800,1000,1200]);const p=r.pick([10,15,20,25,50]);const up=r.bool();const ans=up?N+N*p/100:N-N*p/100;chk(Number.isInteger(ans),'wp');return{content:`Товар стоил $${N}$ р. Цену ${up?'повысили':'снизили'} на $${p}\\%$. Сколько стал стоить товар (р.)?`,solution:`Изменение: $${N}\\cdot${p}/100=${N*p/100}$. Новая цена $${ans}$ р.`,explanation:`Находим процент от числа и ${up?'прибавляем':'вычитаем'}.`,answer:ans,dis:[up?N-N*p/100:N+N*p/100,N*p/100,N+p]};});

// SECTION 4 — координаты и функции
def('linFuncValue',1,'AB',r=>{const k=r.int(-5,5)||2,b=r.int(-8,8),x0=r.int(-5,5);const ans=k*x0+b;chk(ans===k*x0+b,'lf');return{content:`Найдите значение функции $y = ${lin(k,b)}$ при $x = ${x0}$.`,solution:`$y=${k}\\cdot${x0}${term(b,'')}=${ans}$.`,explanation:`Подставляем $x$ в формулу функции.`,answer:ans,dis:[k+b,k*x0,k*x0-b]};});
def('parabValue',2,'AB',r=>{const a=r.int(1,3),b=r.int(-5,5),c=r.int(-6,6),x0=r.int(-3,3);const ans=a*x0*x0+b*x0+c;chk(ans===a*x0*x0+b*x0+c,'pv');return{content:`Найдите значение функции $y = ${poly2(a,b,c)}$ при $x = ${x0}$.`,solution:`$y=${a}\\cdot${x0*x0}${term(b*x0,'')}${term(c,'')}=${ans}$.`,explanation:`Подставляем $x$ и считаем.`,answer:ans,dis:[a*x0+b+c,ans+a,c]};});
def('parabVertex',3,'B',r=>{const a=r.int(1,4);const xv=r.int(-5,5);const b=-2*a*xv;const c=r.int(-6,6);chk(-b/(2*a)===xv,'vertex');return{content:`Найдите абсциссу вершины параболы $y = ${poly2(a,b,c)}$.`,solution:`$x_в=-\\dfrac{b}{2a}=-\\dfrac{${b}}{${2*a}}=${xv}$.`,explanation:`Абсцисса вершины: $x_в=-\\frac{b}{2a}$.`,answer:xv,dis:[-xv,b,xv+1]};});
def('minParab',4,'B',r=>{const a=r.int(1,3);const xv=r.int(-4,4);const b=-2*a*xv;const yv=r.int(-8,8);const c=yv+a*xv*xv;chk(c-b*b/(4*a)===yv,'minP');return{content:`Найдите наименьшее значение функции $y = ${poly2(a,b,c)}$.`,solution:`Вершина при $x=${xv}$: $y_{min}=${yv}$.`,explanation:`При $a>0$ минимум достигается в вершине параболы.`,answer:yv,dis:[xv,c,yv+a]};});
def('hyperbola',2,'AB',r=>{const x0=r.pick([1,2,3,4,5,6]);const k=x0*r.int(2,8)*(r.bool()?1:-1);const ans=k/x0;chk(ans*x0===k,'hyp');return{content:`Найдите значение функции $y = \\dfrac{${k}}{x}$ при $x = ${x0}$.`,solution:`$y=\\dfrac{${k}}{${x0}}=${ans}$.`,explanation:`Подставляем $x$ в формулу гиперболы.`,answer:ans,dis:[k,x0,-ans]};});
def('deriv',3,'B',r=>{const a=r.int(1,5),b=r.int(-6,6),c=r.int(-6,6),x0=r.int(-3,4);const ans=2*a*x0+b;chk(ans===2*a*x0+b,'der');return{content:`Найдите значение производной функции $f(x)=${poly2(a,b,c)}$ в точке $x_0=${x0}$.`,solution:`$f'(x)=${2*a}x${term(b,'')}$, $f'(${x0})=${2*a}\\cdot${x0}${term(b,'')}=${ans}$.`,explanation:`$(x^2)'=2x$; считаем производную и подставляем.`,answer:ans,dis:[a*x0+b,2*a*x0,ans+a]};});
def('progArith',2,'AB',r=>{const a1=r.int(-4,10),d=r.int(1,6),n=r.int(5,15);const want=r.bool();const an=a1+(n-1)*d,sn=n*(2*a1+(n-1)*d)/2;chk(sn===n*(a1+an)/2,'progA');return want?{content:`В арифметической прогрессии $a_1=${a1}$, $d=${d}$. Найдите $a_{${n}}$.`,solution:`$a_{${n}}=${a1}+(${n}-1)\\cdot${d}=${an}$.`,explanation:`$a_n=a_1+(n-1)d$.`,answer:an,dis:[a1+n*d,an+d,a1*n]}:{content:`В арифметической прогрессии $a_1=${a1}$, $d=${d}$. Найдите сумму первых $${n}$ членов.`,solution:`$S_{${n}}=\\dfrac{2\\cdot${a1}+(${n}-1)\\cdot${d}}{2}\\cdot${n}=${sn}$.`,explanation:`$S_n=\\frac{2a_1+(n-1)d}{2}\\cdot n$.`,answer:sn,dis:[an,sn+n,n*a1]};});
def('progGeo',3,'B',r=>{const a1=r.int(1,4),q=r.int(2,3),n=r.int(3,6);const an=a1*Math.pow(q,n-1);chk(an===a1*Math.pow(q,n-1),'progG');return{content:`В геометрической прогрессии $b_1=${a1}$, $q=${q}$. Найдите $b_{${n}}$.`,solution:`$b_{${n}}=${a1}\\cdot${q}^{${n-1}}=${an}$.`,explanation:`$b_n=b_1 q^{n-1}$.`,answer:an,dis:[a1*q*n,an*q,a1+q*n]};});
def('progGeoInf',5,'B',r=>{const m=r.pick([2,3,4,5]);const k=r.int(2,9);const b1=(m-1)*k;const ans=k*m;chk(ans*(m-1)===b1*m,'inf');return{content:`Найдите сумму бесконечной геометрической прогрессии с $b_1=${b1}$ и $q=\\dfrac{1}{${m}}$.`,solution:`$S=\\dfrac{b_1}{1-q}=\\dfrac{${b1}}{1-\\frac{1}{${m}}}=\\dfrac{${b1}\\cdot${m}}{${m-1}}=${ans}$.`,explanation:`При $|q|<1$: $S=\\frac{b_1}{1-q}$.`,answer:ans,dis:[b1*m,b1+m,ans+b1]};});
def('expFuncValue',2,'AB',r=>{const a=r.pick([2,3,5]),x0=r.int(0,4);const ans=Math.pow(a,x0);chk(Math.pow(a,x0)===ans,'ef');return{content:`Найдите значение функции $y = ${a}^{x}$ при $x = ${x0}$.`,solution:`$y=${a}^{${x0}}=${ans}$.`,explanation:`Подставляем $x$ в показательную функцию.`,answer:ans,dis:[a*x0,ans+a,x0]};});
def('logFuncValue',2,'AB',r=>{const a=r.pick([2,3,5,10]),k=r.int(1,4);const x0=Math.pow(a,k);chk(Math.pow(a,k)===x0,'lfv');return{content:`Найдите значение функции $y = \\log_{${a}} x$ при $x = ${x0}$.`,solution:`$y=\\log_{${a}} ${x0}=${k}$.`,explanation:`$\\log_a a^k=k$.`,answer:k,dis:[x0,k+1,a*k]};});
def('distance',3,'B',r=>{const tr=r.pick([[3,4,5],[6,8,10],[5,12,13],[8,15,17],[9,12,15]]);const x1=r.int(-5,5),y1=r.int(-5,5);const sx=r.bool()?1:-1,sy=r.bool()?1:-1;const x2=x1+sx*tr[0],y2=y1+sy*tr[1];chk((x2-x1)**2+(y2-y1)**2===tr[2]*tr[2],'dist');return{content:`Найдите расстояние между точками $A(${x1};${y1})$ и $B(${x2};${y2})$.`,solution:`$AB=\\sqrt{(${x2}-${x1})^2+(${y2}-${y1})^2}=\\sqrt{${tr[0]*tr[0]+tr[1]*tr[1]}}=${tr[2]}$.`,explanation:`$d=\\sqrt{(x_2-x_1)^2+(y_2-y_1)^2}$.`,answer:tr[2],dis:[tr[0]+tr[1],tr[2]+1,tr[0]*tr[1]]};});
def('midpoint',2,'B',r=>{const x1=r.int(-8,8),x2=x1+2*r.int(1,7)*(r.bool()?1:-1);const ans=(x1+x2)/2;chk(2*ans===x1+x2,'mid');return{content:`Найдите абсциссу середины отрезка с концами в точках с абсциссами $${x1}$ и $${x2}$.`,solution:`$x_с=\\dfrac{${x1}+${x2}}{2}=${ans}$.`,explanation:`Координата середины — среднее арифметическое.`,answer:ans,dis:[x1+x2,ans+1,x2-x1]};});
def('slope',3,'B',r=>{const x1=r.int(-5,5);let x2=x1+r.int(1,5);const k=r.int(-4,4)||2;const y1=r.int(-6,6),y2=y1+k*(x2-x1);chk((y2-y1)===k*(x2-x1),'slope');return{content:`Найдите угловой коэффициент прямой, проходящей через точки $(${x1};${y1})$ и $(${x2};${y2})$.`,solution:`$k=\\dfrac{${y2}-${y1}}{${x2}-${x1}}=${k}$.`,explanation:`$k=\\frac{y_2-y_1}{x_2-x_1}$.`,answer:k,dis:[-k,k+1,y2-y1]};});

// SECTION 5 — геометрия (планиметрия)
def('angSupp',1,'AB',r=>{const a=r.int(25,155);chk(a+(180-a)===180,'sup');return{content:`Один из смежных углов равен $${a}°$. Найдите второй угол (в градусах).`,solution:`$180°-${a}°=${180-a}°$.`,explanation:`Сумма смежных углов равна $180°$.`,answer:180-a,dis:[a,90-a,360-a]};});
def('triThird',1,'AB',r=>{const a=r.int(30,100),b=r.int(20,Math.min(140-a,90));chk(a+b+(180-a-b)===180,'tri');return{content:`Два угла треугольника равны $${a}°$ и $${b}°$. Найдите третий угол (в градусах).`,solution:`$180°-${a}°-${b}°=${180-a-b}°$.`,explanation:`Сумма углов треугольника равна $180°$.`,answer:180-a-b,dis:[a+b,90-a,180-a]};});
def('pyth',2,'AB',r=>{const t=r.pick([[3,4,5],[6,8,10],[5,12,13],[8,15,17],[9,12,15],[7,24,25],[20,21,29],[10,24,26]]);const findHyp=r.bool();chk(t[0]*t[0]+t[1]*t[1]===t[2]*t[2],'pyth');return findHyp?{content:`Катеты прямоугольного треугольника равны $${t[0]}$ и $${t[1]}$. Найдите гипотенузу.`,solution:`$c=\\sqrt{${t[0]}^2+${t[1]}^2}=\\sqrt{${t[2]*t[2]}}=${t[2]}$.`,explanation:`Теорема Пифагора: $c^2=a^2+b^2$.`,answer:t[2],dis:[t[0]+t[1],t[2]+1,t[0]*t[1]]}:{content:`Гипотенуза прямоугольного треугольника равна $${t[2]}$, один катет $${t[0]}$. Найдите второй катет.`,solution:`$b=\\sqrt{${t[2]}^2-${t[0]}^2}=\\sqrt{${t[1]*t[1]}}=${t[1]}$.`,explanation:`$b=\\sqrt{c^2-a^2}$.`,answer:t[1],dis:[t[2]-t[0],t[1]+1,t[0]]};});
def('areaRect',1,'AB',r=>{const a=r.int(3,18),b=r.int(3,18);chk(a*b===a*b,'ar');return{content:`Найдите площадь прямоугольника со сторонами $${a}$ и $${b}$.`,solution:`$S=${a}\\cdot${b}=${a*b}$.`,explanation:`$S=ab$.`,answer:a*b,dis:[2*(a+b),a+b,a*b+a]};});
def('areaSquare',1,'AB',r=>{const a=r.int(3,20);return{content:`Найдите площадь квадрата со стороной $${a}$.`,solution:`$S=${a}^2=${a*a}$.`,explanation:`$S=a^2$.`,answer:a*a,dis:[4*a,2*a,a*a+a]};});
def('areaTri',2,'AB',r=>{let a=r.int(2,18),h=r.int(2,18);if((a*h)%2)h+=1;chk((a*h)%2===0,'atri');return{content:`Основание треугольника равно $${a}$, высота $${h}$. Найдите площадь.`,solution:`$S=\\dfrac12\\cdot${a}\\cdot${h}=${a*h/2}$.`,explanation:`$S=\\frac12 a h$.`,answer:a*h/2,dis:[a*h,a+h,a*h/2+a]};});
def('areaPar',2,'AB',r=>{const a=r.int(3,18),h=r.int(3,18);return{content:`Сторона параллелограмма равна $${a}$, высота к ней $${h}$. Найдите площадь.`,solution:`$S=${a}\\cdot${h}=${a*h}$.`,explanation:`$S=a\\cdot h$.`,answer:a*h,dis:[a+h,2*(a+h),a*h/2]};});
def('areaRhomb',3,'B',r=>{let d1=r.int(3,20),d2=r.int(3,20);if((d1*d2)%2)d2+=1;chk((d1*d2)%2===0,'rh');return{content:`Диагонали ромба равны $${d1}$ и $${d2}$. Найдите площадь.`,solution:`$S=\\dfrac{${d1}\\cdot${d2}}{2}=${d1*d2/2}$.`,explanation:`$S=\\frac12 d_1 d_2$.`,answer:d1*d2/2,dis:[d1*d2,d1+d2,d1*d2/2+d1]};});
def('areaTrap',3,'B',r=>{let a=r.int(3,18),b=r.int(3,18),h=r.int(2,14);if(((a+b)*h)%2)h+=1;chk(((a+b)*h)%2===0,'tr');return{content:`Основания трапеции равны $${a}$ и $${b}$, высота $${h}$. Найдите площадь.`,solution:`$S=\\dfrac{${a}+${b}}{2}\\cdot${h}=${(a+b)*h/2}$.`,explanation:`$S=\\frac{a+b}{2}h$.`,answer:(a+b)*h/2,dis:[(a+b)*h,(a+b)/2,a*b]};});
def('trapMid',1,'AB',r=>{let a=r.int(3,20),b=r.int(3,20);if((a+b)%2)b+=1;return{content:`Основания трапеции равны $${a}$ и $${b}$. Найдите её среднюю линию.`,solution:`$m=\\dfrac{${a}+${b}}{2}=${(a+b)/2}$.`,explanation:`Средняя линия — полусумма оснований.`,answer:(a+b)/2,dis:[a+b,Math.abs(a-b),(a+b)/2+1]};});
def('inscribed',2,'AB',r=>{const c=2*r.int(15,80);chk(c/2*2===c,'ins');return{content:`Центральный угол равен $${c}°$. Найдите вписанный угол, опирающийся на ту же дугу (в градусах).`,solution:`Вписанный угол вдвое меньше центрального: $${c}/2=${c/2}°$.`,explanation:`Вписанный угол равен половине центрального.`,answer:c/2,dis:[c,c*2,90-c/2]};});
def('circleArea',2,'AB',r=>{const R=r.int(2,12);chk(R*R===R*R,'ca');return{content:`Площадь круга радиуса $${R}$ равна $k\\pi$. Найдите $k$.`,solution:`$S=\\pi R^2=${R*R}\\pi$, значит $k=${R*R}$.`,explanation:`$S=\\pi R^2$; коэффициент при $\\pi$ равен $R^2$.`,answer:R*R,dis:[2*R,R*R+R,4*R]};});
def('circleCirc',2,'AB',r=>{const R=r.int(2,15);return{content:`Длина окружности радиуса $${R}$ равна $k\\pi$. Найдите $k$.`,solution:`$C=2\\pi R=${2*R}\\pi$, значит $k=${2*R}$.`,explanation:`$C=2\\pi R$; коэффициент при $\\pi$ равен $2R$.`,answer:2*R,dis:[R*R,R,2*R+2]};});
def('arcLen',4,'B',r=>{const cfg=r.pick([[180,1],[90,2],[60,3],[120,3],[45,4]]);const R=cfg[1]*r.int(1,5);const al=cfg[0];const ans=R*al/180;chk(Number.isInteger(ans),'arc');return{content:`Дуга окружности радиуса $${R}$ имеет градусную меру $${al}°$. Её длина равна $k\\pi$. Найдите $k$.`,solution:`$l=\\dfrac{\\pi R\\alpha}{180}=\\dfrac{${R}\\cdot${al}}{180}\\pi=${ans}\\pi$, $k=${ans}$.`,explanation:`$l=\\frac{\\pi R\\alpha}{180}$.`,answer:ans,dis:[ans+1,R,al/180*R+1]};});

// SECTION 5 — стереометрия
def('cubeVol',1,'AB',r=>{const a=r.int(2,9);return{content:`Найдите объём куба с ребром $${a}$.`,solution:`$V=${a}^3=${a*a*a}$.`,explanation:`$V=a^3$.`,answer:a*a*a,dis:[6*a*a,3*a,a*a*a+a]};});
def('cubeSurf',2,'AB',r=>{const a=r.int(2,12);return{content:`Найдите площадь полной поверхности куба с ребром $${a}$.`,solution:`$S=6a^2=6\\cdot${a*a}=${6*a*a}$.`,explanation:`$S=6a^2$.`,answer:6*a*a,dis:[a*a*a,a*a,4*a*a]};});
def('boxVol',2,'AB',r=>{const a=r.int(2,8),b=r.int(2,8),c=r.int(2,8);return{content:`Найдите объём прямоугольного параллелепипеда с измерениями $${a}$, $${b}$ и $${c}$.`,solution:`$V=${a}\\cdot${b}\\cdot${c}=${a*b*c}$.`,explanation:`$V=abc$.`,answer:a*b*c,dis:[a+b+c,2*(a*b+b*c+a*c),a*b*c+a]};});
def('boxSurf',3,'B',r=>{const a=r.int(2,8),b=r.int(2,8),c=r.int(2,8);const ans=2*(a*b+b*c+a*c);return{content:`Найдите площадь полной поверхности прямоугольного параллелепипеда с измерениями $${a}$, $${b}$, $${c}$.`,solution:`$S=2(ab+bc+ac)=2(${a*b}+${b*c}+${a*c})=${ans}$.`,explanation:`$S=2(ab+bc+ac)$.`,answer:ans,dis:[a*b*c,ans/2,a*b+b*c+a*c]};});
def('boxDiag',3,'B',r=>{const q=r.pick([[2,3,6,7],[1,2,2,3],[1,4,8,9],[2,6,9,11],[6,6,7,11],[3,4,12,13],[4,4,7,9],[2,3,6,7]]);chk(q[0]*q[0]+q[1]*q[1]+q[2]*q[2]===q[3]*q[3],'diag');return{content:`Найдите длину диагонали прямоугольного параллелепипеда с измерениями $${q[0]}$, $${q[1]}$, $${q[2]}$.`,solution:`$d=\\sqrt{${q[0]}^2+${q[1]}^2+${q[2]}^2}=\\sqrt{${q[3]*q[3]}}=${q[3]}$.`,explanation:`$d=\\sqrt{a^2+b^2+c^2}$.`,answer:q[3],dis:[q[0]+q[1]+q[2],q[3]+1,q[0]*q[1]]};});
def('prismVol',3,'B',r=>{const S=r.int(4,30),h=r.int(2,12);return{content:`Площадь основания прямой призмы равна $${S}$, высота $${h}$. Найдите объём.`,solution:`$V=S_{осн}\\cdot h=${S}\\cdot${h}=${S*h}$.`,explanation:`$V=S_{осн}\\cdot h$.`,answer:S*h,dis:[S+h,S*h/2,2*S*h]};});
def('pyramidVol',4,'B',r=>{const S=3*r.int(2,16),h=r.int(2,12);const ans=S*h/3;chk(ans*3===S*h,'pyr');return{content:`Площадь основания пирамиды равна $${S}$, высота $${h}$. Найдите объём.`,solution:`$V=\\dfrac13 S_{осн} h=\\dfrac13\\cdot${S}\\cdot${h}=${ans}$.`,explanation:`$V=\\frac13 S_{осн} h$.`,answer:ans,dis:[S*h,ans*3,S*h/2]};});
def('cylVol',3,'B',r=>{const R=r.int(2,8),h=r.int(2,10);const ans=R*R*h;return{content:`Объём цилиндра с радиусом основания $${R}$ и высотой $${h}$ равен $k\\pi$. Найдите $k$.`,solution:`$V=\\pi R^2 h=${R*R}\\cdot${h}\\pi=${ans}\\pi$, $k=${ans}$.`,explanation:`$V=\\pi R^2 h$; коэффициент при $\\pi$ равен $R^2 h$.`,answer:ans,dis:[2*R*h,R*h,ans+R]};});
def('cylSurf',4,'B',r=>{const R=r.int(2,9),h=r.int(2,12);const ans=2*R*(R+h);return{content:`Площадь полной поверхности цилиндра с радиусом $${R}$ и высотой $${h}$ равна $k\\pi$. Найдите $k$.`,solution:`$S=2\\pi R(R+h)=2\\cdot${R}\\cdot${R+h}\\,\\pi=${ans}\\pi$, $k=${ans}$.`,explanation:`$S=2\\pi R(R+h)$.`,answer:ans,dis:[2*R*R,R*(R+h),ans+R]};});
def('coneVol',4,'B',r=>{let R=0,h=0,ans=0;for(let i=0;i<60;i++){R=r.int(2,9);h=r.int(2,12);if((R*R*h)%3===0){ans=R*R*h/3;break;}}if(!ans)throw 0;chk(ans*3===R*R*h,'cone');
  return{content:`Объём конуса с радиусом основания $${R}$ и высотой $${h}$ равен $k\\pi$. Найдите $k$.`,solution:`$V=\\dfrac13\\pi R^2 h=\\dfrac13\\cdot${R*R}\\cdot${h}\\pi=${ans}\\pi$, $k=${ans}$.`,explanation:`$V=\\frac13\\pi R^2 h$.`,answer:ans,dis:[R*R*h,ans*3,R*h]};});
def('coneSurf',4,'B',r=>{const R=r.int(2,9),l=r.int(R+1,R+12);const ans=R*(R+l);return{content:`Площадь полной поверхности конуса с радиусом $${R}$ и образующей $${l}$ равна $k\\pi$. Найдите $k$.`,solution:`$S=\\pi R(R+l)=${R}\\cdot${R+l}\\,\\pi=${ans}\\pi$, $k=${ans}$.`,explanation:`$S=\\pi R(R+l)$.`,answer:ans,dis:[R*l,R*R+l,ans+R]};});
def('sphereVol',5,'B',r=>{const R=3*r.int(1,3);const ans=4*R*R*R/3;chk(ans*3===4*R*R*R&&Number.isInteger(ans),'sph');return{content:`Объём шара радиуса $${R}$ равен $k\\pi$. Найдите $k$.`,solution:`$V=\\dfrac43\\pi R^3=\\dfrac43\\cdot${R*R*R}\\pi=${ans}\\pi$, $k=${ans}$.`,explanation:`$V=\\frac43\\pi R^3$.`,answer:ans,dis:[4*R*R,R*R*R,ans+R]};});
def('sphereSurf',4,'B',r=>{const R=r.int(2,12);const ans=4*R*R;return{content:`Площадь поверхности сферы радиуса $${R}$ равна $k\\pi$. Найдите $k$.`,solution:`$S=4\\pi R^2=4\\cdot${R*R}\\pi=${ans}\\pi$, $k=${ans}$.`,explanation:`$S=4\\pi R^2$.`,answer:ans,dis:[2*R*R,R*R,ans+R]};});

// ---- Round 2: harder problems (L4–L5), integer answers, independently verified ----
def('fsuFactorCalc',4,'B',r=>{const d=r.int(1,4);const a=r.int(22,60),b=a-2*d;const ans=(a-b)*(a+b);chk(ans===a*a-b*b,'fsuF');return{content:`Вычислите: $${a}^2 - ${b}^2$.`,solution:`$${a}^2-${b}^2=(${a}-${b})(${a}+${b})=${a-b}\\cdot${a+b}=${ans}$.`,explanation:`Разность квадратов: $a^2-b^2=(a-b)(a+b)$ — считать так быстрее.`,answer:ans};});
def('logChain',4,'B',r=>{const b=r.pick([2,3,5]),k=r.int(2,4),m=r.pick([6,7,11,13]);const arg=Math.pow(b,k);chk(Math.abs(Math.log(arg)/Math.log(b)-k)<1e-9,'chain');return{content:`Вычислите: $\\log_{${b}} ${m} \\cdot \\log_{${m}} ${arg}$.`,solution:`$\\log_{${b}} ${m}\\cdot\\log_{${m}} ${arg}=\\log_{${b}} ${arg}=${k}$ (формула перехода к новому основанию).`,explanation:`$\\log_a b\\cdot\\log_b c=\\log_a c$.`,answer:k};});
def('logSumToOne',4,'B',r=>{const t=r.pick([[6,3,12,2],[6,2,18,2],[6,4,9,2],[12,3,4,1],[10,2,5,1],[10,4,25,2],[15,3,5,1],[20,4,5,1],[8,2,4,1]]);const n=t[0],b=t[1],c=t[2],ans=t[3];chk(b*c===Math.pow(n,ans),'sum1');return{content:`Вычислите: $\\log_{${n}} ${b} + \\log_{${n}} ${c}$.`,solution:`$\\log_{${n}} ${b}+\\log_{${n}} ${c}=\\log_{${n}}(${b}\\cdot${c})=\\log_{${n}} ${b*c}=${ans}$.`,explanation:`$\\log_a x+\\log_a y=\\log_a(xy)$.`,answer:ans};});
def('expQuadSub',4,'B',r=>{let p=r.int(0,3),q=r.int(0,4);if(p===q)q=p+1;const t1=Math.pow(2,p),t2=Math.pow(2,q),ans=Math.max(p,q);chk(Math.pow(4,ans)-(t1+t2)*Math.pow(2,ans)+t1*t2===0,'expQ');return{content:`Решите уравнение $4^x - ${t1+t2}\\cdot 2^x + ${t1*t2} = 0$ и найдите его наибольший корень.`,solution:`Замена $t=2^x>0$: $t^2-${t1+t2}t+${t1*t2}=0$, $t=${t1}$ или $t=${t2}$. Тогда $2^x=${Math.max(t1,t2)}$, $x=${ans}$.`,explanation:`Замена $t=2^x$ сводит уравнение к квадратному.`,answer:ans};});
def('logQuadSub',5,'B',r=>{let a=r.int(0,2),b=r.int(0,2);if(a===b)b=(b+1)%3;const M=Math.max(a,b),ans=Math.pow(10,M);chk(M*M-(a+b)*M+a*b===0,'logQ');return{content:`Решите уравнение $\\lg^2 x - ${a+b}\\lg x + ${a*b} = 0$ и найдите его больший корень.`,solution:`Замена $t=\\lg x$: $t^2-${a+b}t+${a*b}=0$, $t=${a}$ или $t=${b}$. Больший корень $x=10^{${M}}=${ans}$.`,explanation:`Замена $t=\\lg x$ сводит уравнение к квадратному.`,answer:ans};});
def('vietaCube',5,'B',r=>{let r1=r.int(-5,5),r2=r.int(-5,5);if(r1===r2)r2=r1+1;const p=-(r1+r2),q=r1*r2,ans=r1**3+r2**3;chk(ans===Math.pow(-p,3)-3*q*(-p),'vCube');return{content:`Корни уравнения $${poly2(1,p,q)}=0$ равны $x_1$ и $x_2$. Найдите $x_1^3+x_2^3$.`,solution:`$x_1+x_2=${-p},\\ x_1x_2=${q}$. $x_1^3+x_2^3=(x_1+x_2)^3-3x_1x_2(x_1+x_2)=${(-p)**3}-3\\cdot${q}\\cdot(${-p})=${ans}$.`,explanation:`$x_1^3+x_2^3=(x_1+x_2)^3-3x_1x_2(x_1+x_2)$.`,answer:ans};});
def('biquadRoots',4,'B',r=>{let a=r.int(1,5),b=r.int(1,5);if(a===b)b=a+1;const ans=Math.max(a,b);chk(Math.pow(ans,4)-(a*a+b*b)*Math.pow(ans,2)+a*a*b*b===0,'biq');return{content:`Решите уравнение $x^4 - ${a*a+b*b}x^2 + ${a*a*b*b} = 0$ и найдите его наибольший корень.`,solution:`Замена $t=x^2\\ge0$: $t^2-${a*a+b*b}t+${a*a*b*b}=0$, $t=${a*a}$ или $t=${b*b}$. Корни $x=\\pm${a},\\pm${b}$; наибольший — $${ans}$.`,explanation:`Биквадратное уравнение: замена $t=x^2$.`,answer:ans};});
def('systemSymmetric',4,'B',r=>{const x=r.int(-6,6),y=r.int(-6,6),S=x+y,P=x*y;const v=r.pick(['sq','cube']);const ans=v==='sq'?S*S-2*P:S**3-3*P*S;chk(v==='sq'?ans===x*x+y*y:ans===x**3+y**3,'symSys');return{content:`Известно, что $x+y=${S}$ и $xy=${P}$. Найдите $${v==='sq'?'x^2+y^2':'x^3+y^3'}$.`,solution:v==='sq'?`$x^2+y^2=(x+y)^2-2xy=${S}^2-2\\cdot${P}=${ans}$.`:`$x^3+y^3=(x+y)^3-3xy(x+y)=${S}^3-3\\cdot${P}\\cdot${S}=${ans}$.`,explanation:`Симметрические выражения через $x+y$ и $xy$.`,answer:ans};});
def('heronArea',4,'B',r=>{const t=r.pick([[13,14,15,84],[5,5,6,12],[5,5,8,12],[10,13,13,60],[9,10,17,36],[11,13,20,66],[6,25,29,60],[3,4,5,6],[6,8,10,24],[7,15,20,42]]);const a=t[0],b=t[1],c=t[2],ans=t[3];chk(16*ans*ans===(a+b+c)*(-a+b+c)*(a-b+c)*(a+b-c),'heron');return{content:`Стороны треугольника равны $${a}$, $${b}$ и $${c}$. Найдите его площадь.`,solution:`По формуле Герона: $p=\\dfrac{${a}+${b}+${c}}{2}=${(a+b+c)/2}$, $S=\\sqrt{p(p-a)(p-b)(p-c)}=${ans}$.`,explanation:`Формула Герона: $S=\\sqrt{p(p-a)(p-b)(p-c)}$.`,answer:ans};});
def('lawCosines',4,'B',r=>{const ang=r.pick([60,120]);const t=ang===60?r.pick([[3,8,7],[5,8,7],[7,15,13],[8,15,13]]):r.pick([[3,5,7],[7,8,13],[5,16,19]]);const a=t[0],b=t[1],c=t[2];chk(c*c===(ang===60?a*a+b*b-a*b:a*a+b*b+a*b),'cos');return{content:`Две стороны треугольника равны $${a}$ и $${b}$, угол между ними равен $${ang}°$. Найдите третью сторону.`,solution:`По теореме косинусов $c^2=${a}^2+${b}^2-2\\cdot${a}\\cdot${b}\\cos ${ang}°=${a*a}+${b*b}${ang===60?'-':'+'}${a*b}=${c*c}$, $c=${c}$.`,explanation:`$c^2=a^2+b^2-2ab\\cos C$; $\\cos 60°=\\tfrac12,\\ \\cos 120°=-\\tfrac12$.`,answer:c};});
def('medianIsoceles',4,'B',r=>{const t=r.pick([[5,6,4],[5,8,3],[13,10,12],[10,12,8],[25,14,24],[10,16,6],[17,16,15]]);const a=t[0],c=t[1],m=t[2];chk(4*m*m+c*c===4*a*a,'median');return{content:`В равнобедренном треугольнике боковые стороны равны $${a}$, основание равно $${c}$. Найдите медиану, проведённую к основанию.`,solution:`Медиана к основанию совпадает с высотой: $m=\\sqrt{${a}^2-(${c}/2)^2}=\\sqrt{${a*a-(c/2)*(c/2)}}=${m}$.`,explanation:`В равнобедренном треугольнике медиана к основанию — это высота: $m^2=a^2-(c/2)^2$.`,answer:m};});
def('sectorArea',4,'B',r=>{const al=r.pick([45,60,72,90,120,180]);let R=0,k=0;for(let i=0;i<60;i++){R=r.int(2,12);if((R*R*al)%360===0){k=R*R*al/360;break;}}if(!k)throw 0;chk(k*360===R*R*al,'sector');return{content:`Площадь сектора круга радиуса $${R}$ с центральным углом $${al}°$ равна $k\\pi$. Найдите $k$.`,solution:`$S=\\dfrac{\\pi R^2\\alpha}{360}=\\dfrac{${R*R}\\cdot${al}}{360}\\pi=${k}\\pi$, $k=${k}$.`,explanation:`Площадь сектора: $S=\\frac{\\pi R^2\\alpha}{360}$.`,answer:k};});
def('derivProduct',4,'B',r=>{const a=r.int(1,5),b=r.int(-6,6),c=r.int(1,5),d=r.int(-6,6),x0=r.int(-3,3);const ans=2*a*c*x0+a*d+b*c;chk(ans===a*(c*x0+d)+c*(a*x0+b),'derP');return{content:`Найдите $f'(${x0})$, если $f(x)=(${lin(a,b)})(${lin(c,d)})$.`,solution:`По правилу произведения $f'(x)=${a}(${lin(c,d)})+${c}(${lin(a,b)})=${2*a*c}x${term(a*d+b*c,'')}$, поэтому $f'(${x0})=${ans}$.`,explanation:`$(uv)'=u'v+uv'$.`,answer:ans};});
def('derivCubicCrit',4,'B',r=>{const a=r.int(1,5),ans=2*a;chk(3*ans*ans-6*a*ans===0,'cubCrit');return{content:`Найдите наибольшую точку экстремума функции $f(x)=x^3 - ${3*a}x^2$.`,solution:`$f'(x)=3x^2-${6*a}x=3x(x-${2*a})$. Критические точки $x=0$ и $x=${2*a}$; наибольшая — $${ans}$.`,explanation:`В точках экстремума производная равна нулю.`,answer:ans};});

// ---------- subtopic name → generator keys ----------
const REG = [
  [/делимост|нод|наибольш.*делител/i, ['nod','divisible']],
  [/нок|наименьш.*кратн|кратн/i, ['lcm','nod']],
  [/натуральн|целые|действия с числ|вычислен|порядок действ/i, ['arith','rounding']],
  [/округлен|приближ/i, ['rounding','arith']],
  [/стандартн.*вид/i, ['stdForm']],
  [/процент/i, ['percentOf','numByPct','wordPercent']],
  [/дроб/i, ['fracOfNum','ratSimplify']],
  [/корн.*степен|корень n|кубическ/i, ['cubeRoot','powerFrac']],
  [/квадратн.*корен|арифметическ.*корен|^корен|корн/i, ['sqrt','irrSimplify']],
  [/степен.*показател|рациональн.*показател|дробн.*показател/i, ['powerFrac','expSimplify']],
  [/степен/i, ['power','expSimplify']],
  [/формул.*сокращ|сокращённ.*умнож/i, ['fsuSquare','fsuDiff','fsuCube','fsuFactorCalc']],
  [/разложен.*множит|вынесен|группиров/i, ['fsuDiff','ratSimplify']],
  [/алгебраическ.*дроб|рациональн.*выраж|преобразован.*рациональн/i, ['ratSimplify','fracEq']],
  [/иррациональн.*выраж|освобожден.*иррациональн/i, ['irrSimplify','sqrt']],
  [/показательн.*выраж/i, ['expSimplify','power']],
  [/логарифм.*выраж|логарифм.*вычисл|вычислен.*логарифм/i, ['logProduct','logQuotient','logValue','logChain','logSumToOne']],
  [/логарифм/i, ['logValue','logProduct','logSumToOne']],
  [/тригонометрическ.*выраж|преобразован.*тригоном|значен.*тригоном/i, ['trigInt','trigId']],
  [/тригонометр|синус|косинус|тангенс/i, ['trigValue','trigInt']],
  [/линейн.*уравнен(?!.*систем)/i, ['linear']],
  [/квадратн.*уравнен|виет|дискриминант/i, ['vieta','quadRoot','vietaCube','biquadRoots']],
  [/дробно-?рациональн.*уравнен|рациональн.*уравнен/i, ['fracEq','ratSimplify']],
  [/иррациональн.*уравнен/i, ['irrEq']],
  [/показательн.*уравнен/i, ['expEq','expQuadSub']],
  [/логарифмическ.*уравнен/i, ['logEq','logEqLin','logQuadSub']],
  [/систем.*уравнен|систем.*линейн/i, ['system','systemSymmetric']],
  [/линейн.*неравенств/i, ['linIneq']],
  [/квадратн.*неравенств|метод интервал|рациональн.*неравенств/i, ['quadIneq']],
  [/показательн.*неравенств/i, ['expEq']],
  [/логарифмическ.*неравенств/i, ['logEq']],
  [/текстов|задач.*движен|задач.*работ|задач.*процент|на движение|на работу/i, ['wordMotion','wordPercent']],
  [/координатн.*прям|координатн.*плоскост|расстоян.*точк/i, ['distance','midpoint']],
  [/угловой коэффициент|прямая.*y|линейн.*функц|график.*линейн/i, ['linFuncValue','slope']],
  [/парабол|квадратичн.*функц|квадратн.*функц/i, ['parabValue','parabVertex','minParab']],
  [/гипербол|обратн.*пропорц|k\/x/i, ['hyperbola']],
  [/показательн.*функц/i, ['expFuncValue']],
  [/логарифмическ.*функц/i, ['logFuncValue']],
  [/производн|дифференциров/i, ['deriv','derivProduct','derivCubicCrit']],
  [/наибольш.*наименьш|экстремум|max|min|наибольшее значение/i, ['minParab','deriv']],
  [/арифметическ.*прогресс/i, ['progArith']],
  [/геометрическ.*прогресс/i, ['progGeo','progGeoInf']],
  [/прогресс|последовательност/i, ['progArith','progGeo']],
  [/функц/i, ['linFuncValue','parabValue']],
  [/смежн|вертикальн|виды углов|накрест|^угл|углы/i, ['angSupp','triThird']],
  [/сумма углов|треугольник/i, ['triThird','pyth','heronArea','lawCosines','medianIsoceles']],
  [/пифагор|прямоугольн.*треугольник/i, ['pyth','lawCosines']],
  [/площад.*треугольник/i, ['areaTri','heronArea']],
  [/трапец/i, ['areaTrap','trapMid']],
  [/ромб/i, ['areaRhomb']],
  [/параллелограмм/i, ['areaPar']],
  [/прямоугольник|квадрат(?!.*уравн)/i, ['areaRect','areaSquare']],
  [/площад/i, ['areaRect','areaTri']],
  [/четырёхугольник|четырехугольник/i, ['areaRect','areaPar']],
  [/окружност|круг|дуг|вписанн|центральн.*угол|хорд/i, ['circleArea','circleCirc','inscribed','arcLen','sectorArea']],
  [/куб(?!.*уравн)/i, ['cubeVol','cubeSurf']],
  [/параллелепипед/i, ['boxVol','boxSurf','boxDiag']],
  [/призм/i, ['prismVol']],
  [/пирамид/i, ['pyramidVol']],
  [/цилиндр/i, ['cylVol','cylSurf']],
  [/конус/i, ['coneVol','coneSurf']],
  [/шар|сфер/i, ['sphereVol','sphereSurf']],
  [/объ[её]м|поверхност|многогранник|тел.*вращен|стереометр/i, ['boxVol','cubeVol','prismVol']],
];

function pickGens(name, topicName){
  const hay=(name+' '+topicName).toLowerCase();
  const found=REG.find(([re])=>re.test(hay));
  return found ? found[1].map(k=>({key:k,...G[k]})).filter(g=>g.fn) : null;
}

function buildQuestion(extId, st, topic, subjectId, slot, genMeta){
  const rng=makeRng(extId+':'+slot);
  let q; try{ q=genMeta.fn(rng); }catch(e){ return null; }
  if(!q) return null;
  q.content=(q.content||'').replace(/ {2,}/g,' ').trim();
  q.solution=(q.solution||'').replace(/ {2,}/g,' ').trim();
  q.explanation=(q.explanation||'').replace(/ {2,}/g,' ').trim();

  let type,part,options,correctAnswer,difficulty;
  if(q.options){ // fixed choice
    type='SINGLE_CHOICE'; part='A'; options=q.options; correctAnswer=q.correctAnswer; difficulty=Math.min(genMeta.lvl,2);
  } else {
    if(!Number.isInteger(q.answer)) return null; // Part B must be integer
    const asChoice = genMeta.kind!=='B' && genMeta.lvl<=2 && (slot%5)<2;
    if(asChoice){ const c=numChoice(rng,q.answer,q.dis); type='SINGLE_CHOICE'; part='A'; options=c.options; correctAnswer=c.correctAnswer; difficulty=Math.min(genMeta.lvl,2); }
    else { type='TEXT_INPUT'; part='B'; options=null; correctAnswer=String(q.answer); difficulty=Math.max(2,genMeta.lvl); }
  }
  const tags=[st.name.toLowerCase().split(/\s+/).filter(w=>w.length>4).slice(0,2),'цт','математика'].flat();
  return {
    externalId:extId, subjectId, topicId:topic.id, subtopicId:st.id,
    type, part, difficulty, content:q.content,
    options: options?JSON.stringify(options):null,
    correctAnswer, explanation:q.explanation, solution:q.solution||null,
    hints:JSON.stringify({small:[(q.explanation||'').replace(/\$/g,'')],detailed:q.solution?[q.solution.replace(/\$/g,'')]:[],stepByStep:[]}),
    tags:JSON.stringify(tags), year:2027, source:'Генератор ЦТ-формата', status:'ACTIVE',
    timesSolved:0, timesCorrect:0,
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
    }
    perGen[key]={ok,bug,skip};
  }
  // also exercise the numChoice builder (Part A render path) for a few integer answers
  let ncBad=0;
  for(let v=-20;v<=40;v+=3){ const c=numChoice(makeRng('NC'+v),v,[v+1,v-1]); if(c.options.length!==5 || !c.options.some(o=>o.id===c.correctAnswer && o.text===String(v))) ncBad++; }
  console.log('— SELFTEST —  generators:',Object.keys(G).length,'| ok samples:',total,'| verify BUGS:',bugs,'| intentional skips:',skips,'| nonInt PartB:',nonIntB,'| badChoice:',badChoice,'| numChoice bad:',ncBad);
  const problem=Object.entries(perGen).filter(([,v])=>v.bug>0||v.skip>250);
  if(problem.length) console.log('  high-skip/bug generators:', problem.map(([k,v])=>`${k}(bug${v.bug},skip${v.skip})`).join(', '));
  console.log(bugs===0&&nonIntB===0&&badChoice===0&&ncBad===0 ? '✅ SELFTEST PASSED' : '❌ SELFTEST FOUND ISSUES');
}

async function main(){
  const subject=await prisma.subject.findFirst({where:{slug:'math'}});
  if(!subject){ console.error('Math subject not found'); return; }
  const topics=await prisma.topic.findMany({where:{subjectId:subject.id}});
  const topicById=new Map(topics.map(t=>[t.id,t]));
  const subtopics=await prisma.subtopic.findMany({where:{topicId:{in:topics.map(t=>t.id)}}});

  const existingExt=new Set((await prisma.question.findMany({where:{externalId:{startsWith:'CTM-'}},select:{externalId:true}})).map(e=>e.externalId));
  const normC=(s)=>(s||'').replace(/\s+/g,' ').trim().toLowerCase();
  const seen=new Set((await prisma.question.findMany({where:{subjectId:subject.id},select:{content:true}})).map(q=>normC(q.content)));

  let matched=0, skipped=0, created=0;
  const toCreate=[]; const progress={};
  const selfTestFails=[];

  for(const st of subtopics){
    const topic=topicById.get(st.topicId);
    const gens=pickGens(st.name, topic?topic.name:'');
    if(!gens || gens.length===0){ skipped++; continue; }
    matched++;
    const p={partA:0,partB:0,level1:0,level2:0,level3:0,level4:0,level5:0};
    for(let i=0;i<PER;i++){
      const extId=`CTM-${st.id}-${i}`;
      if(existingExt.has(extId)) continue;
      const genMeta=gens[i%gens.length];
      const row=buildQuestion(extId, st, topic, subject.id, i, genMeta);
      if(!row){ continue; }
      const dk=normC(row.content);
      if(seen.has(dk)) continue;
      seen.add(dk);
      // ---- independent self-test: a SINGLE_CHOICE must have correctAnswer among options ----
      if(row.type==='SINGLE_CHOICE'){ const ids=JSON.parse(row.options).map(o=>o.id); if(!ids.includes(row.correctAnswer)){ selfTestFails.push(extId); continue; } }
      toCreate.push(row);
      p[row.part==='A'?'partA':'partB']++; p['level'+row.difficulty]++;
      created++;
    }
    progress[st.id]={name:st.name, topic:topic?topic.name:'', ...p};
  }

  if(INTROSPECT){
    console.log('— INTROSPECT —');
    console.log('Math subtopics total:',subtopics.length,'| matched:',matched,'| skipped(no generator):',skipped);
    console.log('Would generate:',created,'new questions (PER='+PER+')');
    const byTopic={}; for(const id in progress){const t=progress[id].topic; byTopic[t]=(byTopic[t]||0)+progress[id].partA+progress[id].partB;}
    console.log('By topic:',JSON.stringify(byTopic,null,0));
    if(selfTestFails.length) console.log('SELFTEST FAILS:',selfTestFails.length);
    return;
  }

  // JSON export (always, for review)
  const ts=new Date().toISOString().replace(/[:.]/g,'-');
  const outDir=path.join(__dirname,'..','..','..','data');
  try{ fs.mkdirSync(outDir,{recursive:true}); }catch{}
  const outPath=path.join(outDir,`ct-questions-${ts}.json`);
  fs.writeFileSync(outPath, JSON.stringify(toCreate.map(r=>({...r, options:r.options?JSON.parse(r.options):null, tags:JSON.parse(r.tags)})), null, 2));

  if(!DRY){
    for(const data of toCreate){ try{ await prisma.question.create({data}); }catch(e){ /* skip dup */ } }
    const qc=await prisma.question.count({where:{subjectId:subject.id,status:'ACTIVE'}});
    await prisma.subject.update({where:{id:subject.id},data:{questionsCount:qc}});
    console.log('Inserted into Neon. Math active questions now:',qc);
  } else {
    console.log('[DRY] no DB writes.');
  }

  // update state file
  const statePath=path.join(__dirname,'..','..','..','.ct-gen-state.json');
  let state={}; try{ state=JSON.parse(fs.readFileSync(statePath,'utf8')); }catch{ state={}; }
  state.totalGenerated=(state.totalGenerated||0)+(DRY?0:created);
  state.lastUpdated=new Date().toISOString();
  state.subtopicProgress=Object.assign(state.subtopicProgress||{}, progress);
  state.lastSubtopic=Object.values(progress).slice(-1)[0]?.name||state.lastSubtopic||'';
  fs.writeFileSync(statePath, JSON.stringify(state,null,2));

  console.log(`✅ Batch | matched subtopics: ${matched} | skipped: ${skipped} | generated: ${created} | self-test fails: ${selfTestFails.length}`);
  console.log('JSON export:', path.relative(path.join(__dirname,'..','..','..'), outPath));
}
async function runAudit(){
  const math=await prisma.subject.findFirst({where:{slug:'math'}});
  const rows=await prisma.question.findMany({where:{externalId:{startsWith:'CTM-'}}});
  let badChoice=0,badInt=0,wrongSubject=0,notActive=0,emptyExpl=0;
  const byPart={A:0,B:0}, byLvl={};
  for(const q of rows){
    if(q.subjectId!==math.id) wrongSubject++;
    if(q.status!=='ACTIVE') notActive++;
    if(!q.explanation||q.explanation.length<5) emptyExpl++;
    byPart[q.part]=(byPart[q.part]||0)+1; byLvl[q.difficulty]=(byLvl[q.difficulty]||0)+1;
    if(q.type==='SINGLE_CHOICE'){
      let opts=[]; try{opts=JSON.parse(q.options||'[]');}catch{}
      if(opts.length!==5 || !opts.some(o=>o.id===q.correctAnswer)) badChoice++;
    } else {
      if(!/^-?\d+$/.test(String(q.correctAnswer).trim())) badInt++;
    }
  }
  console.log('— AUDIT (CTM- questions) —');
  console.log('total:',rows.length,'| Part:',JSON.stringify(byPart),'| difficulty:',JSON.stringify(byLvl));
  console.log('bad choice(correct∉opts or≠5):',badChoice,'| non-integer PartB:',badInt,'| wrong subject:',wrongSubject,'| not ACTIVE:',notActive,'| empty explanation:',emptyExpl);
  // cross-domain sanity: CTM should only be under math topics
  const topicIds=new Set(rows.map(r=>r.topicId));
  const topics=await prisma.topic.findMany({where:{id:{in:[...topicIds]}},select:{subjectId:true}});
  const offMath=topics.filter(t=>t.subjectId!==math.id).length;
  console.log('topics not under math:',offMath);
  console.log(badChoice===0&&badInt===0&&wrongSubject===0&&notActive===0&&offMath===0 ? '✅ AUDIT PASSED' : '❌ AUDIT ISSUES');
}

async function makeVariants(N){
  const math=await prisma.subject.findFirst({where:{slug:'math'}});
  const topics=await prisma.topic.findMany({where:{subjectId:math.id}});
  const secOf=new Map(topics.map(t=>[t.id,t.name]));
  const sections=topics.map(t=>t.name);
  const rows=await prisma.question.findMany({where:{externalId:{startsWith:'CTM-'},status:'ACTIVE'}});
  const bySecA={},bySecB={};
  for(const q of rows){ const sec=secOf.get(q.topicId)||'—'; const m=(q.part==='A')?bySecA:bySecB; (m[sec]=m[sec]||[]).push(q); }
  const rng=makeRng('VARIANTS-v1');
  const sh=a=>{for(let i=a.length-1;i>0;i--){const j=rng.int(0,i);[a[i],a[j]]=[a[j],a[i]];}return a;};
  sections.forEach(s=>{ if(bySecA[s])sh(bySecA[s]); if(bySecB[s])sh(bySecB[s]); });
  const ptrA={},ptrB={}; sections.forEach(s=>{ptrA[s]=0;ptrB[s]=0;});
  const used=new Set();
  const variantsDir=path.join(__dirname,'..','..','..','data','variants');
  try{fs.mkdirSync(variantsDir,{recursive:true});}catch{}
  let made=0;
  for(let v=1;v<=N;v++){
    const picks=[];
    for(const s of sections){ const arr=bySecA[s]||[]; for(let k=0;k<2&&ptrA[s]<arr.length;k++){ picks.push(arr[ptrA[s]++]); } }
    for(const s of sections){ const arr=bySecB[s]||[]; for(let k=0;k<4&&ptrB[s]<arr.length;k++){ picks.push(arr[ptrB[s]++]); } }
    // top-up to 10 A / 20 B from any unused if a section was short
    const A=picks.filter(q=>q.part==='A'), B=picks.filter(q=>q.part==='B');
    for(const q of rows){ if(A.length>=10) break; if(q.part==='A'&&!picks.includes(q)&&!used.has(q.id)){ picks.push(q); A.push(q); } }
    for(const q of rows){ if(B.length>=20) break; if(q.part==='B'&&!picks.includes(q)&&!used.has(q.id)){ picks.push(q); B.push(q); } }
    if(A.length<10||B.length<20){ console.log(`(stopped at variant ${v}: not enough questions)`); break; }
    const chosenA=A.slice(0,10), chosenB=B.slice(0,20);
    [...chosenA,...chosenB].forEach(q=>used.add(q.id));
    const ordered=[...chosenA,...chosenB];           // Part A (1–10) then Part B (11–30)
    const ids=ordered.map(q=>q.id);
    const exam={ subjectId:math.id, title:`Пробный вариант ЦТ по математике — ${v}`,
      description:`Сгенерированный вариант ЦТ: 10 заданий части A и 20 части B по всем 5 разделам. Формат и баллы — как на реальном ЦТ.`,
      durationMinutes:180, passingScore:0, questionIds:JSON.stringify(ids), isActive:true, order:200+v, createdBy:'ct-generator' };
    if(!DRY) await prisma.exam.create({data:exam});
    fs.writeFileSync(path.join(variantsDir,`variant-${v}.json`), JSON.stringify({
      variant:v, total:ids.length, partA:chosenA.length, partB:chosenB.length,
      difficulty:ordered.reduce((m,q)=>{m[q.difficulty]=(m[q.difficulty]||0)+1;return m;},{}),
      questions:ordered.map((q,i)=>({number:i+1,part:q.part,difficulty:q.difficulty,content:q.content,correctAnswer:q.correctAnswer}))
    },null,2));
    made++;
  }
  console.log(`✅ Variants: ${made} created${DRY?' [DRY]':' (Exam entities on /exam/math)'} + data/variants/variant-*.json`);
}

if(SELFTEST){ runSelfTest(); }
else if(AUDIT){ runAudit().catch(e=>{console.error(e);process.exit(1);}).finally(()=>prisma.$disconnect()); }
else if(VARIANTS>0){ makeVariants(VARIANTS).catch(e=>{console.error(e);process.exit(1);}).finally(()=>prisma.$disconnect()); }
else { main().catch(e=>{console.error(e);process.exit(1);}).finally(()=>prisma.$disconnect()); }
