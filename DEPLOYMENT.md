# 🚀 Деплой CT-Platform — пошаговый практический гайд

Этот гайд проведёт вас от «работает только у меня на компьютере» до **постоянной публичной ссылки**, которую можно отправить любому человеку. После выполнения у вас будут жить в интернете:

- **Frontend** (сайт) — Vite + React, отдаётся как статика.
- **Backend** (API) — Next.js 14, крутится как Node-сервер.
- **База данных** — Prisma (SQLite на постоянном диске **или** PostgreSQL).
- **Все API** — авторизация, задания, теория, экзамены, прогресс, рейтинг.

> 💡 Главное, что нужно понять: **frontend и backend деплоятся по-разному.**
> Frontend — это просто набор файлов (статика), его можно положить почти куда угодно.
> Backend — это живая программа + база, ему нужен сервер, который работает постоянно,
> и **постоянный диск** (если оставляем SQLite) или внешняя БД (PostgreSQL).

---

## 0. Карта: что где живёт

```
                            ┌─────────────────────────────┐
   Любой человек  ──────►   │  FRONTEND (статика, Vercel) │
   https://ваш-сайт         │  app/  →  vite build → dist │
                            └───────────────┬─────────────┘
                                            │ fetch(VITE_API_URL + "/api/...")
                                            ▼
                            ┌─────────────────────────────┐
                            │  BACKEND (Node, Railway/Render)
                            │  ct-platform/backend/        │
                            │  next build → next start     │
                            └───────────────┬─────────────┘
                                            │ Prisma
                                            ▼
                            ┌─────────────────────────────┐
                            │  БД: SQLite на диске  ИЛИ    │
                            │  PostgreSQL (Neon/Render)    │
                            └─────────────────────────────┘
```

Две «склейки», которые всё связывают (запомните их — это 90% всех ошибок деплоя):

| Переменная | Где задаётся | Что в неё кладём |
|---|---|---|
| `VITE_API_URL` | на **frontend** | публичный адрес **backend** (например `https://ctplatform-api.up.railway.app`) |
| `FRONTEND_URL` | на **backend** | публичный адрес **frontend** (например `https://ctplatform.vercel.app`) — нужен для CORS |

---

## 1. Архитектура проекта (что уже есть)

| Часть | Технологии | Папка | Локальный порт |
|---|---|---|---|
| Frontend | Vite + React 19 + TS + Tailwind | `app/` | 5173 |
| Backend | Next.js 14 (App Router, только API) | `ct-platform/backend/` | 3000 |
| БД | Prisma + SQLite (`prisma/dev.db`) | `ct-platform/backend/prisma/` | — |

Важные факты из кода (это влияет на выбор хостинга):

- Frontend собирается в папку **`dist/`**, в `vite.config.ts` стоит `base: './'` — значит статику можно отдавать с любого хоста.
- Запросы к API уходят на **`VITE_API_URL + /api/...`** (см. `app/src/lib/api/client.ts`). Локальный прокси `/api → localhost:3000` в `vite.config.ts` работает **только в `npm run dev`** и в продакшене не используется.
- Backend проверяет JWT в `middleware.ts` (секрет `NEXTAUTH_SECRET`) и сам отдаёт **CORS-заголовки** на основе `FRONTEND_URL`.
- БД сейчас — **SQLite-файл**. Для него нужен **постоянный диск** (на serverless-хостингах вроде Vercel файл будет стираться при каждом запуске — поэтому backend туда не ставим).
- Миграции Prisma уже созданы (`prisma/migrations/`), поэтому в продакшене используем `prisma migrate deploy`.

---

## 2. Рекомендуемая схема хостинга

Есть два рабочих варианта. **Начните с Варианта A** — он проще и не требует менять базу.

### ✅ Вариант A (рекомендую новичкам): SQLite остаётся

- **Backend + БД** → **Railway** (или Render) как обычный Node-сервис **с постоянным диском (Volume)**. SQLite-файл лежит на этом диске и не теряется.
- **Frontend** → **Vercel** (или Netlify), статика.

**Плюсы:** ничего не переписываем в схеме БД, минимум шагов.
**Минусы:** одна копия сервера (для школьной/учебной платформы этого более чем достаточно).

### 🔷 Вариант B (на вырост): PostgreSQL

- **БД** → managed PostgreSQL (**Neon** — бесплатный, или Render PostgreSQL).
- **Backend** → Render / Railway (диск уже не обязателен для БД, но нужен для загруженных картинок).
- **Frontend** → Vercel / Netlify.

**Плюсы:** надёжнее, масштабируется, бэкапы «из коробки».
**Минусы:** нужно поменять провайдера в `schema.prisma` и заново прогнать миграции/сид.

> ⚠️ **Почему не Vercel для backend?** На Vercel функции «эфемерные» — файловая система обнуляется. SQLite-файл и загруженные картинки будут пропадать. Поэтому backend ставим туда, где есть постоянный диск (Railway/Render/обычный VPS).

---

## 3. Подготовка проекта (один раз, локально)

### 3.1. Проверьте, что всё собирается локально

```bash
# Frontend
cd app
npm install
npm run typecheck
npm run build          # должна появиться папка app/dist

# Backend
cd ../ct-platform/backend
npm install
npx prisma generate
npm run build          # next build без ошибок
```

### 3.2. Сгенерируйте секрет для JWT

`NEXTAUTH_SECRET` — это ключ, которым подписываются токены входа. В проде **обязательно** свой (в коде есть небезопасный дефолт `dev-insecure-secret`).

```bash
# любой из вариантов — скопируйте результат
openssl rand -base64 32
# или, если нет openssl:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3.3. Убедитесь, что секреты не попадают в git

В репозитории уже есть `.gitignore`. Проверьте, что туда внесены `.env`, `node_modules`, `dist`, `.next`, `*.db`:

```gitignore
node_modules/
dist/
.next/
.env
.env.*
!.env.example
*.db
*.db-journal
```

> `.env.example` оставляем в репозитории (как шаблон без значений), а реальный `.env` — нет.

---

## 4. Все переменные окружения

### Backend (`ct-platform/backend`)

| Переменная | Обязательна | Пример / значение | Зачем |
|---|---|---|---|
| `DATABASE_URL` | ✅ | SQLite: `file:/data/prod.db`<br>Postgres: `postgresql://user:pass@host:5432/db?sslmode=require` | подключение к БД |
| `NEXTAUTH_SECRET` | ✅ | результат `openssl rand -base64 32` | подпись/проверка JWT |
| `FRONTEND_URL` | ✅ | `https://ctplatform.vercel.app` | CORS — **точный** адрес фронта, без `/` в конце |
| `NEXTAUTH_URL` | ⬜ | `https://ctplatform-api.up.railway.app` | базовый URL для next-auth |
| `NODE_ENV` | ✅ | `production` | режим прод |
| `PORT` | ⬜ | хост обычно задаёт сам | порт сервера |
| `REDIS_URL` | ⬜ | `redis://...` | rate-limit (можно не задавать) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `EMAIL_FROM` | ⬜ | данные почтового ящика | письма (сброс пароля). Без них вход/регистрация работают |

### Frontend (`app`)

| Переменная | Обязательна | Пример | Зачем |
|---|---|---|---|
| `VITE_API_URL` | ✅ | `https://ctplatform-api.up.railway.app` | адрес backend (клиент сам добавит `/api`). **Без `/api` и без `/` в конце.** |

> Переменные `VITE_*` «вшиваются» в сборку. Если поменяли `VITE_API_URL` — фронт нужно **пересобрать/передеплоить**.

---

## 5. Вариант A — Backend + SQLite на Railway

> Railway: вход через GitHub на https://railway.app. Аналогично делается на Render (см. примечания).

1. **Залейте проект на GitHub** (если ещё не там):
   ```bash
   cd C:/Users/PC/Desktop/CTplatform
   git add .
   git commit -m "prepare for deploy"
   git branch -M main
   git remote add origin https://github.com/ВАШ_ЛОГИН/ct-platform.git
   git push -u origin main
   ```

2. **New Project → Deploy from GitHub repo** → выберите репозиторий.

3. В сервисе откройте **Settings** и задайте:
   - **Root Directory:** `ct-platform/backend`
   - **Build Command:** `npm install && npx prisma generate && npm run build`
   - **Start Command:** `npx prisma migrate deploy && npm run start`
     *(миграции применяются при каждом старте — это безопасно, повторно они не накатываются)*

4. **Добавьте постоянный диск (Volume):** в сервисе → **Volumes → New Volume**, точка монтирования: **`/data`**.

5. **Variables** (вкладка переменных) — добавьте:
   ```
   DATABASE_URL=file:/data/prod.db
   NEXTAUTH_SECRET=<ваш сгенерированный секрет>
   FRONTEND_URL=https://ВРЕМЕННО_ПОСТАВИМ_ПОЗЖЕ
   NODE_ENV=production
   ```
   *(`FRONTEND_URL` обновим на шаге 8, когда узнаем адрес фронта.)*

6. **Сгенерируйте домен:** Settings → **Networking → Generate Domain**. Получите что-то вроде
   `https://ctplatform-api.up.railway.app` — это и есть ваш **backend URL**. Запишите его.

7. **Залейте данные (сид) — один раз.** Откройте у сервиса консоль (Railway → service → **⋮ → Shell**, или вкладка с командой) и выполните:
   ```bash
   npx prisma migrate deploy   # создаст таблицы на /data/prod.db (если start ещё не успел)
   npx prisma db seed          # зальёт предметы, темы, задания, демо-пользователей
   ```
   > Если консоли нет — временно поставьте Start Command
   > `npx prisma migrate deploy && npx prisma db seed && npm run start`, дождитесь
   > одного запуска, затем верните обратно `npx prisma migrate deploy && npm run start`
   > (иначе сид будет пытаться выполняться при каждом рестарте).

**Render вместо Railway:** New → **Web Service**, Root Directory `ct-platform/backend`,
Build `npm install && npx prisma generate && npm run build`, Start `npx prisma migrate deploy && npm run start`,
добавьте **Disk** с путём `/data`, те же переменные.

➡️ Переходите к **разделу 7 (Frontend)**.

---

## 6. Вариант B — Backend + PostgreSQL

1. **Создайте БД.** На https://neon.tech → New Project → скопируйте **Connection String** вида
   `postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require`.

2. **Переключите Prisma на Postgres.** В `ct-platform/backend/prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"   // было "sqlite"
     url      = env("DATABASE_URL")
   }
   ```

3. **Пересоздайте миграции локально под Postgres** (старые сделаны под SQLite):
   ```bash
   cd ct-platform/backend
   # ВНИМАНИЕ: для чистого старта на Postgres
   rm -rf prisma/migrations
   set DATABASE_URL=postgresql://...   # Windows CMD; в PowerShell: $env:DATABASE_URL="postgresql://..."
   npx prisma migrate dev --name init
   npx prisma db seed
   git add prisma && git commit -m "switch to postgres"
   ```

4. **Задеплойте backend** на Railway/Render как в разделе 5, но:
   - **Volume не обязателен для БД** (он нужен только если используете загрузку картинок к заданиям — тогда смонтируйте диск под папку с загрузками).
   - В переменных: `DATABASE_URL=<строка подключения Neon>`, плюс `NEXTAUTH_SECRET`, `FRONTEND_URL`, `NODE_ENV=production`.
   - Start Command: `npx prisma migrate deploy && npm run start`.

> 📌 Переход SQLite → Postgres не переносит ваши локальные данные автоматически. Контент
> (предметы/задания/теория) восстанавливается командой `prisma db seed`. Если нужны именно
> текущие данные из `dev.db` — экспортируйте их скриптом перед переключением.

---

## 7. Frontend на Vercel

1. **Добавьте SPA-фолбэк** (чтобы прямые ссылки вида `/practice/math` не давали 404).
   Создайте файл **`app/vercel.json`**:
   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```

2. На https://vercel.com → **Add New → Project** → выберите тот же GitHub-репозиторий.

3. Настройки проекта:
   - **Root Directory:** `app`
   - **Framework Preset:** Vite (определится сам)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Environment Variables:**
     ```
     VITE_API_URL = https://ctplatform-api.up.railway.app   (ваш backend URL из шага 6 раздела 5)
     ```

4. **Deploy.** Получите адрес фронта, например `https://ctplatform.vercel.app`. Запишите его.

**Netlify вместо Vercel:** Base directory `app`, Build `npm run build`, Publish `app/dist`,
переменная `VITE_API_URL`, и создайте `app/public/_redirects` с одной строкой:
```
/*    /index.html   200
```

---

## 8. Связать frontend и backend (важно!)

Теперь у вас есть оба адреса. Замкните «кольцо»:

1. **На backend** (Railway/Render → Variables) поставьте точный адрес фронта:
   ```
   FRONTEND_URL=https://ctplatform.vercel.app
   ```
   → сервис перезапустится. Это разрешит CORS только вашему сайту.

2. **На frontend** (Vercel → Settings → Environment Variables) проверьте:
   ```
   VITE_API_URL=https://ctplatform-api.up.railway.app
   ```
   → нажмите **Redeploy** (без этого новая переменная не попадёт в сборку).

3. Готово — откройте `https://ctplatform.vercel.app` и проверьте вход.

---

## 9. Миграции БД и сохранность данных

- **Накатить миграции в проде:** это делает Start Command `npx prisma migrate deploy`.
  Команда применяет только новые миграции и **никогда не удаляет данные**.
- **Изменили схему?** Локально: `npx prisma migrate dev --name краткое_описание` → закоммитьте
  папку `prisma/migrations` → `git push`. На проде `migrate deploy` применит её сам при следующем старте.
- **Чтобы не потерять данные:**
  - SQLite (Вариант A): данные живут на **Volume `/data`**. Не удаляйте том. Делайте бэкап —
    скачайте `/data/prod.db` через консоль хоста (или `cp /data/prod.db /data/backup-$(date +%F).db`).
  - Postgres (Вариант B): включите автоматические бэкапы (в Neon/Render они есть в настройках).
- **Никогда не запускайте в проде** `prisma migrate reset` или `prisma db push --force-reset` — они стирают БД.

---

## 10. Как обновлять сайт после изменений

Оба хостинга подключены к GitHub, поэтому деплой автоматический:

```bash
# внесли правки в код →
git add .
git commit -m "что изменили"
git push
```

- Vercel пересоберёт **frontend**, Railway/Render — **backend**. Через 1–3 минуты изменения в проде.
- Если меняли только текст/стиль фронта — достаточно пуша (Vercel сам пересоберёт).
- Если добавили поля в БД — не забудьте миграцию (раздел 9).
- Если поменяли `VITE_API_URL` — нужен **Redeploy** фронта.

---

## 11. Проверка после деплоя (smoke-test)

Подставьте свои адреса. Backend:

```bash
# 1) API живой и отдаёт предметы (200 + JSON)
curl https://ctplatform-api.up.railway.app/api/subjects

# 2) CORS-заголовок присутствует и равен адресу фронта
curl -I -X OPTIONS https://ctplatform-api.up.railway.app/api/subjects \
  -H "Origin: https://ctplatform.vercel.app"
#   → ищите строку: Access-Control-Allow-Origin: https://ctplatform.vercel.app

# 3) Вход демо-пользователем (должен вернуть token)
curl -X POST https://ctplatform-api.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"demo@ct-platform.by\",\"password\":\"Demo123!\"}"
```

В браузере на сайте проверьте по списку:

- [ ] Главная открывается, видны предметы и статистика.
- [ ] Регистрация / вход работают (демо: `demo@ct-platform.by` / `Demo123!`).
- [ ] `/practice/math` открывается напрямую (не 404) — значит SPA-фолбэк настроен.
- [ ] В практике грузятся задания, ответ засчитывается, работает «Фокус» и сворачивание фильтров.
- [ ] Теория и формулы отображаются.
- [ ] Пробный экзамен запускается, таймер идёт, по завершении есть результат.
- [ ] В консоли браузера (F12) **нет ошибок CORS / Mixed Content**.
- [ ] Админ-вход (`admin@ct-platform.by` / `Admin123!`) открывает админ-панель.

---

## 12. «Нужно показать прямо сейчас» — временная ссылка за 2 минуты

Если деплой ещё не готов, а ссылку нужно отправить уже сегодня — поднимите **туннель** к локальным серверам.

```bash
# терминал 1 — backend
cd ct-platform/backend && npx next dev --port 3000

# терминал 2 — frontend (в .env.local фронта: VITE_API_URL=http://localhost:3000 не нужен —
# в dev работает прокси; но для туннеля укажите публичный адрес бэка, см. ниже)
cd app && npx vite --port 5173

# терминал 3 — публичный туннель к фронту (Cloudflare, без регистрации)
npx cloudflared tunnel --url http://localhost:5173
#   → выдаст ссылку вида https://xxxx.trycloudflare.com
```

> Это **временно** (пока работает ваш компьютер и терминалы) и подходит для быстрой демонстрации.
> Для туннеля бэкенд тоже нужно опубликовать (второй `cloudflared` на `:3000`) и прописать его адрес
> в `VITE_API_URL`, а адрес фронта — в `FRONTEND_URL` бэкенда. В `vite.config.ts` уже разрешён
> хост `.ngrok-free.dev` — для ngrok можно так же.
> **Постоянная ссылка** получается только полноценным деплоем (разделы 5–8).

---

## 13. Шпаргалка по командам

```bash
# --- Локальная проверка ---
cd app && npm run typecheck && npm run build       # frontend
cd ct-platform/backend && npx prisma generate && npm run build   # backend

# --- Секрет ---
openssl rand -base64 32

# --- БД (backend) ---
npx prisma migrate deploy     # применить миграции в проде (безопасно)
npx prisma db seed            # залить контент и демо-данные
npx prisma studio             # посмотреть БД в браузере (локально)
npx prisma migrate dev --name <имя>   # новая миграция при изменении схемы (локально)

# --- Backend в проде ---
# Build:  npm install && npx prisma generate && npm run build
# Start:  npx prisma migrate deploy && npm run start

# --- Обновление ---
git add . && git commit -m "..." && git push       # авто-деплой Vercel + Railway/Render
```

---

## 14. Порядок деплоя (чек-лист)

1. [ ] Локально проходят `npm run build` (фронт и бэк).
2. [ ] Сгенерирован `NEXTAUTH_SECRET`.
3. [ ] Код в GitHub, `.env` **не** закоммичен.
4. [ ] Backend задеплоен (Root = `ct-platform/backend`, есть Volume `/data` для SQLite).
5. [ ] Заданы `DATABASE_URL`, `NEXTAUTH_SECRET`, `NODE_ENV=production`.
6. [ ] Сгенерирован домен бэкенда, выполнены `migrate deploy` + `db seed`.
7. [ ] Frontend задеплоен (Root = `app`, Output = `dist`, есть `vercel.json`).
8. [ ] На фронте задан `VITE_API_URL` = адрес бэка.
9. [ ] На бэке задан `FRONTEND_URL` = адрес фронта, оба сервиса перезапущены.
10. [ ] Пройден smoke-test из раздела 11.

---

## 15. Частые ошибки и как их исправить

| Симптом | Причина | Решение |
|---|---|---|
| В консоли `CORS policy: No 'Access-Control-Allow-Origin'` | `FRONTEND_URL` на бэке не совпадает с адресом фронта | Поставьте **точный** адрес (https, без `/` в конце), перезапустите бэк |
| Все запросы идут на `http://localhost:3000` | не задан/не применился `VITE_API_URL` | Задайте на фронте и сделайте **Redeploy** (переменная вшивается в сборку) |
| `Mixed Content: blocked` | фронт на `https`, а `VITE_API_URL` на `http` | Используйте **https** адрес бэка |
| `404` при обновлении страницы `/practice/...` | нет SPA-фолбэка | Добавьте `app/vercel.json` (или `_redirects` для Netlify) — раздел 7 |
| `PrismaClientInitializationError` / `table does not exist` | не накатаны миграции / не сгенерирован клиент | В Build добавьте `npx prisma generate`, в Start — `npx prisma migrate deploy` |
| После рестарта пропали данные (SQLite) | нет постоянного диска | Смонтируйте Volume на `/data`, `DATABASE_URL=file:/data/prod.db` |
| `SQLITE_READONLY` / нельзя записать | путь к БД на read-only ФС | Кладите файл на Volume (`/data`), не в код проекта |
| `401 Требуется авторизация` сразу после входа | разные `NEXTAUTH_SECRET` или не задан в проде | Задайте один секрет на бэке, перелогиньтесь |
| Backend «засыпает», первый запрос долгий | спящие бесплатные планы (Render Free) | Это норма для free-тарифа; нужен платный план или Railway |
| Не приходят письма (сброс пароля) | не заданы `SMTP_*` | Задайте SMTP-переменные; вход/регистрация работают и без них |
| `Module not found` при сборке бэка | не запустился `prisma generate` | Build: `npm install && npx prisma generate && npm run build` |

---

### Итог

После разделов 5–8 у вас есть **постоянная публичная ссылка** на работающий сайт с живыми
backend, базой данных и всеми API. Делитесь адресом фронта (`https://...vercel.app` или ваш
собственный домен — его можно привязать в настройках Vercel: **Settings → Domains**).

Любые правки в коде → `git push` → через пару минут уже в проде.
