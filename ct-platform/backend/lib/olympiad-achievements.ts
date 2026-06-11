// Выдача олимпиадных достижений (category='OLYMPIAD') после верного решения.
// Условия описаны в Achievement.condition JSON: { type, value }:
//   olympiad_solved   — решено ≥ value задач
//   olympiad_points   — набрано ≥ value олимпиадных очков
//   olympiad_levels   — решены задачи ≥ value разных уровней этапов
//   olympiad_subjects — решены задачи по ≥ value разным предметам
//   olympiad_republic — решено ≥ value задач республиканского уровня

import { prisma } from '@/lib/prisma';

export interface UnlockedAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp: number;
  rarity: string;
}

export async function checkOlympiadAchievements(userId: string): Promise<UnlockedAchievement[]> {
  try {
    const [achievements, earned, attempts] = await Promise.all([
      prisma.achievement.findMany({ where: { category: 'OLYMPIAD' } }),
      prisma.userAchievement.findMany({ where: { userId }, select: { achievementId: true } }),
      prisma.olympiadAttempt.findMany({
        where: { userId, isCorrect: true },
        select: { pointsEarned: true, problem: { select: { level: true, subjectId: true } } },
      }),
    ]);
    if (achievements.length === 0 || attempts.length === 0) return [];

    const earnedIds = new Set(earned.map(e => e.achievementId));
    const solved = attempts.length;
    const points = attempts.reduce((s, a) => s + a.pointsEarned, 0);
    const levels = new Set(attempts.map(a => a.problem.level)).size;
    const subjects = new Set(attempts.map(a => a.problem.subjectId)).size;
    const republic = attempts.filter(a => a.problem.level === 'REPUBLIC').length;

    const metric: Record<string, number> = {
      olympiad_solved: solved,
      olympiad_points: points,
      olympiad_levels: levels,
      olympiad_subjects: subjects,
      olympiad_republic: republic,
    };

    const unlocked: UnlockedAchievement[] = [];
    for (const a of achievements) {
      if (earnedIds.has(a.id)) continue;
      let cond: { type?: string; value?: number };
      try { cond = JSON.parse(a.condition); } catch { continue; }
      if (!cond.type || typeof cond.value !== 'number') continue;
      const current = metric[cond.type];
      if (current === undefined || current < cond.value) continue;

      try {
        await prisma.userAchievement.create({ data: { userId, achievementId: a.id } });
        // XP за достижение — только когда create прошёл (unique-констрейнт исключает дубль)
        if (a.xp > 0) await prisma.user.update({ where: { id: userId }, data: { xp: { increment: a.xp } } });
        unlocked.push({ id: a.id, name: a.name, description: a.description, icon: a.icon, xp: a.xp, rarity: a.rarity });
      } catch {
        // P2002 (параллельная выдача) — достижение уже есть, пропускаем
      }
    }
    return unlocked;
  } catch (error) {
    // Достижения — вторичная функция: их сбой не должен ломать сабмит ответа
    console.error('checkOlympiadAchievements error:', error);
    return [];
  }
}
