import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MapPin, School, Calendar, Edit2, Save, Award, TrendingUp, BookOpen,
  Clock, Target, Crown, Flame, Trophy, BarChart3, LogOut, X, CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/store/useAppStore';
import { userApi, apiClient } from '@/lib/api/client';

interface Stats {
  totalSolved: number; correctCount: number; accuracy: number; totalTime: number;
  streakDays: number; xp: number; level: number;
  bySubject: Array<{ subjectId: string; subjectName: string; color: string; slug: string; totalSolved: number; correctCount: number; accuracy: number }>;
  examCount: number; bestExamScore: number;
}

interface Achievement {
  id: string; name: string; description: string; icon: string;
  xp: number; rarity: string; category: string;
  unlocked: boolean; unlockedAt?: string; progress: number; total: number;
}

interface ExamHistory {
  id: string; subjectName: string; subjectColor: string; percentage: number;
  score: number; maxScore: number; startedAt: string; completedAt: string;
}

const rarityColors: Record<string, string> = {
  common: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  rare: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  epic: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  legendary: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
};

const rarityLabels: Record<string, string> = {
  common: 'Обычное', rare: 'Редкое', epic: 'Эпическое', legendary: 'Легендарное',
};

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, token, setUser, logout } = useAppStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [examHistory, setExamHistory] = useState<ExamHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(user?.name ?? '');
  const [editedCity, setEditedCity] = useState(user?.city ?? '');
  const [editedSchool, setEditedSchool] = useState(user?.school ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [achievementFilter, setAchievementFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  const loadData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    const [statsRes, achRes, histRes] = await Promise.all([
      apiClient('/users/stats', { token }),
      apiClient('/users/achievements', { token }),
      apiClient('/exam/history', { token }),
    ]);
    if (statsRes.data) setStats(statsRes.data as Stats);
    if (achRes.data) setAchievements((achRes.data as { achievements: Achievement[] }).achievements ?? []);
    if (histRes.data) setExamHistory((histRes.data as ExamHistory[]) ?? []);
    setIsLoading(false);
  }, [token]);

  useEffect(() => { void loadData(); }, [loadData]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center max-w-sm">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">Войдите, чтобы просмотреть профиль</p>
          <Button onClick={() => navigate('/login')}>Войти</Button>
        </Card>
      </div>
    );
  }

  const handleSave = async () => {
    if (!token) return;
    setIsSaving(true);
    const result = await userApi.updateProfile({ name: editedName, city: editedCity, school: editedSchool }, token);
    if (result.data && user) {
      setUser({ ...user, ...(result.data as Partial<typeof user>) });
      setIsEditing(false);
    }
    setIsSaving(false);
  };

  const xpToNextLevel = (stats?.level ?? user?.level ?? 1) * 100;
  const currentXp = (stats?.xp ?? user?.xp ?? 0) % xpToNextLevel;
  const xpProgress = Math.round((currentXp / xpToNextLevel) * 100);
  const level = stats?.level ?? user?.level ?? 1;
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const filteredAch = achievements.filter(a =>
    achievementFilter === 'all' ? true : achievementFilter === 'unlocked' ? a.unlocked : !a.unlocked
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 max-w-6xl">
        {/* Delete confirmation overlay */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <Card className="max-w-sm w-full mx-4">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <X className="w-6 h-6 text-destructive" />
                </div>
                <h3 className="text-lg font-bold mb-2">Удалить аккаунт?</h3>
                <p className="text-muted-foreground text-sm mb-6">Это действие необратимо. Весь прогресс будет утерян.</p>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>Отмена</Button>
                  <Button variant="destructive" className="flex-1" onClick={() => { logout(); navigate('/'); }}>Удалить</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* Left: User Card */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="relative inline-block mb-4">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={user.image ?? ''} />
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                      {(user.name ?? user.email).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {user.plan !== 'FREE' && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                      <Crown className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-2 text-left">
                    <input value={editedName} onChange={e => setEditedName(e.target.value)} placeholder="Имя" className="w-full px-3 py-2 rounded-lg border text-sm bg-background" />
                    <input value={editedCity} onChange={e => setEditedCity(e.target.value)} placeholder="Город" className="w-full px-3 py-2 rounded-lg border text-sm bg-background" />
                    <input value={editedSchool} onChange={e => setEditedSchool(e.target.value)} placeholder="Школа/лицей" className="w-full px-3 py-2 rounded-lg border text-sm bg-background" />
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>Отмена</Button>
                      <Button size="sm" className="flex-1" onClick={handleSave} disabled={isSaving}>
                        <Save className="w-3 h-3 mr-1" />
                        {isSaving ? '...' : 'Сохранить'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="font-bold text-lg mb-0.5">{user.name ?? 'Пользователь'}</h2>
                    <p className="text-sm text-muted-foreground mb-3">{user.email}</p>
                    <div className="flex flex-wrap justify-center gap-1.5 mb-4">
                      {user.city && <Badge variant="secondary" className="text-xs gap-1"><MapPin className="w-3 h-3" />{user.city}</Badge>}
                      {user.school && <Badge variant="secondary" className="text-xs gap-1"><School className="w-3 h-3" />{user.school}</Badge>}
                      <Badge variant="outline" className="text-xs gap-1"><Calendar className="w-3 h-3" />С {new Date(user.createdAt).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</Badge>
                    </div>
                    <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setIsEditing(true)}>
                      <Edit2 className="w-3 h-3" />Редактировать
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Level + XP */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Уровень {level}</span>
                  <span className="text-xs text-muted-foreground">{currentXp} / {xpToNextLevel} XP</span>
                </div>
                <Progress value={xpProgress} className="h-2 mb-3" />
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div>
                    <p className="text-xl font-bold text-amber-500">{stats?.streakDays ?? 0}</p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Flame className="w-3 h-3" />дней подряд</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-purple-500">{unlockedCount}</p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Trophy className="w-3 h-3" />достижений</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardContent className="p-4 space-y-2">
                <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/')}>
                  <BookOpen className="w-4 h-4" />Продолжить учёбу
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2 text-destructive hover:text-destructive" onClick={() => { logout(); navigate('/'); }}>
                  <LogOut className="w-4 h-4" />Выйти
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right: Stats Overview */}
          <div className="lg:col-span-3">
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="w-5 h-5" />Общая статистика
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {[
                      { icon: BookOpen, value: stats?.totalSolved ?? 0, label: 'Решено заданий', color: 'text-blue-500' },
                      { icon: Target, value: `${stats?.accuracy ?? 0}%`, label: 'Точность', color: 'text-green-500' },
                      { icon: Clock, value: `${Math.round((stats?.totalTime ?? 0) / 60)} мин`, label: 'Время учёбы', color: 'text-purple-500' },
                      { icon: Award, value: stats?.examCount ?? 0, label: 'Экзаменов', color: 'text-amber-500' },
                    ].map(({ icon: Icon, value, label, color }) => (
                      <div key={label} className="text-center p-4 bg-muted/50 rounded-xl">
                        <Icon className={`w-5 h-5 mx-auto mb-2 ${color}`} />
                        <p className="text-2xl font-bold">{value}</p>
                        <p className="text-xs text-muted-foreground">{label}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Subject progress */}
                {!isLoading && stats && stats.bySubject.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Прогресс по предметам</h4>
                    {stats.bySubject.sort((a, b) => b.totalSolved - a.totalSolved).map((s, i) => (
                      <motion.div key={s.subjectId} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <Link to={`/subject/${s.slug}`} className="font-medium hover:text-primary transition-colors">{s.subjectName}</Link>
                          <div className="flex items-center gap-3 text-muted-foreground">
                            <span>{s.correctCount}/{s.totalSolved}</span>
                            <span className="font-semibold text-foreground w-10 text-right">{s.accuracy}%</span>
                          </div>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${s.accuracy}%` }}
                            transition={{ duration: 0.8, delay: i * 0.05 }}
                            className="h-full rounded-full"
                            style={{ background: s.color }}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {!isLoading && (!stats || stats.bySubject.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Начните решать задачи, чтобы видеть прогресс</p>
                    <Button className="mt-4" onClick={() => navigate('/')}>Начать обучение</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="achievements">
          <TabsList className="mb-6 w-full sm:w-auto">
            <TabsTrigger value="achievements" className="gap-2">
              <Trophy className="w-4 h-4" />Достижения
              {unlockedCount > 0 && <Badge variant="secondary" className="text-xs">{unlockedCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <TrendingUp className="w-4 h-4" />История экзаменов
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Edit2 className="w-4 h-4" />Настройки
            </TabsTrigger>
          </TabsList>

          <TabsContent value="achievements">
            <div className="flex gap-2 mb-4 flex-wrap">
              {(['all', 'unlocked', 'locked'] as const).map(f => (
                <Button key={f} size="sm" variant={achievementFilter === f ? 'default' : 'outline'} onClick={() => setAchievementFilter(f)}>
                  {f === 'all' ? 'Все' : f === 'unlocked' ? `Получено (${achievements.filter(a => a.unlocked).length})` : `В процессе (${achievements.filter(a => !a.unlocked).length})`}
                </Button>
              ))}
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAch.map((ach, i) => (
                  <motion.div key={ach.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <Card className={`overflow-hidden transition-all ${!ach.unlocked ? 'opacity-50 grayscale' : 'shadow-sm'}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${ach.unlocked ? 'bg-primary/10' : 'bg-muted'}`}>
                            {ach.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h4 className="font-semibold text-sm truncate">{ach.name}</h4>
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${rarityColors[ach.rarity]}`}>{rarityLabels[ach.rarity]}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">{ach.description}</p>
                            {!ach.unlocked && (
                              <div>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-muted-foreground">Прогресс</span>
                                  <span className="font-medium">{Math.min(ach.progress, ach.total)} / {ach.total}</span>
                                </div>
                                <Progress value={Math.min((ach.progress / ach.total) * 100, 100)} className="h-1" />
                              </div>
                            )}
                            {ach.unlocked && ach.unlockedAt && (
                              <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                {new Date(ach.unlockedAt).toLocaleDateString('ru-RU')}
                              </p>
                            )}
                          </div>
                          <div className="text-xs text-amber-500 font-semibold shrink-0">+{ach.xp} XP</div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history">
            {isLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
            ) : examHistory.length > 0 ? (
              <div className="space-y-3">
                {examHistory.map((exam, i) => (
                  <motion.div key={exam.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card>
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-lg font-bold shrink-0" style={{ background: exam.subjectColor }}>
                          {exam.percentage}%
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{exam.subjectName}</p>
                          <p className="text-sm text-muted-foreground">{exam.score}/{exam.maxScore} правильных</p>
                          <p className="text-xs text-muted-foreground">{new Date(exam.startedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${exam.percentage >= 60 ? 'text-green-600' : 'text-red-500'}`}>{exam.percentage >= 60 ? '✓ Сдан' : '✗ Не сдан'}</div>
                          <Progress value={exam.percentage} className="h-1.5 w-20 mt-1" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
                  <p className="text-muted-foreground">Ещё не проходили пробные экзамены</p>
                  <Button className="mt-4" onClick={() => navigate('/')}>Пройти экзамен</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="settings">
            <div className="max-w-lg space-y-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Уведомления</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: 'Email-уведомления о новых заданиях', key: 'email' },
                    { label: 'Напоминания о ежедневной практике', key: 'reminder' },
                    { label: 'Достижения и награды', key: 'achievements' },
                  ].map(({ label, key }) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm">{label}</span>
                      <input type="checkbox" defaultChecked className="w-4 h-4" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {user.plan === 'FREE' && (
                <Card className="border-amber-300 dark:border-amber-700">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <Crown className="w-6 h-6 text-amber-500" />
                      <div>
                        <p className="font-semibold">Обновиться до Premium</p>
                        <p className="text-sm text-muted-foreground">Неограниченные задания, полная аналитика</p>
                      </div>
                    </div>
                    <Button onClick={() => navigate('/contact')} className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                      <Crown className="w-4 h-4 mr-2" />От 15 BYN/месяц
                    </Button>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader><CardTitle className="text-base text-destructive">Опасная зона</CardTitle></CardHeader>
                <CardContent>
                  <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                    Удалить аккаунт
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">Данное действие необратимо</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default ProfilePage;
