# 🚀 CT-Platform — деплой с нуля (Neon + Render + Vercel)

Пошаговая инструкция для новичка. После неё у вас будет работающий сайт по постоянной ссылке:

- **Frontend** (сайт) → Vercel
- **Backend** (API) → Render
- **База данных** (PostgreSQL) → Neon

> Архитектура репозитория:
> - `app/` — фронтенд (Vite + React), собирается в `app/dist`
> - `ct-platform/backend/` — бэкенд (Next.js 14 API + Prisma)
> - База — PostgreSQL (Prisma, `provider = "postgresql"`)

> ⚠️ **Секреты (пароли, строки подключения) никогда не пишите в код и не коммитьте.** Только в переменные окружения на Render / Vercel. Файл `.env` уже в `.gitignore`.

---

## Шаг 1. Создать базу данных Neon (PostgreSQL)

1. Зайдите на **https://neon.tech** → зарегистрируйтесь (можно через GitHub).
2. **Create project** → выберите регион (например, *Europe (Frankfurt)*) → создайте.
3. На дашборде проекта откройте **Connection Details**.
4. Скопируйте **Connection string**. Он выглядит так:
   ```
   postgresql://ПОЛЬЗОВАТЕЛЬ:ПАРОЛЬ@ep-xxxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
   - Это **Pooled connection** (есть слово `-pooler`) — его используем для приложения.
   - Рядом есть переключатель на **Direct connection** (без `-pooler`) — он нужен только для миграций (см. Шаг 5, примечание).
5. Сохраните строку — это будущий `DATABASE_URL`.

> 💡 Neon бесплатный для небольших проектов. База не «засыпает» так агрессивно, как Render.

---

## Шаг 2. Создать сервис Render (backend)

1. Зайдите на **https://render.com** → войдите через GitHub.
2. **New +** → **Web Service**.
3. Подключите свой GitHub-репозиторий с проектом.
4. Настройки сервиса:
   - **Name:** `ct-platform` (любое)
   - **Region:** ближе к вам (Frankfurt)
   - **Branch:** `main`
   - **Root Directory:** `ct-platform/backend`  ← важно!
   - **Runtime / Environment:** `Node`
   - **Instance Type:** Free (для старта)

(Build/Start команды — в Шагах 5 и 6.)

---

## Шаг 3. Переменные окружения для Render

В сервисе Render → вкладка **Environment** → **Add Environment Variable**. Добавьте:

| Ключ | Значение | Зачем |
|---|---|---|
| `DATABASE_URL` | строка подключения Neon из Шага 1 (pooled) | подключение к БД |
| `NEXTAUTH_URL` | `https://ИМЯ-сервиса.onrender.com` (адрес этого же бэкенда) | базовый URL |
| `NEXTAUTH_SECRET` | длинная случайная строка (см. ниже) | подпись JWT-токенов |
| `FRONTEND_URL` | `https://ВАШ-проект.vercel.app` (адрес фронта, из Шага 7) | CORS |
| `NODE_ENV` | `production` | режим |

Опционально (можно не задавать — есть запасные варианты):
| `REDIS_URL` | строка Redis | rate-limit (без неё — лимит в памяти) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `EMAIL_FROM` | данные почты | письма (сброс пароля) |

Как сгенерировать `NEXTAUTH_SECRET` (выполните на своём компьютере и скопируйте результат):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

> ⚠️ `FRONTEND_URL` должен **точно** совпадать с адресом фронта (https, без `/` в конце) — иначе браузер заблокирует запросы (CORS).

---

## Шаг 4. Подключить GitHub

1. Код должен быть в GitHub-репозитории (он уже подключён в Шагах 2 и 7).
2. Render и Vercel **автоматически передеплоят** проект при каждом `git push` в ветку `main`.
3. Локально, чтобы отправить изменения:
   ```bash
   git add -A
   git commit -m "Описание изменений"
   git push
   ```

---

## Шаг 5. Build Command для Render

В сервисе Render → **Settings** → **Build Command**:

```
npm install && npm run build
```

Что происходит: `npm install` ставит зависимости и автоматически запускает `prisma generate` (через `postinstall`), затем `npm run build` собирает Next.js.

> **Примечание про миграции (важно для первого запуска).**
> Схема БД и данные в этом проекте **уже применены к Neon** (миграция `prisma/migrations/0_init`). Поэтому миграции при старте запускать не нужно.
> Если вы делаете **полностью новую** базу Neon — один раз создайте таблицы и наполните данными **со своего компьютера** (см. Шаг 9, блок «Новая пустая база»). Для миграций используйте **Direct connection** Neon (строка без `-pooler`), т.к. пулер не поддерживает блокировки миграций.

---

## Шаг 6. Start Command для Render

В сервисе Render → **Settings** → **Start Command**:

```
npm run start
```

Это запускает `next start` — продакшен-сервер API на порту, который Render передаёт автоматически.

После заполнения Шагов 2–6 нажмите **Create Web Service** / **Manual Deploy → Deploy latest commit**. Дождитесь статуса **Live**. Запомните адрес — `https://ИМЯ.onrender.com`.

> Проверка: откройте `https://ИМЯ.onrender.com/api/subjects` — должен вернуться JSON со списком предметов. (Первый запрос на Free-тарифе может «просыпаться» 30–60 сек.)

---

## Шаг 7. Подключить Vercel (frontend)

1. Зайдите на **https://vercel.com** → войдите через GitHub.
2. **Add New… → Project** → выберите тот же репозиторий.
3. Настройки:
   - **Root Directory:** `app`  ← важно!
   - **Framework Preset:** Vite (определится сам)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
4. Файл `app/vercel.json` уже в репозитории — он обеспечивает работу прямых ссылок (`/theory`, `/practice/...`), чтобы они не давали 404.

---

## Шаг 8. Переменные окружения для Vercel

В проекте Vercel → **Settings** → **Environment Variables** добавьте:

| Ключ | Значение | Зачем |
|---|---|---|
| `VITE_API_URL` | `https://ИМЯ.onrender.com` (адрес бэкенда из Шага 6) | фронт обращается к API. **Без `/api` и без `/` в конце.** |

После добавления нажмите **Deploy** (или **Redeploy**), т.к. переменные `VITE_*` «вшиваются» в сборку.

Получите адрес фронта — `https://ВАШ-проект.vercel.app`.

**Замкните связь:** вернитесь в Render (Шаг 3) и убедитесь, что `FRONTEND_URL` = этот адрес Vercel. Если меняли — Render передеплоится.

---

## Шаг 9. Как проверить работоспособность

**Бэкенд (подставьте свой адрес):**
```bash
# 1) API отвечает (200 + JSON со списком предметов)
curl https://ИМЯ.onrender.com/api/subjects

# 2) CORS разрешён вашему фронту
curl -I -X OPTIONS https://ИМЯ.onrender.com/api/subjects -H "Origin: https://ВАШ-проект.vercel.app"
#   → в ответе должна быть строка: Access-Control-Allow-Origin: https://ВАШ-проект.vercel.app

# 3) Вход админом (вернёт token)
curl -X POST https://ИМЯ.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@ct-platform.by\",\"password\":\"Admin123!\"}"
```

**Сайт в браузере:**
- [ ] Главная открывается, видны предметы.
- [ ] Раздел **Теория** показывает статьи (с блоками «Кратко / Типичные ошибки / Ловушки»).
- [ ] Практика грузит задания, ответ засчитывается.
- [ ] Прямая ссылка `…/theory` открывается без 404 (SPA-фолбэк работает).
- [ ] В консоли браузера (F12) нет ошибок CORS / Mixed Content.
- [ ] Вход: `demo@ct-platform.by / Demo123!`, админ: `admin@ct-platform.by / Admin123!`.

**Новая пустая база** (только если создаёте Neon с нуля и в нём нет данных). На своём компьютере:
```bash
cd ct-platform/backend
# .env c DATABASE_URL = DIRECT connection Neon (строка БЕЗ -pooler)
npx prisma db push          # создать таблицы
node prisma/seed.js                 # базовая структура + админ + предметы/темы
node prisma/seed-gen-questions.js   # ~490 вычисляемых заданий (математика/физика/химия)
node prisma/seed-theory-structured.js  # блоки «вывод/ошибки/ловушки» для теории
node prisma/audit.js                # проверка целостности данных
```

---

## Шаг 10. Как обновлять сайт после изменений

```bash
git add -A
git commit -m "Что изменили"
git push
```
- Vercel пересоберёт **frontend**, Render — **backend** (1–3 минуты).
- Поменяли `VITE_API_URL`? → на Vercel нажмите **Redeploy**.
- Изменили схему БД (`schema.prisma`)? → создайте миграцию локально:
  ```bash
  cd ct-platform/backend
  # .env с DIRECT connection Neon (без -pooler)
  npx prisma migrate dev --name краткое_описание
  git add prisma/migrations && git commit -m "db: миграция" && git push
  ```
  затем примените на проде: `npx prisma migrate deploy` (с DIRECT connection).

---

## Частые ошибки

| Симптом | Причина | Решение |
|---|---|---|
| `CORS: No 'Access-Control-Allow-Origin'` | `FRONTEND_URL` ≠ адрес фронта | Поставьте точный адрес Vercel в Render, передеплойте |
| Запросы идут на `localhost:3000` | не задан `VITE_API_URL` | Задайте на Vercel и **Redeploy** |
| `Mixed Content blocked` | `VITE_API_URL` на `http` | Используйте `https` адрес Render |
| `404` при обновлении `/theory` | нет SPA-фолбэка | Файл `app/vercel.json` (уже в репо) |
| Backend 500 / не стартует | неверный `DATABASE_URL` или провайдер | Проверьте строку Neon; схема = `postgresql` |
| `migrate deploy` зависает | запуск миграций через pooler | Используйте **Direct connection** (без `-pooler`) |
| Первый запрос долгий | Free-тариф Render «засыпает» | Норма; платный тариф убирает паузу |

---

### Готово
После Шагов 1–8 сайт доступен по адресу Vercel и работает с реальной базой Neon. Делитесь ссылкой. Свой домен можно привязать в Vercel → **Settings → Domains**.
