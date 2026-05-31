/* eslint-disable */
/**
 * CT-Platform — algorithmic question generator.
 * Generates large numbers of GUARANTEED-CORRECT questions (answers computed in
 * code) for Math / Physics / Chemistry, matched to existing subtopics by keyword.
 * Idempotent: deterministic externalId "GEN-<subtopicId>-<i>"; re-runs add nothing.
 * Subtopics it can't generate correctly are skipped (no garbage content).
 * Run: node prisma/seed-gen-questions.js
 */
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient(); // uses DATABASE_URL from env (.env) — Postgres/Neon

// ---------- deterministic RNG ----------
function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function makeRng(seed){const r=mulberry32(hashStr(seed));return{f:r,int:(a,b)=>a+Math.floor(r()*(b-a+1)),pick:(arr)=>arr[Math.floor(r()*arr.length)]};}

// ---------- math helpers ----------
const gcd=(a,b)=>{a=Math.abs(a);b=Math.abs(b);while(b){[a,b]=[b,a%b];}return a;};
const lcm=(a,b)=>Math.abs(a*b)/gcd(a,b);
const fact=(n)=>{let r=1;for(let i=2;i<=n;i++)r*=i;return r;};
const comb=(n,k)=>Math.round(fact(n)/(fact(k)*fact(n-k)));
function term(coef,v){if(coef===0)return '';const s=coef>0?' + ':' - ';const a=Math.abs(coef);return s+((v&&a===1)?'':a)+v;}
function poly2(a,b,c){let s=(a===1?'':a)+'x^2';s+=term(b,'x');s+=term(c,'');return s;}
function lin(a,b){let s=(a===1?'':(a===-1?'-':a))+'x';s+=term(b,'');return s;}

// ---------- option / format helpers ----------
function distractors(V){
  const res=[];
  const cands=[V+1,V-1,V+2,V-2,2*V,V+3,V-3,V+5,(V===0?4:V*2-1)];
  for(const c of cands){if(c!==V&&!res.includes(c)&&res.length<3)res.push(c);}
  let k=4;while(res.length<3){const c=V+k;if(c!==V&&!res.includes(c))res.push(c);k++;}
  return res.slice(0,3);
}
function asChoice(rng,V,unit){
  const all=[V,...distractors(V)];
  for(let i=all.length-1;i>0;i--){const j=rng.int(0,i);[all[i],all[j]]=[all[j],all[i]];}
  const ids=['a','b','c','d'];
  const options=all.map((val,i)=>({id:ids[i],text:String(val)+(unit?(' '+unit):'')}));
  return{type:'SINGLE_CHOICE',part:'A',options,correctAnswer:ids[all.indexOf(V)]};
}
function asText(V){return{type:'TEXT_INPUT',part:'B',options:null,correctAnswer:String(V)};}

// ---------- generators ----------
// Each returns {content, explanation, answer, unit?} for numeric, or
// {content, explanation, options, correctAnswer, fixed:true} for fixed-choice.
const M = {
  linear:(r)=>{const a=r.int(2,9),x=r.int(-9,9),b=r.int(-15,15),c=a*x+b;return{content:`Решите уравнение: $${a}x${term(b,'')} = ${c}$`,explanation:`$${a}x = ${c}${term(-b,'')} = ${c-b}$, значит $x = ${c-b}/${a} = ${x}$.`,answer:x};},
  vieta:(r)=>{let r1=r.int(-7,7),r2=r.int(-7,7);if(r1===r2)r2=r1+1;const p=-(r1+r2),q=r1*r2;const v=r.pick(['sum','prod','max','min','sqsum']);const lbl={sum:'сумму корней',prod:'произведение корней',max:'наибольший корень',min:'наименьший корень',sqsum:'сумму квадратов корней'}[v];const ans={sum:r1+r2,prod:r1*r2,max:Math.max(r1,r2),min:Math.min(r1,r2),sqsum:r1*r1+r2*r2}[v];return{content:`Найдите ${lbl} уравнения $${poly2(1,p,q)} = 0$.`,explanation:`По теореме Виета: $x_1+x_2 = ${-p}$, $x_1 x_2 = ${q}$. Корни: $${r1}$ и $${r2}$.`,answer:ans};},
  percent:(r)=>{const p=r.pick([5,10,15,20,25,40,50,60,75,80]);const g=gcd(p,100),step=100/g;const base=step*r.int(2,18);const ans=base*p/100;return{content:`Найдите $${p}\\%$ от числа $${base}$.`,explanation:`$${base} \\cdot ${p}/100 = ${ans}$.`,answer:ans};},
  power:(r)=>{const b=r.int(2,6),e=r.int(2,4);return{content:`Вычислите: $${b}^{${e}}$.`,explanation:`$${b}^{${e}} = ${Math.pow(b,e)}$.`,answer:Math.pow(b,e)};},
  sqrt:(r)=>{const n=r.int(2,25);return{content:`Вычислите: $\\sqrt{${n*n}}$.`,explanation:`$\\sqrt{${n*n}} = ${n}$, так как $${n}^2 = ${n*n}$.`,answer:n};},
  log:(r)=>{const b=r.pick([2,3,5,10]),k=r.int(1,4);return{content:`Вычислите: $\\log_{${b}} ${Math.pow(b,k)}$.`,explanation:`$\\log_{${b}} ${Math.pow(b,k)} = ${k}$, так как $${b}^{${k}} = ${Math.pow(b,k)}$.`,answer:k};},
  nodnok:(r)=>{const a=r.int(4,48),b=r.int(4,48);const v=r.pick(['nod','nok']);const ans=v==='nod'?gcd(a,b):lcm(a,b);return{content:`Найдите ${v==='nod'?'НОД':'НОК'} чисел $${a}$ и $${b}$.`,explanation:`${v==='nod'?'Наибольший общий делитель':'Наименьшее общее кратное'} чисел $${a}$ и $${b}$ равен $${ans}$.`,answer:ans};},
  arith:(r)=>{const a=r.int(2,12),b=r.int(2,12),c=r.int(1,20);const v=r.pick(['mul_add','mul_sub']);const ans=v==='mul_add'?a*b+c:a*b-c;return{content:`Вычислите: $${a} \\cdot ${b} ${v==='mul_add'?'+':'-'} ${c}$.`,explanation:`$${a} \\cdot ${b} = ${a*b}$, далее ${v==='mul_add'?`$${a*b}+${c}=${ans}$`:`$${a*b}-${c}=${ans}$`}.`,answer:ans};},
  proportion:(r)=>{const a=r.int(2,9),k=r.int(2,9),b=a*k,c=r.int(2,9),x=c*k;return{content:`Найдите $x$ из пропорции $\\frac{${a}}{${b}} = \\frac{${c}}{x}$.`,explanation:`$x = \\frac{${b} \\cdot ${c}}{${a}} = ${x}$.`,answer:x};},
  progAr:(r)=>{const a1=r.int(-4,10),d=r.int(1,6),n=r.int(5,12);const v=r.pick(['an','sn']);const an=a1+(n-1)*d,sn=n*(2*a1+(n-1)*d)/2;return{content:`В арифметической прогрессии $a_1=${a1}$, $d=${d}$. Найдите ${v==='an'?`$a_{${n}}$`:`сумму первых ${n} членов`}.`,explanation:v==='an'?`$a_{${n}} = ${a1} + (${n}-1)\\cdot${d} = ${an}$.`:`$S_{${n}} = \\frac{2\\cdot${a1}+(${n}-1)\\cdot${d}}{2}\\cdot${n} = ${sn}$.`,answer:v==='an'?an:sn};},
  progGeo:(r)=>{const a1=r.int(1,4),q=r.int(2,3),n=r.int(3,5);const an=a1*Math.pow(q,n-1);return{content:`В геометрической прогрессии $b_1=${a1}$, $q=${q}$. Найдите $b_{${n}}$.`,explanation:`$b_{${n}} = ${a1}\\cdot${q}^{${n-1}} = ${an}$.`,answer:an};},
  deriv:(r)=>{const a=r.int(1,5),b=r.int(-6,6),c=r.int(-6,6),x0=r.int(-3,4);const ans=2*a*x0+b;return{content:`Найдите значение производной функции $f(x)=${poly2(a,b,c)}$ в точке $x_0=${x0}$.`,explanation:`$f'(x) = ${2*a}x${term(b,'')}$, тогда $f'(${x0}) = ${2*a}\\cdot${x0}${term(b,'')} = ${ans}$.`,answer:ans};},
  fracEq:(r)=>{const m=r.int(2,9),k=m*r.int(1,6);return{content:`Решите уравнение: $\\frac{${k}}{x} = ${m}$.`,explanation:`$x = ${k}/${m} = ${k/m}$.`,answer:k/m};},
  modEq:(r)=>{const a=r.int(-5,5),b=r.int(1,8);const v=r.pick(['sum','max','min']);const ans={sum:2*a,max:a+b,min:a-b}[v];const lbl={sum:'сумму корней',max:'наибольший корень',min:'наименьший корень'}[v];return{content:`Найдите ${lbl} уравнения $|x ${term(-a,'')}| = ${b}$.`,explanation:`$x ${term(-a,'')} = \\pm${b}$, корни: $${a+b}$ и $${a-b}$.`,answer:ans};},
  expEq:(r)=>{const b=r.pick([2,3,5]),k=r.int(1,5);return{content:`Решите уравнение: $${b}^{x} = ${Math.pow(b,k)}$.`,explanation:`$${b}^{x} = ${b}^{${k}}$, значит $x = ${k}$.`,answer:k};},
  logEq:(r)=>{const b=r.pick([2,3,5,10]),k=r.int(1,3);return{content:`Решите уравнение: $\\log_{${b}} x = ${k}$.`,explanation:`$x = ${b}^{${k}} = ${Math.pow(b,k)}$.`,answer:Math.pow(b,k)};},
  system:(r)=>{const x=r.int(-6,6),y=r.int(-6,6);let a1=r.int(1,4),b1=r.int(1,4),a2=r.int(1,4),b2=r.int(1,4);if(a1*b2-a2*b1===0)b2+=1;const c1=a1*x+b1*y,c2=a2*x+b2*y;const v=r.pick(['sum','prod','x','y']);const ans={sum:x+y,prod:x*y,x:x,y:y}[v];const lbl={sum:'$x+y$',prod:'$x\\cdot y$',x:'$x$',y:'$y$'}[v];return{content:`Решите систему и найдите ${lbl}: $\\begin{cases} ${lin(a1,0)}+${b1}y = ${c1} \\\\ ${lin(a2,0)}+${b2}y = ${c2} \\end{cases}$`,explanation:`Решение системы: $x=${x}$, $y=${y}$.`,answer:ans};},
  linIneq:(r)=>{const a=r.int(1,6),x0=r.int(-6,6),b=r.int(-10,10),c=a*x0+b+r.int(1,a);return{content:`Найдите наименьшее целое решение неравенства $${a}x ${term(b,'')} > ${c}$.`,explanation:`$${a}x > ${c-b}$, $x > ${((c-b)/a).toFixed(2)}$, наименьшее целое $x = ${Math.floor((c-b)/a)+1}$.`,answer:Math.floor((c-b)/a)+1};},
  quadIneq:(r)=>{let r1=r.int(-6,5),r2=r1+r.int(1,5);const p=-(r1+r2),q=r1*r2;const v=r.pick(['minInt','count']);const ans=v==='minInt'?r1+1:(r2-r1-1);const lbl=v==='minInt'?'наименьшее целое решение':'число целых решений';return{content:`Найдите ${lbl} неравенства $${poly2(1,p,q)} < 0$.`,explanation:`Корни: $${r1}$ и $${r2}$. Решение: $${r1} < x < ${r2}$.`,answer:ans};},
  trig:(r)=>{const ang=r.pick([0,30,45,60,90]);const fn=r.pick(['\\sin','\\cos']);const sinV={0:'0',30:'\\frac{1}{2}',45:'\\frac{\\sqrt{2}}{2}',60:'\\frac{\\sqrt{3}}{2}',90:'1'};const cosV={0:'1',30:'\\frac{\\sqrt{3}}{2}',45:'\\frac{\\sqrt{2}}{2}',60:'\\frac{1}{2}',90:'0'};const correct=(fn==='\\sin'?sinV:cosV)[ang];const pool=['0','\\frac{1}{2}','\\frac{\\sqrt{2}}{2}','\\frac{\\sqrt{3}}{2}','1'];let opts=[correct];for(const p of pool){if(!opts.includes(p)&&opts.length<4)opts.push(p);}for(let i=opts.length-1;i>0;i--){const j=r.int(0,i);[opts[i],opts[j]]=[opts[j],opts[i]];}const ids=['a','b','c','d'];return{content:`Вычислите: $${fn} ${ang}°$.`,explanation:`$${fn} ${ang}° = ${correct}$.`,options:ids.map((id,i)=>({id,text:`$${opts[i]}$`})),correctAnswer:ids[opts.indexOf(correct)],fixed:true};},
  combin:(r)=>{const v=r.pick(['perm','comb']);if(v==='perm'){const n=r.int(3,6);return{content:`Сколькими способами можно расставить $${n}$ различных книг на полке?`,explanation:`$P_{${n}} = ${n}! = ${fact(n)}$.`,answer:fact(n)};}const n=r.int(4,7),k=r.int(2,n-1);return{content:`Сколькими способами можно выбрать $${k}$ человек из $${n}$?`,explanation:`$C_{${n}}^{${k}} = \\frac{${n}!}{${k}!(${n}-${k})!} = ${comb(n,k)}$.`,answer:comb(n,k)};},
  fsmu:(r)=>{const a=r.int(2,9),b=r.int(1,9);const v=r.pick(['sum','diff']);const ans=v==='sum'?(a+b)*(a+b):(a-b)*(a-b);return{content:`Вычислите: $(${a} ${v==='sum'?'+':'-'} ${b})^2$.`,explanation:`$(${a}${v==='sum'?'+':'-'}${b})^2 = ${a*a}${v==='sum'?'+':'-'}${2*a*b}+${b*b} = ${ans}$.`,answer:ans};},
  ratExpr:(r)=>{const x0=r.int(2,9);return{content:`Найдите значение выражения $\\frac{x^2-1}{x-1}$ при $x=${x0}$.`,explanation:`$\\frac{x^2-1}{x-1} = x+1 = ${x0+1}$.`,answer:x0+1};},
  // geometry
  angSupp:(r)=>{const a=r.int(25,155);return{content:`Один из смежных углов равен $${a}°$. Найдите второй угол (в градусах).`,explanation:`Сумма смежных углов $180°$, значит $180° - ${a}° = ${180-a}°$.`,answer:180-a};},
  triAng:(r)=>{const a=r.int(30,100),b=r.int(20,Math.min(140-a,90));return{content:`Два угла треугольника равны $${a}°$ и $${b}°$. Найдите третий угол (в градусах).`,explanation:`Сумма углов треугольника $180°$: $180° - ${a}° - ${b}° = ${180-a-b}°$.`,answer:180-a-b};},
  pyth:(r)=>{const t=r.pick([[3,4,5],[6,8,10],[5,12,13],[8,15,17],[9,12,15],[7,24,25],[20,21,29]]);return{content:`Катеты прямоугольного треугольника равны $${t[0]}$ и $${t[1]}$. Найдите гипотенузу.`,explanation:`$c = \\sqrt{${t[0]}^2 + ${t[1]}^2} = \\sqrt{${t[0]*t[0]+t[1]*t[1]}} = ${t[2]}$.`,answer:t[2]};},
  areaRect:(r)=>{const a=r.int(3,18),b=r.int(3,18);return{content:`Найдите площадь прямоугольника со сторонами $${a}$ и $${b}$.`,explanation:`$S = ${a} \\cdot ${b} = ${a*b}$.`,answer:a*b};},
  areaTri:(r)=>{let a=r.int(2,16),h=r.int(2,16);if((a*h)%2)h+=1;return{content:`Основание треугольника равно $${a}$, высота $${h}$. Найдите площадь.`,explanation:`$S = \\frac{1}{2} \\cdot ${a} \\cdot ${h} = ${a*h/2}$.`,answer:a*h/2};},
  trapMid:(r)=>{let a=r.int(3,20),b=r.int(3,20);if((a+b)%2)b+=1;return{content:`Основания трапеции равны $${a}$ и $${b}$. Найдите среднюю линию.`,explanation:`$m = \\frac{${a}+${b}}{2} = ${(a+b)/2}$.`,answer:(a+b)/2};},
  inscribed:(r)=>{const c=2*r.int(15,80);return{content:`Центральный угол равен $${c}°$. Найдите вписанный угол, опирающийся на ту же дугу (в градусах).`,explanation:`Вписанный угол вдвое меньше центрального: $${c}°/2 = ${c/2}°$.`,answer:c/2};},
  cubeVol:(r)=>{const a=r.int(2,9);return{content:`Найдите объём куба с ребром $${a}$.`,explanation:`$V = ${a}^3 = ${a*a*a}$.`,answer:a*a*a};},
  boxVol:(r)=>{const a=r.int(2,8),b=r.int(2,8),c=r.int(2,8);return{content:`Найдите объём прямоугольного параллелепипеда с измерениями $${a}$, $${b}$, $${c}$.`,explanation:`$V = ${a}\\cdot${b}\\cdot${c} = ${a*b*c}$.`,answer:a*b*c};},
  linFunc:(r)=>{const k=r.int(-5,5)||2,b=r.int(-8,8),x0=r.int(-5,5);return{content:`Найдите значение функции $y = ${lin(k,b)}$ при $x = ${x0}$.`,explanation:`$y = ${k}\\cdot${x0}${term(b,'')} = ${k*x0+b}$.`,answer:k*x0+b};},
  parabVal:(r)=>{const a=r.int(1,3),b=r.int(-5,5),c=r.int(-6,6),x0=r.int(-3,3);return{content:`Найдите значение функции $y = ${poly2(a,b,c)}$ при $x = ${x0}$.`,explanation:`Подставляем $x=${x0}$: $y = ${a*x0*x0+b*x0+c}$.`,answer:a*x0*x0+b*x0+c};},
};

// Physics (units in answers). Constant g = 10 m/s² stated in problems for clean numbers.
const P = {
  uniform:(r)=>{const v=r.int(2,30),t=r.int(2,12);return{content:`Тело движется равномерно со скоростью $${v}$ м/с. Какой путь оно пройдёт за $${t}$ с?`,explanation:`$s = vt = ${v}\\cdot${t} = ${v*t}$ м.`,answer:v*t,unit:'м'};},
  accel:(r)=>{const a=r.int(1,6),t=r.int(2,10);return{content:`Тело начинает движение из состояния покоя с ускорением $${a}$ м/с². Какую скорость оно наберёт через $${t}$ с?`,explanation:`$v = at = ${a}\\cdot${t} = ${a*t}$ м/с.`,answer:a*t,unit:'м/с'};},
  accelPath:(r)=>{const a=r.int(2,8)*1,t=r.int(2,6);if((a*t*t)%2){}return{content:`Тело без начальной скорости движется с ускорением $${a}$ м/с². Какой путь оно пройдёт за $${t}$ с?`,explanation:`$s = \\frac{at^2}{2} = \\frac{${a}\\cdot${t*t}}{2} = ${a*t*t/2}$ м.`,answer:a*t*t/2,unit:'м'};},
  fall:(r)=>{const t=r.int(1,5);return{content:`Тело свободно падает без начальной скорости (примите $g = 10$ м/с²). Какую скорость оно будет иметь через $${t}$ с?`,explanation:`$v = gt = 10\\cdot${t} = ${10*t}$ м/с.`,answer:10*t,unit:'м/с'};},
  fallH:(r)=>{const h=r.pick([5,20,45,80,125]);const t=Math.sqrt(h/5);return{content:`С какой высоты свободно падало тело, если оно летело $${t}$ с? (примите $g = 10$ м/с²)`,explanation:`$h = \\frac{gt^2}{2} = \\frac{10\\cdot${t*t}}{2} = ${h}$ м.`,answer:h,unit:'м'};},
  newton2F:(r)=>{const m=r.int(1,12),a=r.int(1,9);return{content:`На тело массой $${m}$ кг действует сила, сообщающая ему ускорение $${a}$ м/с². Найдите силу.`,explanation:`$F = ma = ${m}\\cdot${a} = ${m*a}$ Н.`,answer:m*a,unit:'Н'};},
  newton2a:(r)=>{const m=r.int(2,10),F=m*r.int(1,8);return{content:`Сила $${F}$ Н действует на тело массой $${m}$ кг. Найдите ускорение.`,explanation:`$a = F/m = ${F}/${m} = ${F/m}$ м/с².`,answer:F/m,unit:'м/с²'};},
  weight:(r)=>{const m=r.int(1,30);return{content:`Найдите вес тела массой $${m}$ кг, покоящегося на опоре (примите $g = 10$ м/с²).`,explanation:`$P = mg = ${m}\\cdot10 = ${m*10}$ Н.`,answer:m*10,unit:'Н'};},
  hooke:(r)=>{const k=r.int(50,400),x100=r.int(2,20);const x=x100/100;return{content:`Пружину жёсткостью $${k}$ Н/м растянули на $${x100}$ см. Найдите силу упругости.`,explanation:`$F = kx = ${k}\\cdot${x} = ${Math.round(k*x)}$ Н.`,answer:Math.round(k*x),unit:'Н'};},
  friction:(r)=>{const mu10=r.pick([1,2,3,4,5]);const mu=mu10/10;const m=r.int(2,20);return{content:`Тело массой $${m}$ кг лежит на горизонтальной поверхности, коэффициент трения $${mu}$ (примите $g = 10$ м/с²). Найдите силу трения скольжения.`,explanation:`$F_{тр} = \\mu m g = ${mu}\\cdot${m}\\cdot10 = ${mu*m*10}$ Н.`,answer:mu*m*10,unit:'Н'};},
  impulse:(r)=>{const m=r.int(1,15),v=r.int(2,20);return{content:`Найдите импульс тела массой $${m}$ кг, движущегося со скоростью $${v}$ м/с.`,explanation:`$p = mv = ${m}\\cdot${v} = ${m*v}$ кг·м/с.`,answer:m*v,unit:'кг·м/с'};},
  work:(r)=>{const F=r.int(5,50),s=r.int(2,20);return{content:`Сила $${F}$ Н перемещает тело на $${s}$ м в направлении силы. Найдите работу.`,explanation:`$A = Fs = ${F}\\cdot${s} = ${F*s}$ Дж.`,answer:F*s,unit:'Дж'};},
  power:(r)=>{const A=r.int(2,40)*10,t=r.int(2,20);const Aa=A;return{content:`За $${t}$ с совершена работа $${Aa}$ Дж. Найдите мощность.`,explanation:`$N = A/t = ${Aa}/${t} = ${Math.round(Aa/t*100)/100}$ Вт.`,answer:Math.round(Aa/t),unit:'Вт',_skipIfNotInt:Aa%t!==0};},
  kinetic:(r)=>{const m=r.int(1,10),v=r.pick([2,4,6,8,10]);return{content:`Найдите кинетическую энергию тела массой $${m}$ кг, движущегося со скоростью $${v}$ м/с.`,explanation:`$E_к = \\frac{mv^2}{2} = \\frac{${m}\\cdot${v*v}}{2} = ${m*v*v/2}$ Дж.`,answer:m*v*v/2,unit:'Дж'};},
  potential:(r)=>{const m=r.int(1,20),h=r.int(2,20);return{content:`Найдите потенциальную энергию тела массой $${m}$ кг на высоте $${h}$ м (примите $g = 10$ м/с²).`,explanation:`$E_п = mgh = ${m}\\cdot10\\cdot${h} = ${m*10*h}$ Дж.`,answer:m*10*h,unit:'Дж'};},
  pressure:(r)=>{const F=r.int(20,200),S=r.pick([2,4,5,10]);if(F%S){}return{content:`Сила $${F}$ Н давит на площадь $${S}$ м². Найдите давление.`,explanation:`$p = F/S = ${F}/${S} = ${Math.round(F/S)}$ Па.`,answer:Math.round(F/S),unit:'Па',_skipIfNotInt:F%S!==0};},
  ohm:(r)=>{const I=r.int(1,10),R=r.int(2,20);return{content:`Через резистор сопротивлением $${R}$ Ом течёт ток $${I}$ А. Найдите напряжение.`,explanation:`$U = IR = ${I}\\cdot${R} = ${I*R}$ В.`,answer:I*R,unit:'В'};},
  ohmI:(r)=>{const R=r.int(2,12),I=r.int(1,9),U=I*R;return{content:`К резистору сопротивлением $${R}$ Ом приложено напряжение $${U}$ В. Найдите силу тока.`,explanation:`$I = U/R = ${U}/${R} = ${U/R}$ А.`,answer:U/R,unit:'А'};},
  powerEl:(r)=>{const U=r.int(2,20),I=r.int(1,10);return{content:`Найдите мощность тока, если напряжение $${U}$ В, а сила тока $${I}$ А.`,explanation:`$P = UI = ${U}\\cdot${I} = ${U*I}$ Вт.`,answer:U*I,unit:'Вт'};},
  seriesR:(r)=>{const R1=r.int(2,20),R2=r.int(2,20);return{content:`Два резистора $${R1}$ Ом и $${R2}$ Ом соединены последовательно. Найдите общее сопротивление.`,explanation:`$R = R_1+R_2 = ${R1}+${R2} = ${R1+R2}$ Ом.`,answer:R1+R2,unit:'Ом'};},
  halflife:(r)=>{const T=r.pick([2,3,5,10]);const k=r.int(1,4);const N0=Math.pow(2,k)*r.int(1,4);const t=T*k;return{content:`Период полураспада равен $${T}$ ч. Сколько ядер из начальных $${N0}$ останется через $${t}$ ч?`,explanation:`За $${t}$ ч прошло $${k}$ периодов: $N = ${N0}/2^{${k}} = ${N0/Math.pow(2,k)}$.`,answer:N0/Math.pow(2,k)};},
  heat:(r)=>{const c=r.pick([4200,2100,920,460,130,250]);const m=r.int(1,5),dt=r.int(2,30);const Q=c*m*dt;return{content:`Сколько теплоты нужно, чтобы нагреть $${m}$ кг вещества (удельная теплоёмкость $${c}$ Дж/(кг·°C)) на $${dt}$ °C?`,explanation:`$Q = cm\\Delta t = ${c}\\cdot${m}\\cdot${dt} = ${Q}$ Дж.`,answer:Q,unit:'Дж'};},
};

// Chemistry (molar/atomic masses given in problem text).
const C = {
  moleFromMass:(r)=>{const sub=r.pick([['H_2O',18],['CO_2',44],['NaCl',58],['O_2',32],['H_2',2],['CaCO_3',100],['NaOH',40],['CuO',80]]);const n=r.int(1,5);const m=n*sub[1];return{content:`Найдите количество вещества (моль) в $${m}$ г $${sub[0]}$ (молярная масса $M = ${sub[1]}$ г/моль).`,explanation:`$n = m/M = ${m}/${sub[1]} = ${n}$ моль.`,answer:n,unit:'моль'};},
  massFromMole:(r)=>{const sub=r.pick([['H_2O',18],['CO_2',44],['NaCl',58],['O_2',32],['CaCO_3',100],['NaOH',40]]);const n=r.int(2,6);const m=n*sub[1];return{content:`Найдите массу (г) $${n}$ моль $${sub[0]}$ (молярная масса $M = ${sub[1]}$ г/моль).`,explanation:`$m = nM = ${n}\\cdot${sub[1]} = ${m}$ г.`,answer:m,unit:'г'};},
  massFraction:(r)=>{const ms=r.int(5,50),mtot=ms+r.int(50,150);const w=Math.round(ms/mtot*1000)/10;if(!Number.isInteger(w*2)){}return{content:`В растворе массой $${mtot}$ г содержится $${ms}$ г соли. Найдите массовую долю соли в процентах.`,explanation:`$w = \\frac{${ms}}{${mtot}}\\cdot100\\% = ${w}\\%$.`,answer:w,unit:'%',_skipIfNotInt:!Number.isInteger(w)};},
  gasVolume:(r)=>{const n=r.pick([0.5,1,2,3,0.25]);const V=n*22.4;return{content:`Какой объём (л) при н.у. занимает $${n}$ моль газа? (молярный объём $V_m = 22{,}4$ л/моль)`,explanation:`$V = n V_m = ${n}\\cdot22{,}4 = ${Math.round(V*100)/100}$ л.`,answer:Math.round(V*100)/100,unit:'л'};},
};

// ---------- subtopic → generator registry ----------
const REG = [
  // math
  {re:/квадратн.*уравнен|виет/i, gens:[M.vieta,M.vieta,M.vieta]},
  {re:/линейн.*уравнен/i, gens:[M.linear,M.linear,M.linear]},
  {re:/дробно-?рациональн.*уравнен/i, gens:[M.fracEq,M.fracEq]},
  {re:/уравнен.*модул|модул/i, gens:[M.modEq,M.modEq]},
  {re:/показательн.*уравнен/i, gens:[M.expEq,M.expEq]},
  {re:/логарифмическ.*уравнен/i, gens:[M.logEq,M.logEq]},
  {re:/систем.*линейн|систем.*уравнен/i, gens:[M.system,M.system]},
  {re:/линейн.*неравенств/i, gens:[M.linIneq,M.linIneq]},
  {re:/квадратн.*неравенств|метод интервал/i, gens:[M.quadIneq,M.quadIneq]},
  {re:/процент/i, gens:[M.percent,M.percent]},
  {re:/пропорц/i, gens:[M.proportion,M.proportion]},
  {re:/нод|нок|натуральн|делимост|простые/i, gens:[M.nodnok,M.arith]},
  {re:/целые числа|действия с цел|рациональн|иррациональн/i, gens:[M.arith,M.arith]},
  {re:/степен/i, gens:[M.power,M.power]},
  {re:/корн/i, gens:[M.sqrt,M.sqrt]},
  {re:/логарифм/i, gens:[M.log,M.log]},
  {re:/формул.*сокращ/i, gens:[M.fsmu,M.fsmu]},
  {re:/рациональн.*выражен|алгебраическ.*дроб/i, gens:[M.ratExpr,M.ratExpr]},
  {re:/производн/i, gens:[M.deriv,M.deriv]},
  {re:/арифметическ.*прогресс/i, gens:[M.progAr,M.progAr]},
  {re:/геометрическ.*прогресс/i, gens:[M.progGeo,M.progGeo]},
  {re:/тригонометрическ|синус|косинус/i, gens:[M.trig,M.trig]},
  {re:/комбинатор/i, gens:[M.combin,M.combin]},
  {re:/линейн.*функц/i, gens:[M.linFunc,M.linFunc]},
  {re:/квадратичн.*функц|парабол/i, gens:[M.parabVal,M.parabVal]},
  {re:/смежные|вертикальн|виды углов|угол/i, gens:[M.angSupp,M.triAng]},
  {re:/сумма углов|треугольник.*сумма/i, gens:[M.triAng,M.triAng]},
  {re:/пифагор/i, gens:[M.pyth,M.pyth]},
  {re:/площад/i, gens:[M.areaRect,M.areaTri]},
  {re:/четырёхугольник|прямоугольник|параллелограмм|ромб|квадрат/i, gens:[M.areaRect,M.areaRect]},
  {re:/трапец/i, gens:[M.trapMid,M.trapMid]},
  {re:/окружност|вписанн|центральн/i, gens:[M.inscribed,M.inscribed]},
  {re:/куб|параллелепипед/i, gens:[M.cubeVol,M.boxVol]},
  {re:/объ[её]м|пирамид|призм|цилиндр|конус|шар/i, gens:[M.boxVol,M.cubeVol]},
  // physics
  {re:/равномерн.*прямолинейн|равномерн.*движен/i, gens:[P.uniform,P.uniform]},
  {re:/равноускоренн/i, gens:[P.accel,P.accelPath]},
  {re:/свободн.*паден/i, gens:[P.fall,P.fallH]},
  {re:/брошенн.*горизонт/i, gens:[P.fallH,P.uniform]},
  {re:/второй закон ньютон|f *= *ma/i, gens:[P.newton2F,P.newton2a]},
  {re:/первый закон ньютон|инерц|третий закон/i, gens:[P.newton2F]},
  {re:/вес тела|тяготен/i, gens:[P.weight,P.weight]},
  {re:/гук|упругост/i, gens:[P.hooke,P.hooke]},
  {re:/трени/i, gens:[P.friction,P.friction]},
  {re:/импульс/i, gens:[P.impulse,P.impulse]},
  {re:/работа сил|мощност|кпд/i, gens:[P.work,P.power]},
  {re:/кинетическ.*энерги|потенциальн.*энерги|сохранен.*энерги/i, gens:[P.kinetic,P.potential]},
  {re:/давлен|паскал/i, gens:[P.pressure,P.pressure]},
  {re:/ом|сопротивлен|сила тока|напряж/i, gens:[P.ohm,P.ohmI]},
  {re:/последовательн|параллельн.*соединен/i, gens:[P.seriesR,P.seriesR]},
  {re:/работа и мощност тока|джоул/i, gens:[P.powerEl,P.powerEl]},
  {re:/полураспад|радиоактивн/i, gens:[P.halflife,P.halflife]},
  {re:/количество теплоты|внутренн.*энерги/i, gens:[P.heat,P.heat]},
  // chemistry
  {re:/количество вещества|моль|число авогадро/i, gens:[C.moleFromMass,C.massFromMole]},
  {re:/раствор|концентрац|массов.*дол/i, gens:[C.massFraction,C.gasVolume]},
  {re:/масс|молярн/i, gens:[C.moleFromMass,C.massFromMole]},
];
// math fallback for any unmatched math subtopic (still correct, generic numeracy)
const MATH_FALLBACK=[M.arith,M.percent,M.power,M.sqrt];

function tagsFromName(name){
  return name.toLowerCase().replace(/[^a-zа-яё0-9 ]/gi,' ').split(/\s+/)
    .filter(w=>w.length>4).slice(0,3);
}

async function main(){
  const targetSlugs=['math','physics','chemistry'];
  const subjects=await prisma.subject.findMany({where:{slug:{in:targetSlugs}}});
  const subjBySlug=new Map(subjects.map(s=>[s.slug,s]));
  const subjIds=subjects.map(s=>s.id);
  const topics=await prisma.topic.findMany({where:{subjectId:{in:subjIds}}});
  const topicById=new Map(topics.map(t=>[t.id,t]));
  const subtopics=await prisma.subtopic.findMany({where:{topicId:{in:topics.map(t=>t.id)}}});

  const existing=await prisma.question.findMany({where:{externalId:{startsWith:'GEN-'}},select:{externalId:true}});
  const have=new Set(existing.map(e=>e.externalId));

  // Global de-dup: never emit content that already exists in the subject
  // (seeds from authored questions too, so generated never duplicates them).
  const normC=(s)=>(s||'').replace(/\s+/g,' ').trim().toLowerCase();
  const allExisting=await prisma.question.findMany({where:{subjectId:{in:subjIds}},select:{subjectId:true,content:true}});
  const seen=new Set(allExisting.map(q=>q.subjectId+'::'+normC(q.content)));

  let created=0, perSubject={math:0,physics:0,chemistry:0}, skippedSub=0;
  const toCreate=[];

  for(const st of subtopics){
    const topic=topicById.get(st.topicId);
    const subj=subjects.find(s=>s.id===topic.subjectId);
    const slug=subj.slug;
    const hay=(st.name+' '+topic.name).toLowerCase();
    let entry=REG.find(e=>e.re.test(hay));
    let gens=entry?entry.gens:(slug==='math'?MATH_FALLBACK:null);
    if(!gens){skippedSub++;continue;}
    const count=entry?5:4;
    for(let i=0;i<count;i++){
      const extId=`GEN-${st.id}-${i}`;
      if(have.has(extId))continue;
      const gen=gens[i%gens.length];
      const rng=makeRng(extId);
      let q;
      try{q=gen(rng);}catch(e){continue;}
      if(q._skipIfNotInt) continue;
      // normalize spaces + skip duplicate content within the subject
      q.content=q.content.replace(/ {2,}/g,' ');
      q.explanation=(q.explanation||'').replace(/ {2,}/g,' ');
      const dkey=subj.id+'::'+normC(q.content);
      if(seen.has(dkey)) continue;
      seen.add(dkey);
      let fmt;
      if(q.fixed){fmt={type:'SINGLE_CHOICE',part:'A',options:q.options,correctAnswer:q.correctAnswer};}
      else{
        const useChoice=(i%5)<2; // ~40% choice, 60% text
        fmt=useChoice?asChoice(rng,q.answer,q.unit):asText(q.answer);
      }
      const difficulty=1+(i%3);
      const tags=tagsFromName(st.name);
      toCreate.push({
        externalId:extId,
        subjectId:subj.id, topicId:topic.id, subtopicId:st.id,
        type:fmt.type, part:fmt.part, difficulty,
        content:q.content,
        options:fmt.options?JSON.stringify(fmt.options):null,
        correctAnswer:fmt.correctAnswer,
        explanation:q.explanation,
        hints:JSON.stringify({small:[q.explanation.replace(/\$/g,'')],detailed:[],stepby:[]}),
        tags:JSON.stringify(tags),
        year:2027, source:'Генератор ЦТ-формата', status:'ACTIVE',
        timesSolved:0, timesCorrect:0,
      });
      perSubject[slug]++;
      created++;
    }
  }

  // batch insert
  for(const data of toCreate){
    await prisma.question.create({data});
  }

  // resync counters
  for(const s of subjects){
    const qc=await prisma.question.count({where:{subjectId:s.id,status:'ACTIVE'}});
    await prisma.subject.update({where:{id:s.id},data:{questionsCount:qc}});
  }

  console.log('Created questions:',created);
  console.log('Per subject:',JSON.stringify(perSubject));
  console.log('Subtopics skipped (no safe generator):',skippedSub);
  const totals={};
  for(const s of subjects){totals[s.slug]=await prisma.question.count({where:{subjectId:s.id}});}
  console.log('New per-subject totals:',JSON.stringify(totals));
}
main().catch(e=>{console.error(e);process.exit(1);}).finally(()=>prisma.$disconnect());
