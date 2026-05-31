import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Achievement definitions (checked against user stats)
const ACHIEVEMENT_DEFS = [
  // Practice milestones
  { id: 'first-step', name: 'Первые шаги', description: 'Решите первое задание', icon: '🎯', xp: 10, rarity: 'COMMON', category: 'PRACTICE', condition: { type: 'solved', value: 1 } },
  { id: 'beginner', name: 'Новичок', description: 'Решите 10 заданий', icon: '📚', xp: 25, rarity: 'COMMON', category: 'PRACTICE', condition: { type: 'solved', value: 10 } },
  { id: 'student', name: 'Ученик', description: 'Решите 50 заданий', icon: '✏️', xp: 50, rarity: 'COMMON', category: 'PRACTICE', condition: { type: 'solved', value: 50 } },
  { id: 'marathoner', name: 'Марафонец', description: 'Решите 100 заданий', icon: '🏃', xp: 100, rarity: 'RARE', category: 'PRACTICE', condition: { type: 'solved', value: 100 } },
  { id: 'champion', name: 'Чемпион', description: 'Решите 300 заданий', icon: '🏆', xp: 250, rarity: 'EPIC', category: 'PRACTICE', condition: { type: 'solved', value: 300 } },
  { id: 'legend', name: 'Легенда', description: 'Решите 1000 заданий', icon: '⚡', xp: 1000, rarity: 'LEGENDARY', category: 'PRACTICE', condition: { type: 'solved', value: 1000 } },
  // Accuracy
  { id: 'sharp-eye', name: 'Меткий глаз', description: 'Достигните 70% точности (мин. 10 задач)', icon: '🎯', xp: 50, rarity: 'COMMON', category: 'PRACTICE', condition: { type: 'accuracy', value: 70, minSolved: 10 } },
  { id: 'expert', name: 'Эксперт', description: 'Достигните 85% точности (мин. 30 задач)', icon: '🧠', xp: 100, rarity: 'RARE', category: 'PRACTICE', condition: { type: 'accuracy', value: 85, minSolved: 30 } },
  { id: 'perfectionist', name: 'Перфекционист', description: '10 ответов подряд без ошибки', icon: '💎', xp: 150, rarity: 'RARE', category: 'PRACTICE', condition: { type: 'accuracy_streak', value: 10 } },
  // Streaks
  { id: 'streak-3', name: 'На старте', description: '3 дня подряд', icon: '🔥', xp: 15, rarity: 'COMMON', category: 'STREAK', condition: { type: 'streak', value: 3 } },
  { id: 'streak-7', name: 'Неделя огня', description: '7 дней подряд', icon: '⚡', xp: 50, rarity: 'RARE', category: 'STREAK', condition: { type: 'streak', value: 7 } },
  { id: 'streak-30', name: 'Месяц упорства', description: '30 дней подряд', icon: '🌟', xp: 200, rarity: 'EPIC', category: 'STREAK', condition: { type: 'streak', value: 30 } },
  // Exams
  { id: 'exam-first', name: 'Первый экзамен', description: 'Пройдите первый пробный экзамен', icon: '📝', xp: 20, rarity: 'COMMON', category: 'EXAM', condition: { type: 'exams', value: 1 } },
  { id: 'exam-5', name: 'Испытатель', description: 'Пройдите 5 пробных экзаменов', icon: '📋', xp: 75, rarity: 'RARE', category: 'EXAM', condition: { type: 'exams', value: 5 } },
  { id: 'exam-pass', name: 'Успешный старт', description: 'Наберите 60+ баллов на экзамене', icon: '✅', xp: 100, rarity: 'RARE', category: 'EXAM', condition: { type: 'exam_score', value: 60 } },
  { id: 'exam-high', name: 'Отличник', description: 'Наберите 80+ баллов на экзамене', icon: '🥇', xp: 200, rarity: 'EPIC', category: 'EXAM', condition: { type: 'exam_score', value: 80 } },
  // XP milestones
  { id: 'xp-100', name: 'Первые очки', description: 'Наберите 100 XP', icon: '💫', xp: 10, rarity: 'COMMON', category: 'PRACTICE', condition: { type: 'xp', value: 100 } },
  { id: 'xp-500', name: 'Опытный', description: 'Наберите 500 XP', icon: '⭐', xp: 25, rarity: 'COMMON', category: 'PRACTICE', condition: { type: 'xp', value: 500 } },
  { id: 'xp-2000', name: 'Знаток', description: 'Наберите 2000 XP', icon: '🌠', xp: 50, rarity: 'RARE', category: 'PRACTICE', condition: { type: 'xp', value: 2000 } },
];

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { streakDays: true, xp: true, level: true },
    });

    const [totalSolved, correctCount, examCount, bestExam, userAchievements] = await Promise.all([
      prisma.userProgress.count({ where: { userId } }),
      prisma.userProgress.count({ where: { userId, isCorrect: true } }),
      prisma.examAttempt.count({ where: { userId, isCompleted: true } }),
      prisma.examAttempt.findFirst({ where: { userId, isCompleted: true }, orderBy: { percentage: 'desc' }, select: { percentage: true } }),
      prisma.userAchievement.findMany({ where: { userId }, include: { achievement: true } }),
    ]);

    const accuracy = totalSolved > 0 ? Math.round((correctCount / totalSolved) * 100) : 0;
    const unlockedIds = new Set(userAchievements.map(ua => ua.achievement.name));

    // Check which achievements should be unlocked
    const toUnlock: string[] = [];

    for (const def of ACHIEVEMENT_DEFS) {
      const alreadyUnlocked = unlockedIds.has(def.name);
      if (alreadyUnlocked) continue;

      let shouldUnlock = false;
      switch (def.condition.type) {
        case 'solved': shouldUnlock = totalSolved >= def.condition.value; break;
        case 'accuracy': shouldUnlock = totalSolved >= (def.condition.minSolved ?? 1) && accuracy >= def.condition.value; break;
        case 'streak': shouldUnlock = (user?.streakDays ?? 0) >= def.condition.value; break;
        case 'exams': shouldUnlock = examCount >= def.condition.value; break;
        case 'exam_score': shouldUnlock = (bestExam?.percentage ?? 0) >= def.condition.value; break;
        case 'xp': shouldUnlock = (user?.xp ?? 0) >= def.condition.value; break;
      }

      if (shouldUnlock) toUnlock.push(def.id);
    }

    // Auto-unlock newly earned achievements
    const newlyUnlocked: string[] = [];
    for (const defId of toUnlock) {
      const def = ACHIEVEMENT_DEFS.find(d => d.id === defId);
      if (!def) continue;

      // Ensure achievement record exists
      const ach = await prisma.achievement.upsert({
        where: { id: defId },
        create: {
          id: defId,
          name: def.name,
          description: def.description,
          icon: def.icon,
          xp: def.xp,
          rarity: def.rarity,
          category: def.category,
          condition: JSON.stringify(def.condition),
        },
        update: {},
      });

      await prisma.userAchievement.upsert({
        where: { userId_achievementId: { userId, achievementId: ach.id } },
        create: { userId, achievementId: ach.id },
        update: {},
      });

      newlyUnlocked.push(def.name);
    }

    // Return all achievements with unlock status
    const allAchievements = ACHIEVEMENT_DEFS.map(def => {
      const ua = userAchievements.find(ua => ua.achievement.name === def.name);
      const justUnlocked = newlyUnlocked.includes(def.name);

      // Calculate progress
      let progress = 0;
      let total = def.condition.value;
      switch (def.condition.type) {
        case 'solved': progress = Math.min(totalSolved, total); break;
        case 'accuracy': progress = Math.min(accuracy, total); break;
        case 'streak': progress = Math.min(user?.streakDays ?? 0, total); break;
        case 'exams': progress = Math.min(examCount, total); break;
        case 'exam_score': progress = Math.min(bestExam?.percentage ?? 0, total); break;
        case 'xp': progress = Math.min(user?.xp ?? 0, total); break;
      }

      return {
        id: def.id,
        name: def.name,
        description: def.description,
        icon: def.icon,
        xp: def.xp,
        rarity: def.rarity.toLowerCase(),
        category: def.category.toLowerCase(),
        unlocked: !!ua || justUnlocked,
        unlockedAt: ua?.unlockedAt ?? (justUnlocked ? new Date() : null),
        progress,
        total,
        isNew: justUnlocked,
      };
    });

    return NextResponse.json({ achievements: allAchievements, newlyUnlocked });
  } catch (error) {
    console.error('Achievements error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
