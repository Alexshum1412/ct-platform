// Смоук-тест олимпиадного раздела против запущенного backend (API_URL или :3010).
// Проверяет: выдачу без ответов, сабмит (неверный/верный/повторный), антинакрутку
// очков, раскрытие разбора, рейтинг, прогресс, архив, теорию, админ-CRUD.
// Тестовые данные подчищает за собой (попытки demo-пользователя + xp).

import { PrismaClient } from '@prisma/client';

const API = process.env.API_URL || 'http://localhost:3010';
const prisma = new PrismaClient();

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} ${extra}`); }
};

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty */ }
  return { status: res.status, data };
}

async function main() {
  // --- логины ---
  const demoLogin = await api('/auth/login', { method: 'POST', body: { email: 'demo@ct-platform.by', password: 'Demo123!' } });
  const adminLogin = await api('/auth/login', { method: 'POST', body: { email: 'admin@ct-platform.by', password: 'Admin123!' } });
  const demoToken = demoLogin.data?.token;
  const adminToken = adminLogin.data?.token;
  ok('логин demo/admin', !!demoToken && !!adminToken);
  const demoId = demoLogin.data?.user?.id;
  const xpBefore = (await prisma.user.findUnique({ where: { id: demoId }, select: { xp: true } }))?.xp ?? 0;

  // --- публичная выдача ---
  const list = await api('/olympiad/problems?subjectId=math&level=REPUBLIC');
  ok('список задач math/REPUBLIC', list.status === 200 && list.data.problems.length === 4, `status=${list.status}`);
  const card = list.data.problems[0];
  ok('карточка без ответа/решения/условия', card && card.answer === undefined && card.solution === undefined && card.content === undefined);

  // найдём задачу с известным ответом (симметричная система, ответ 6)
  const target = await prisma.olympiadProblem.findUnique({ where: { externalId: 'OLY-math-15' } });
  const detail = await api(`/olympiad/problems/${target.id}`);
  ok('условие задачи доступно', detail.status === 200 && typeof detail.data.problem.content === 'string' && detail.data.problem.content.length > 50);
  ok('ответ и разбор скрыты до решения', detail.data.problem.answer === undefined && detail.data.problem.solution === undefined);

  // --- сабмит без токена ---
  const anon = await api(`/olympiad/problems/${target.id}/submit`, { method: 'POST', body: { answer: '6' } });
  ok('сабмит без токена → 401', anon.status === 401, `status=${anon.status}`);

  // --- неверный ответ ---
  const wrong = await api(`/olympiad/problems/${target.id}/submit`, { method: 'POST', token: demoToken, body: { answer: '999' } });
  ok('неверный ответ → correct:false, без разбора', wrong.status === 200 && wrong.data.correct === false && !wrong.data.problem);

  // --- верный ответ (с пробелом — проверка нормализации) ---
  const right = await api(`/olympiad/problems/${target.id}/submit`, { method: 'POST', token: demoToken, body: { answer: ' 6 ' } });
  ok('верный ответ принят (нормализация)', right.status === 200 && right.data.correct === true);
  ok('очки начислены (50, REPUBLIC)', right.data.pointsEarned === 50, `got=${right.data.pointsEarned}`);
  ok('разбор пришёл после решения', typeof right.data.problem?.solution === 'string' && right.data.problem.solution.length > 50);
  ok('достижение «Первый шаг» выдано', (right.data.unlockedAchievements ?? []).some(a => a.name.includes('Первый шаг')));

  // --- повторный сабмит: антинакрутка ---
  const again = await api(`/olympiad/problems/${target.id}/submit`, { method: 'POST', token: demoToken, body: { answer: '6' } });
  ok('повторный сабмит → alreadySolved, очки не растут', again.data.alreadySolved === true && again.data.pointsEarned === 50);
  const attempt = await prisma.olympiadAttempt.findUnique({ where: { userId_problemId: { userId: demoId, problemId: target.id } } });
  ok('в БД одна попытка, pointsEarned=50, xpGranted', attempt && attempt.pointsEarned === 50 && attempt.xpGranted === true);

  // --- раскрытие разбора другой задачи → решение без очков ---
  const target2 = await prisma.olympiadProblem.findUnique({ where: { externalId: 'OLY-math-09' } });
  const revealed = await api(`/olympiad/problems/${target2.id}/solution`, { method: 'POST', token: demoToken });
  ok('раскрытие разбора работает', revealed.status === 200 && typeof revealed.data.problem.solution === 'string');
  const solveAfterReveal = await api(`/olympiad/problems/${target2.id}/submit`, { method: 'POST', token: demoToken, body: { answer: '8' } });
  ok('решение после раскрытия → 0 очков', solveAfterReveal.data.correct === true && solveAfterReveal.data.pointsEarned === 0);

  // --- рейтинг ---
  const lb = await api('/olympiad/leaderboard', { token: demoToken });
  const meRow = lb.data?.me;
  ok('рейтинг: очки = 50 (revealed не считается)', lb.status === 200 && meRow && meRow.points === 50 && meRow.solved === 2, JSON.stringify(meRow));

  // --- прогресс ---
  const prog = await api('/olympiad/progress', { token: demoToken });
  ok('прогресс: решено 2, очки 50', prog.status === 200 && prog.data.solved === 2 && prog.data.points === 50);
  const guestProg = await api('/olympiad/progress');
  ok('прогресс без токена → 401', guestProg.status === 401, `status=${guestProg.status}`);

  // --- архив и теория ---
  const arch = await api('/olympiad/archive');
  ok('архив: есть годы и этапы', arch.status === 200 && arch.data.years.length >= 3 && arch.data.years[0].levels.length > 0);
  const th = await api('/olympiad/theory?subjectId=math');
  ok('теория math: 5 статей с превью', th.status === 200 && th.data.articles.length === 5 && !!th.data.articles[0].preview);
  const thArt = await api(`/olympiad/theory/${th.data.articles[0].id}`);
  ok('статья теории открывается', thArt.status === 200 && thArt.data.article.content.length > 200);

  // --- админ CRUD ---
  const noAdmin = await api('/admin/olympiad/problems', { token: demoToken });
  ok('admin-роут не для USER → 403', noAdmin.status === 403, `status=${noAdmin.status}`);
  const adminList = await api('/admin/olympiad/problems?level=REPUBLIC&limit=5', { token: adminToken });
  ok('admin-список с ответами', adminList.status === 200 && !!adminList.data.problems[0].answer);
  const created = await api('/admin/olympiad/problems', {
    method: 'POST', token: adminToken,
    body: { subjectId: target.subjectId, title: 'SMOKE-тест задача', content: 'Сколько будет $2+2$?', answer: '4', solution: 'Шаг 1. $2+2=4$.', level: 'SCHOOL', topic: 'Тест', hints: ['подсказка'], tags: ['smoke'] },
  });
  ok('admin: создание задачи', created.status === 201 && created.data.points === 10);
  const patched = await api(`/admin/olympiad/problems/${created.data.id}`, { method: 'PATCH', token: adminToken, body: { title: 'SMOKE-тест задача (ред.)', level: 'DISTRICT' } });
  ok('admin: PATCH задачи', patched.status === 200 && patched.data.level === 'DISTRICT');
  const deleted = await api(`/admin/olympiad/problems/${created.data.id}`, { method: 'DELETE', token: adminToken });
  ok('admin: удаление задачи', deleted.status === 200 && deleted.data.success === true);

  // --- уборка тестовых данных demo ---
  await prisma.olympiadAttempt.deleteMany({ where: { userId: demoId } });
  const olyAchIds = (await prisma.achievement.findMany({ where: { category: 'OLYMPIAD' }, select: { id: true } })).map(a => a.id);
  await prisma.userAchievement.deleteMany({ where: { userId: demoId, achievementId: { in: olyAchIds } } });
  await prisma.user.update({ where: { id: demoId }, data: { xp: xpBefore } });
  const left = await prisma.olympiadAttempt.count({ where: { userId: demoId } });
  ok('уборка: попытки/достижения/xp восстановлены', left === 0);

  console.log(`\nИтого: ${pass} ✓ / ${fail} ✗`);
  if (fail > 0) process.exitCode = 1;
}

main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
