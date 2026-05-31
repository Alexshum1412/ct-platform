import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Lock, CheckCircle, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/store/useAppStore';
import { apiClient } from '@/lib/api/client';

interface Achievement {
  id: string; name: string; description: string; icon: string;
  xp: number; rarity: string; category: string;
  unlocked: boolean; unlockedAt?: string; progress: number; total: number;
}

const rarityColors: Record<string, string> = {
  common: 'border-gray-200 dark:border-gray-700',
  rare: 'border-blue-300 dark:border-blue-700',
  epic: 'border-purple-300 dark:border-purple-700',
  legendary: 'border-amber-300 dark:border-amber-600',
};
const rarityBg: Record<string, string> = {
  common: '',
  rare: 'bg-blue-50/50 dark:bg-blue-950/20',
  epic: 'bg-purple-50/50 dark:bg-purple-950/20',
  legendary: 'bg-amber-50/50 dark:bg-amber-950/20',
};
const rarityText: Record<string, string> = {
  common: 'text-gray-500', rare: 'text-blue-600', epic: 'text-purple-600', legendary: 'text-amber-600',
};
const rarityLabel: Record<string, string> = {
  common: 'Обычное', rare: 'Редкое', epic: 'Эпическое', legendary: 'Легендарное',
};
const categoryLabel: Record<string, string> = {
  practice: 'Практика', streak: 'Серии', exam: 'Экзамены',
};

export function AchievementsPage() {
  const navigate = useNavigate();
  const { user, token } = useAppStore();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    if (!token) { setIsLoading(false); return; }
    void apiClient('/users/achievements', { token }).then(res => {
      if (res.data) setAchievements((res.data as { achievements: Achievement[] }).achievements ?? []);
      setIsLoading(false);
    });
  }, [token]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center max-w-sm">
          <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">Войдите, чтобы видеть достижения</p>
          <Button onClick={() => navigate('/login')}>Войти</Button>
        </Card>
      </div>
    );
  }

  const filtered = achievements.filter(a => {
    const statusOk = filter === 'all' || (filter === 'unlocked' ? a.unlocked : !a.unlocked);
    const catOk = categoryFilter === 'all' || a.category === categoryFilter;
    return statusOk && catOk;
  });

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalXp = achievements.filter(a => a.unlocked).reduce((s, a) => s + a.xp, 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Trophy className="w-8 h-8 text-amber-500" />Достижения
          </h1>
          <p className="text-muted-foreground">Награды за упорство и прогресс в подготовке к ЦТ</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { value: unlockedCount, label: 'Получено', color: 'text-amber-500' },
            { value: achievements.length - unlockedCount, label: 'В процессе', color: '' },
            { value: `+${totalXp}`, label: 'XP заработано', color: 'text-purple-500' },
          ].map(({ value, label, color }) => (
            <Card key={label}><CardContent className="p-4 text-center">
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </CardContent></Card>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {['all', 'unlocked', 'locked'].map(f => (
            <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)}>
              {f === 'all' ? 'Все' : f === 'unlocked' ? `Получено (${unlockedCount})` : `Заблокировано`}
            </Button>
          ))}
          <div className="w-px bg-border mx-1" />
          {['all', 'practice', 'streak', 'exam'].map(c => (
            <Button key={c} size="sm" variant={categoryFilter === c ? 'secondary' : 'ghost'} onClick={() => setCategoryFilter(c)}>
              {c === 'all' ? 'Все' : categoryLabel[c]}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-36 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Lock className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground">Нет достижений в этой категории</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((ach, i) => (
              <motion.div key={ach.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className={`overflow-hidden border-2 ${rarityColors[ach.rarity]} ${rarityBg[ach.rarity]} ${!ach.unlocked ? 'opacity-60' : ''}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl shrink-0 ${ach.unlocked ? 'bg-background shadow-sm' : 'bg-muted'}`}>
                        {ach.unlocked ? ach.icon : <Lock className="w-6 h-6 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="font-semibold text-sm">{ach.name}</span>
                          <Badge variant="outline" className={`text-xs ${rarityText[ach.rarity]}`}>{rarityLabel[ach.rarity]}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{ach.description}</p>
                        {ach.unlocked ? (
                          <p className={`text-xs flex items-center gap-1 ${rarityText[ach.rarity]}`}>
                            <CheckCircle className="w-3 h-3" />
                            {ach.unlockedAt ? new Date(ach.unlockedAt).toLocaleDateString('ru-RU') : 'Получено'}
                          </p>
                        ) : (
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-muted-foreground">{Math.min(ach.progress, ach.total)} / {ach.total}</span>
                              <span className="text-amber-500 font-medium">+{ach.xp} XP</span>
                            </div>
                            <Progress value={Math.min((ach.progress / ach.total) * 100, 100)} className="h-1.5" />
                          </div>
                        )}
                      </div>
                    </div>
                    {ach.unlocked && (
                      <div className="mt-3 pt-2 border-t border-border/40 flex justify-between text-xs">
                        <span className="text-muted-foreground">{categoryLabel[ach.category] ?? ach.category}</span>
                        <span className="font-semibold text-amber-500">+{ach.xp} XP</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {user.plan === 'FREE' && !isLoading && (
          <Card className="mt-8 border-amber-300 dark:border-amber-700">
            <CardContent className="p-6 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <Crown className="w-8 h-8 text-amber-500" />
                <div>
                  <p className="font-semibold">Разблокируй достижения быстрее с Premium</p>
                  <p className="text-sm text-muted-foreground">Неограниченные задания и буст XP</p>
                </div>
              </div>
              <Button onClick={() => navigate('/contact')} className="bg-amber-500 hover:bg-amber-600 text-white shrink-0">
                <Crown className="w-4 h-4 mr-2" />Попробовать Premium
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}


export default AchievementsPage;
