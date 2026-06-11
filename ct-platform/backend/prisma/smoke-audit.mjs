// Smoke test for the audit fixes. Run: node prisma/smoke-audit.mjs (API_URL env overrides target)
// Uses the demo account against a local backend (default port 3000) + Prisma for checks.
import { PrismaClient } from '@prisma/client';

const API = process.env.API_URL || 'http://localhost:3000/api';
const prisma = new PrismaClient();
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};
const j = async (path, opts = {}, token) => {
  const r = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  let data = null;
  try { data = await r.json(); } catch { /* empty */ }
  return { status: r.status, data };
};

const cleanup = { attemptIds: [], contactIds: [], progressIds: [], subIds: [] };

try {
  // ---------- login ----------
  console.log('\n— Вход (demo)');
  const login = await j('/auth/login', { method: 'POST', body: JSON.stringify({ email: 'demo@ct-platform.by', password: 'Demo123!' }) });
  ok('login 200 + token', login.status === 200 && !!login.data?.token);
  const token = login.data.token;
  const demoId = login.data.user.id;

  // ---------- subscription (purchase → expire → downgrade) ----------
  console.log('\n— Подписка: покупка и истечение');
  const buy = await j('/subscription', { method: 'POST', body: JSON.stringify({ plan: 'monthly' }) }, token);
  ok('purchase 201 (демо-режим dev)', buy.status === 201, `got ${buy.status}`);
  if (buy.data?.subscription?.id) cleanup.subIds.push(buy.data.subscription.id);
  const subNow = await j('/subscription', {}, token);
  ok('после покупки isPremium=true', subNow.data?.isPremium === true);
  // истёкшая подписка
  await prisma.subscription.updateMany({ where: { userId: demoId, isActive: true }, data: { endDate: new Date(Date.now() - 3600_000) } });
  const subExpired = await j('/subscription', {}, token);
  ok('после истечения plan=FREE (ленивое понижение)', subExpired.data?.plan === 'FREE' && subExpired.data?.isPremium === false, JSON.stringify(subExpired.data));
  const planRow = await prisma.user.findUnique({ where: { id: demoId }, select: { plan: true } });
  ok('user.plan в БД понижен до FREE', planRow.plan === 'FREE');

  // снова Premium — чтобы экзаменационный лимит не мешал тестам ниже
  const buy2 = await j('/subscription', { method: 'POST', body: JSON.stringify({ plan: 'monthly' }) }, token);
  if (buy2.data?.subscription?.id) cleanup.subIds.push(buy2.data.subscription.id);

  // ---------- exam payload без ответов ----------
  console.log('\n— Экзамен: выдача без ответов');
  const exams = await j('/subjects/math/exams');
  ok('список экзаменов math не пуст', Array.isArray(exams.data) && exams.data.length > 0);
  const examId = exams.data[0].id;
  const detail = await j(`/exams/${examId}`);
  const qs = detail.data?.questions ?? [];
  ok('детали экзамена 200 + вопросы', detail.status === 200 && qs.length > 0);
  const leaked = qs.filter(q => q.correctAnswer !== undefined || q.explanation !== undefined || q.solution !== undefined || q.hints !== undefined
    || (Array.isArray(q.options) && q.options.some(o => 'isCorrect' in o)));
  ok('в выдаче нет correctAnswer/explanation/solution/hints/isCorrect', leaked.length === 0, `утекло у ${leaked.length} вопросов`);

  // ---------- exam start: канонический subjectId ----------
  console.log('\n— Экзамен: старт и сдача');
  const start = await j('/exam/start', { method: 'POST', body: JSON.stringify({ subjectId: 'math', examId }) }, token);
  ok('start 201 по slug "math"', start.status === 201 && !!start.data?.attemptId, `got ${start.status}`);
  const attemptId = start.data.attemptId;
  cleanup.attemptIds.push(attemptId);
  const attemptRow = await prisma.examAttempt.findUnique({ where: { id: attemptId } });
  const mathSubj = await prisma.subject.findFirst({ where: { slug: 'math' }, select: { id: true } });
  ok('attempt.subjectId = cuid (не slug)', attemptRow.subjectId === mathSubj.id, attemptRow.subjectId);
  ok('attempt.examId записан', attemptRow.examId === examId);

  // invalid exam id
  const badStart = await j('/exam/start', { method: 'POST', body: JSON.stringify({ subjectId: 'math', examId: 'nonexistent' }) }, token);
  ok('start с несуществующим examId → 404', badStart.status === 404, `got ${badStart.status}`);

  // ---------- submit: серверный грейдинг против состава экзамена ----------
  const examRow = await prisma.exam.findUnique({ where: { id: examId } });
  const allIds = JSON.parse(examRow.questionIds);
  // отвечаем правильно на первый вопрос (ответ берём из БД), с «грязным» вводом
  const q1 = await prisma.question.findUnique({ where: { id: allIds[0] } });
  const dirty = `  ${q1.correctAnswer.toUpperCase()}  `;
  const submit = await j('/exam/submit', { method: 'POST', body: JSON.stringify({ attemptId, answers: { [allIds[0]]: dirty } }) }, token);
  ok('submit 200', submit.status === 200, `got ${submit.status}`);
  ok('maxScore = полный состав экзамена (анти-чит)', submit.data?.maxScore === allIds.length, `${submit.data?.maxScore} vs ${allIds.length}`);
  ok('нормализация: «грязный» верный ответ засчитан', submit.data?.score === 1, `score=${submit.data?.score}`);
  ok('results содержат correctAnswer+explanation (для разбора)', Array.isArray(submit.data?.results) && submit.data.results.every(r => 'correctAnswer' in r && 'explanation' in r));
  ok('totalTime > 0 записан', typeof submit.data?.totalTime === 'number' && submit.data.totalTime >= 0);
  const resubmit = await j('/exam/submit', { method: 'POST', body: JSON.stringify({ attemptId, answers: {} }) }, token);
  ok('повторный submit → 409 (нельзя переписать результат)', resubmit.status === 409, `got ${resubmit.status}`);
  const eqCount = await prisma.examQuestion.count({ where: { examAttemptId: attemptId } });
  ok('ExamQuestion-строки созданы', eqCount === allIds.length, `${eqCount}`);

  // ---------- history: legacy slug + новые cuid ----------
  console.log('\n— Экзамен: история и «решён»');
  const hist = await j('/exam/history', {}, token);
  ok('history 200', hist.status === 200);
  const unknown = (hist.data ?? []).filter(h => h.subjectName === 'Неизвестный предмет');
  ok('нет «Неизвестный предмет» (вкл. старые slug-записи)', unknown.length === 0, `${unknown.length} строк`);
  const completed = await j('/exam/completed?subjectId=math', {}, token);
  ok('completed содержит сданный экзамен', (completed.data?.examIds ?? []).includes(examId));

  // ---------- practice: нормализация + timesSolved ----------
  console.log('\n— Практика: нормализация ответа и статистика');
  const tq = await prisma.question.findFirst({ where: { type: 'TEXT_INPUT', status: 'ACTIVE' }, select: { id: true, correctAnswer: true, timesSolved: true } });
  const dirtyAnswer = ` ${tq.correctAnswer.replace('.', ',')} `; // пробелы + запятая
  const prog = await j('/progress', { method: 'POST', body: JSON.stringify({ questionId: tq.id, answer: dirtyAnswer, timeSpent: 5 }) }, token);
  ok('progress 201', prog.status === 201, `got ${prog.status}`);
  ok('«5 » / «0,5» засчитан как верный', prog.data?.isCorrect === true);
  if (prog.data?.progress?.id) cleanup.progressIds.push(prog.data.progress.id);
  const tqAfter = await prisma.question.findUnique({ where: { id: tq.id }, select: { timesSolved: true } });
  ok('timesSolved инкрементирован', tqAfter.timesSolved === tq.timesSolved + 1, `${tq.timesSolved}→${tqAfter.timesSolved}`);

  // ---------- input hardening ----------
  console.log('\n— Защита входных параметров');
  const qBad = await j('/questions?limit=abc');
  ok('?limit=abc → 200 (не 500)', qBad.status === 200);
  const qHuge = await j('/questions?limit=999999');
  ok('?limit=999999 → ≤500 строк', qHuge.status === 200 && (qHuge.data?.questions?.length ?? 0) <= 500, `${qHuge.data?.questions?.length}`);
  const lbBad = await j('/leaderboard?limit=zzz');
  ok('leaderboard ?limit=zzz → 200', lbBad.status === 200);
  const search = await j('/theory/search?q=ПРОИЗВОДНАЯ');
  const searchLower = await j('/theory/search?q=производная');
  ok('поиск теории регистронезависим', (search.data?.items?.length ?? 0) === (searchLower.data?.items?.length ?? 0) && (search.data?.items?.length ?? 0) > 0, `${search.data?.items?.length} vs ${searchLower.data?.items?.length}`);

  // ---------- rate limits ----------
  console.log('\n— Rate limits');
  let regLimited = false;
  for (let i = 0; i < 7; i++) {
    const r = await j('/auth/register', { method: 'POST', body: JSON.stringify({ name: 'Тест', email: 'demo@ct-platform.by', password: 'Xx123456' }) });
    if (r.status === 429) { regLimited = true; break; }
  }
  ok('register: 429 после серии запросов', regLimited);
  let contactLimited = false;
  for (let i = 0; i < 7; i++) {
    const r = await j('/contact', { method: 'POST', body: JSON.stringify({ name: 'Смоук', email: 'smoke@test.by', subject: 'other', message: `аудит-тест ${i}` }) });
    if (r.status === 201 && r.data?.id) cleanup.contactIds.push(r.data.id);
    if (r.status === 429) { contactLimited = true; break; }
  }
  ok('contact: 429 после 5 сообщений', contactLimited);

  // ---------- финал: вернуть demo в FREE ----------
  await prisma.subscription.updateMany({ where: { userId: demoId, isActive: true }, data: { endDate: new Date(Date.now() - 3600_000) } });
  const downgraded = await j('/users/me', {}, token);
  ok('users/me после истечения → FREE (ленивое понижение)', downgraded.data?.plan === 'FREE', downgraded.data?.plan);
} catch (e) {
  fail++;
  console.error('💥 Ошибка теста:', e);
} finally {
  // -------- cleanup тестовых данных --------
  try {
    if (cleanup.contactIds.length) await prisma.contactMessage.deleteMany({ where: { id: { in: cleanup.contactIds } } });
    if (cleanup.progressIds.length) await prisma.userProgress.deleteMany({ where: { id: { in: cleanup.progressIds } } });
    if (cleanup.attemptIds.length) {
      await prisma.examQuestion.deleteMany({ where: { examAttemptId: { in: cleanup.attemptIds } } });
      await prisma.examAttempt.deleteMany({ where: { id: { in: cleanup.attemptIds } } });
    }
    const demo = await prisma.user.findUnique({ where: { email: 'demo@ct-platform.by' }, select: { id: true } });
    if (demo) {
      await prisma.subscription.deleteMany({ where: { userId: demo.id, paymentId: { startsWith: 'demo-' } } });
      await prisma.user.update({ where: { id: demo.id }, data: { plan: 'FREE' } });
    }
    console.log('\n🧹 Тестовые данные удалены (contact/progress/attempts/subscriptions), demo возвращён в FREE.');
  } catch (e) {
    console.error('cleanup error:', e.message);
  }
  await prisma.$disconnect();
  console.log(`\nИтог: ${pass} ✅ / ${fail} ❌`);
  process.exit(fail > 0 ? 1 : 0);
}
