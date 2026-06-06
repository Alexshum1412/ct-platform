import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: EmailOptions): Promise<void> {
  if (!process.env.SMTP_USER) {
    console.log('Email not sent (SMTP not configured):', { to, subject });
    return;
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@ct-platform.by',
    to,
    subject,
    html,
    text,
  });
}

// Email templates
export function getWelcomeEmail(name: string): { subject: string; html: string } {
  return {
    subject: 'Добро пожаловать в CT-Platform!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3b82f6;">Привет, ${name}!</h1>
        <p>Добро пожаловать в CT-Platform — лучшую платформу для подготовки к ЦТ и ЦЭ!</p>
        <p>Что дальше?</p>
        <ul>
          <li>Выберите предмет и начните практиковаться</li>
          <li>Проходите пробные экзамены</li>
          <li>Отслеживайте свой прогресс</li>
        </ul>
        <a href="https://ct-platform.by" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
          Начать обучение
        </a>
      </div>
    `,
  };
}

export function getVerificationEmail(name: string, code: string): { subject: string; html: string } {
  return {
    subject: `Код подтверждения CT-Platform: ${code}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3b82f6;">Подтверждение email</h1>
        <p>Здравствуйте, ${name}!</p>
        <p>Ваш код подтверждения для CT-Platform:</p>
        <div style="font-size: 34px; font-weight: 800; letter-spacing: 10px; text-align: center; background: #f3f4f6; padding: 18px; border-radius: 12px; margin: 18px 0; color: #111827;">
          ${code}
        </div>
        <p style="color:#6b7280;">Код действует 15 минут и используется один раз. Если вы не регистрировались на CT-Platform — просто проигнорируйте это письмо.</p>
      </div>
    `,
  };
}

export function getStreakReminderEmail(name: string, streakDays: number): { subject: string; html: string } {
  return {
    subject: 'Не прерывайте серию! 🔥',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #f59e0b;">Привет, ${name}!</h1>
        <p>У вас уже ${streakDays} дней подряд! 🔥</p>
        <p>Не прерывайте серию — зайдите сегодня и решите хотя бы одно задание!</p>
        <a href="https://ct-platform.by" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
          Продолжить серию
        </a>
      </div>
    `,
  };
}

export function getWeeklyReportEmail(name: string, stats: { solved: number; accuracy: number; xp: number }): { subject: string; html: string } {
  return {
    subject: 'Ваш еженедельный отчёт 📊',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3b82f6;">Ваш прогресс за неделю, ${name}!</h1>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 12px; margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
            <span>Решено заданий:</span>
            <strong>${stats.solved}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
            <span>Точность:</span>
            <strong>${stats.accuracy}%</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Заработано XP:</span>
            <strong>+${stats.xp}</strong>
          </div>
        </div>
        <a href="https://ct-platform.by/profile" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
          Посмотреть полную статистику
        </a>
      </div>
    `,
  };
}

export function getAchievementEmail(name: string, achievementName: string): { subject: string; html: string } {
  return {
    subject: `Новое достижение: ${achievementName}! 🎉`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #8b5cf6;">Поздравляем, ${name}!</h1>
        <p>Вы разблокировали новое достижение:</p>
        <div style="background: linear-gradient(135deg, #8b5cf6, #ec4899); padding: 24px; border-radius: 12px; color: white; text-align: center; margin: 20px 0;">
          <h2 style="margin: 0;">${achievementName}</h2>
        </div>
        <a href="https://ct-platform.by/achievements" style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
          Посмотреть все достижения
        </a>
      </div>
    `,
  };
}
