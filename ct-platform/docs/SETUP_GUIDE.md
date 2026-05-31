# 🚀 Полное руководство по установке и запуску CT-Platform

## 📋 Содержание
1. [Требования](#требования)
2. [Установка инструментов](#установка-инструментов)
3. [Настройка проекта](#настройка-проекта)
4. [Запуск разработки](#запуск-разработки)
5. [Деплой](#деплой)
6. [Устранение неполадок](#устранение-неполадок)

---

## Требования

### Минимальные
- **Node.js** 18+ 
- **npm** 9+ или **yarn** 1.22+
- **Git**

### Для полного функционала
- **PostgreSQL** 14+
- **Redis** 7+
- **Docker** (опционально)

---

## Установка инструментов

### 1. Node.js

**Windows:**
1. Скачайте с [nodejs.org](https://nodejs.org/)
2. Запустите установщик
3. Проверьте: `node -v` и `npm -v`

**Mac:**
```bash
# Через Homebrew
brew install node

# Или скачайте с nodejs.org
```

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Git

**Windows:** Скачайте с [git-scm.com](https://git-scm.com/)

**Mac:**
```bash
brew install git
```

**Linux:**
```bash
sudo apt-get install git
```

### 3. PostgreSQL (для backend)

**Windows:**
1. Скачайте с [postgresql.org](https://www.postgresql.org/download/windows/)
2. Запомните пароль пользователя `postgres`

**Mac:**
```bash
brew install postgresql
brew services start postgresql
```

**Linux:**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 4. Redis (для backend)

**Windows:**
```bash
# Через WSL или Docker
docker run -d -p 6379:6379 redis:latest
```

**Mac:**
```bash
brew install redis
brew services start redis
```

**Linux:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

### 5. VS Code (рекомендуется)

Скачайте с [code.visualstudio.com](https://code.visualstudio.com/)

**Рекомендуемые расширения:**
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- Prisma
- Thunder Client (для API тестов)

---

## Настройка проекта

### 1. Клонирование репозитория

```bash
# Создайте папку для проектов
mkdir ~/projects
cd ~/projects

# Клонируйте (или распакуйте архив)
git clone https://github.com/yourusername/ct-platform.git
# или
unzip ct-platform.zip

cd ct-platform
```

### 2. Frontend настройка

```bash
# Перейдите в папку frontend
cd app

# Установите зависимости
npm install

# Создайте файл окружения
cp .env.example .env.local

# Отредактируйте .env.local (опционально)
# VITE_API_URL=http://localhost:3001
```

### 3. Backend настройка

```bash
# Перейдите в папку backend
cd ../backend

# Установите зависимости
npm install

# Создайте файл окружения
cp .env.example .env

# Отредактируйте .env:
# DATABASE_URL="postgresql://user:password@localhost:5432/ct_platform"
# NEXTAUTH_SECRET="your-secret-key"
# REDIS_URL="redis://localhost:6379"
```

### 4. Настройка базы данных

```bash
# Создайте базу данных
sudo -u postgres psql -c "CREATE DATABASE ct_platform;"
sudo -u postgres psql -c "CREATE USER ct_user WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ct_platform TO ct_user;"

# Примените миграции
npx prisma migrate dev --name init

# Сгенерируйте клиент
npx prisma generate

# Заполните тестовыми данными (опционально)
npx prisma db seed
```

---

## Запуск разработки

### Вариант 1: Только Frontend (без backend)

```bash
cd app

# Запуск dev-сервера
npm run dev

# Откройте http://localhost:5173
```

### Вариант 2: Полный стек

**Терминал 1 - Backend:**
```bash
cd backend

# Запуск backend
npm run dev

# API доступен на http://localhost:3000
```

**Терминал 2 - Frontend:**
```bash
cd app

# Запуск frontend
npm run dev

# Приложение доступно на http://localhost:5173
```

### Вариант 3: Docker (всё вместе)

```bash
# Создайте docker-compose.yml (см. ниже)
docker-compose up -d

# Остановка
docker-compose down
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: ct_user
      POSTGRES_PASSWORD: ct_password
      POSTGRES_DB: ct_platform
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://ct_user:ct_password@postgres:5432/ct_platform
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis

  frontend:
    build: ./app
    ports:
      - "5173:5173"
    depends_on:
      - backend

volumes:
  postgres_data:
```

---

## Деплой

### Frontend (Vercel)

```bash
# Установите Vercel CLI
npm i -g vercel

# Войдите
vercel login

# Деплой
cd app
vercel

# Продакшн деплой
vercel --prod
```

### Backend (Vercel/Railway/Render)

**Vercel:**
```bash
cd backend
vercel
```

**Railway:**
1. Создайте аккаунт на [railway.app](https://railway.app)
2. Подключите GitHub репозиторий
3. Добавьте PostgreSQL и Redis
4. Настройте переменные окружения
5. Деплой автоматический

**Render:**
1. Создайте аккаунт на [render.com](https://render.com)
2. New Web Service → Connect GitHub
3. Выберите backend папку
4. Добавьте PostgreSQL
5. Настройте env vars

### Полный деплой (рекомендуется)

**Структура:**
- Frontend: Vercel
- Backend: Railway/Render
- Database: Railway PostgreSQL / Supabase
- Cache: Upstash Redis
- CDN: Cloudflare

**Шаги:**
1. Деплой backend на Railway
2. Получите URL (например, `https://ct-platform-api.railway.app`)
3. Добавьте в frontend `.env`:
   ```
   VITE_API_URL=https://ct-platform-api.railway.app
   ```
4. Деплой frontend на Vercel
5. Настройте CORS в backend

---

## Устранение неполадок

### Ошибка: "Cannot find module"
```bash
# Переустановите зависимости
rm -rf node_modules package-lock.json
npm install
```

### Ошибка: "Port already in use"
```bash
# Найдите процесс
lsof -i :3000

# Убейте процесс
kill -9 <PID>
```

### Ошибка: "Database connection failed"
```bash
# Проверьте PostgreSQL
sudo systemctl status postgresql

# Перезапустите
sudo systemctl restart postgresql

# Проверьте подключение
psql -U ct_user -d ct_platform -h localhost
```

### Ошибка: "Prisma Client not found"
```bash
# Сгенерируйте клиент
npx prisma generate

# Или пересоберите
npx prisma migrate dev
```

### Ошибка CORS
```ts
// backend/next.config.js
async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: 'https://your-frontend.vercel.app' },
        { key: 'Access-Control-Allow-Credentials', value: 'true' },
      ],
    },
  ];
}
```

---

## Полезные команды

```bash
# Frontend
npm run dev          # Запуск разработки
npm run build        # Сборка
npm run preview      # Предпросмотр сборки
npm run lint         # Проверка кода

# Backend
npm run dev          # Запуск разработки
npm run build        # Сборка
npm run start        # Продакшн
npm run db:migrate   # Миграции
npm run db:studio    # Prisma Studio

# Docker
docker-compose up -d     # Запуск
docker-compose down      # Остановка
docker-compose logs -f   # Логи
```

---

## Структура переменных окружения

### Frontend (.env.local)
```env
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=CT-Platform
VITE_APP_URL=http://localhost:5173
```

### Backend (.env)
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/ct_platform

# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-key

# OAuth
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password

# Redis
REDIS_URL=redis://localhost:6379

# reCAPTCHA
RECAPTCHA_SITE_KEY=xxx
RECAPTCHA_SECRET_KEY=xxx

# Environment
NODE_ENV=development
```

---

## Контакты и поддержка

- Email: support@ct-platform.by
- Telegram: [@ct_platform_support](https://t.me/ct_platform_support)
- GitHub Issues: [github.com/yourusername/ct-platform/issues](https://github.com/yourusername/ct-platform/issues)
