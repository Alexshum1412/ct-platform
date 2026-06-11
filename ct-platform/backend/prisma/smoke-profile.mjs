// Смоук вкладок личного кабинета: история практики (GET /users/progress),
// рейтинг (leaderboard/me), олимпиадный прогресс, подписка.
const API = process.env.API_URL || 'http://localhost:3010';

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

const login = await api('/auth/login', { method: 'POST', body: { email: 'demo@ct-platform.by', password: 'Demo123!' } });
const token = login.data?.token;
ok('логин demo', !!token);

const anon = await api('/users/progress');
ok('история практики без токена → 401', anon.status === 401, `status=${anon.status}`);

const hist = await api('/users/progress?limit=5', { token });
ok('история практики: 200 + форма ответа', hist.status === 200 && Array.isArray(hist.data.items) && typeof hist.data.total === 'number');
if (hist.data.items.length > 0) {
  const it = hist.data.items[0];
  ok('элемент: preview/subject/isCorrect/createdAt', typeof it.preview === 'string' && 'subject' in it && typeof it.isCorrect === 'boolean' && !!it.createdAt);
  ok('preview обрезан ≤140', it.preview.length <= 140);
} else {
  console.log('  · у demo нет записей практики — форма проверена на пустом списке');
}

const clamped = await api('/users/progress?limit=99999&offset=-5', { token });
ok('limit/offset клампятся', clamped.status === 200 && clamped.data.limit === 100 && clamped.data.offset === 0);

const rank = await api('/leaderboard/me', { token });
ok('leaderboard/me: rank+percentile', rank.status === 200 && rank.data.rank >= 1 && typeof rank.data.percentile === 'number');

const oly = await api('/olympiad/progress', { token });
ok('olympiad/progress доступен', oly.status === 200 && typeof oly.data.solved === 'number' && !!oly.data.byLevel);

const sub = await api('/subscription', { token });
ok('subscription GET', sub.status === 200 && typeof sub.data.isPremium === 'boolean');

const stats = await api('/users/stats', { token });
ok('stats: recentActivity и byTopic присутствуют', stats.status === 200 && 'recentActivity' in stats.data && Array.isArray(stats.data.bySubject) && (stats.data.bySubject.length === 0 || 'byTopic' in stats.data.bySubject[0]));

console.log(`\nИтого: ${pass} ✓ / ${fail} ✗`);
if (fail > 0) process.exitCode = 1;
