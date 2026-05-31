/**
 * Страница лидерборда
 * 
 * Показывает рейтинги пользователей по разным категориям:
 * - Общий рейтинг (топ-10)
 * - По предметам
 * - По городам
 * 
 * Примечание: Рейтинг по школам и отделениям удалён
 * по требованию приватности пользователей
 * 
 * Ссылки на API:
 * - GET /api/leaderboard/global - общий рейтинг
 * - GET /api/leaderboard/subjects - по предметам
 * - GET /api/leaderboard/cities - по городам
 * - GET /api/leaderboard/me - позиция текущего пользователя
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '@/lib/api/client';
import { 
  Trophy, 
  Medal, 
  Award,
  Users,
  MapPin,
  Flame
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAppStore } from '@/store/useAppStore';

// =====================================================
// ТИПЫ ДАННЫХ
// =====================================================

interface LeaderboardUser {
  rank: number;
  userId: string;
  name: string;
  avatar?: string;
  xp: number;
  solved: number;
  accuracy: number;
  city?: string;
  streak: number;
  isAnonymous?: boolean;
}

interface SubjectLeader {
  rank: number;
  subjectId: string;
  name: string;
  topUser: string;
  xp: number;
  participants: number;
}

interface CityLeader {
  rank: number;
  name: string;
  totalXP: number;
  users: number;
  topUser: string;
}

interface UserPosition {
  rank: number;
  xp: number;
  xpToday: number;
  percentile: number;
}

// =====================================================
// КОНФИГУРАЦИЯ ФИЛЬТРОВ
// =====================================================

const filters = [
  { id: 'global', name: 'Общий', icon: Trophy },
  { id: 'subject', name: 'По предметам', icon: Award },
  { id: 'city', name: 'По городам', icon: MapPin },
] as const;

// =====================================================
// API ФУНКЦИИ
// =====================================================

/**
 * Получить общий лидерборд с API
 * 
 * ССЫЛКА: GET /api/leaderboard/global?limit=10
 */
async function fetchGlobalLeaderboard(): Promise<LeaderboardUser[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/leaderboard?type=global&limit=10`);
    if (!response.ok) throw new Error('Failed to fetch leaderboard');
    const data = await response.json();
    return data.leaderboard ?? [];
  } catch (error) {
    console.error('Error fetching global leaderboard:', error);
    return [];
  }
}

/**
 * Получить лидерборд по предметам с API
 * 
 * ССЫЛКА: GET /api/leaderboard/subjects
 */
async function fetchSubjectLeaderboard(): Promise<SubjectLeader[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/leaderboard?type=subject&limit=10`);
    if (!response.ok) throw new Error('Failed to fetch subject leaderboard');
    const data = await response.json();
    return (data.leaderboard ?? []).map((entry: LeaderboardUser) => ({
      rank: entry.rank,
      subjectId: 'all',
      name: 'Все предметы',
      topUser: entry.name,
      xp: entry.xp,
      participants: entry.solved,
    }));
  } catch (error) {
    console.error('Error fetching subject leaderboard:', error);
    return [];
  }
}

/**
 * Получить лидерборд по городам с API
 * 
 * ССЫЛКА: GET /api/leaderboard/cities
 */
async function fetchCityLeaderboard(): Promise<CityLeader[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/leaderboard?type=city&limit=10`);
    if (!response.ok) throw new Error('Failed to fetch city leaderboard');
    const data = await response.json();
    return data.leaderboard ?? [];
  } catch (error) {
    console.error('Error fetching city leaderboard:', error);
    return [];
  }
}

/**
 * Получить позицию текущего пользователя
 *
 * ССЫЛКА: GET /api/leaderboard/me
 */
async function fetchUserPosition(): Promise<UserPosition | null> {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const response = await fetch(`${API_BASE_URL}/leaderboard/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

// =====================================================
// УТИЛИТЫ
// =====================================================

const getRankIcon = (rank: number) => {
  if (rank === 1) return <Trophy className="w-6 h-6 text-amber-500" />;
  if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
  if (rank === 3) return <Medal className="w-6 h-6 text-amber-700" />;
  return <span className="w-6 h-6 flex items-center justify-center font-bold text-muted-foreground">{rank}</span>;
};

const getRankStyle = (rank: number) => {
  if (rank === 1) return 'bg-gradient-to-r from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-900/10 border-amber-200';
  if (rank === 2) return 'bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800/30 dark:to-gray-800/10 border-gray-200';
  if (rank === 3) return 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/10 border-amber-200';
  return '';
};

// =====================================================
// КОМПОНЕНТ LeaderboardPage
// =====================================================

export function LeaderboardPage() {
  const { isAuthenticated } = useAppStore();
  
  // Состояние фильтра
  const [activeFilter, setActiveFilter] = useState<typeof filters[number]['id']>('global');
  
  // Данные лидербордов
  const [globalLeaderboard, setGlobalLeaderboard] = useState<LeaderboardUser[]>([]);
  const [subjectLeaderboard, setSubjectLeaderboard] = useState<SubjectLeader[]>([]);
  const [cityLeaderboard, setCityLeaderboard] = useState<CityLeader[]>([]);
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
  
  // Состояние загрузки
  const [isLoading, setIsLoading] = useState(true);

  // Загрузка данных при монтировании и смене фильтра
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      // Загружаем все данные параллельно
      const [
        global,
        subjects,
        cities,
        position
      ] = await Promise.all([
        fetchGlobalLeaderboard(),
        fetchSubjectLeaderboard(),
        fetchCityLeaderboard(),
        isAuthenticated ? fetchUserPosition() : Promise.resolve(null),
      ]);
      
      setGlobalLeaderboard(global);
      setSubjectLeaderboard(subjects);
      setCityLeaderboard(cities);
      setUserPosition(position);
      
      setIsLoading(false);
    };
    
    loadData();
  }, [isAuthenticated]);

  // ===================================================
  // РЕНДЕР
  // ===================================================

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/60 mb-4"
          >
            <Trophy className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold mb-2">Лидерборд</h1>
          <p className="text-muted-foreground">
            Соревнуйтесь с другими учениками и достигайте новых высот
          </p>
        </div>

        {/* Фильтры */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                activeFilter === filter.id
                  ? 'bg-primary text-white'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              <filter.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{filter.name}</span>
            </button>
          ))}
        </div>

        {/* Индикатор загрузки */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}

        {/* ================================================= */}
        {/* ОБЩИЙ ЛИДЕРБОРД                                 */}
        {/* ================================================= */}
        {activeFilter === 'global' && !isLoading && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Топ-10 учеников
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {globalLeaderboard.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Пока нет данных для отображения
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {globalLeaderboard.map((user, index) => (
                    <motion.div
                      key={user.userId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex items-center gap-4 p-4 ${getRankStyle(user.rank)}`}
                    >
                      {/* Место */}
                      <div className="w-10 flex justify-center">
                        {getRankIcon(user.rank)}
                      </div>

                      {/* Аватар */}
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {user.avatar || user.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>

                      {/* Информация о пользователе */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold truncate">
                            {user.isAnonymous ? 'Аноним' : user.name}
                          </h4>
                          {user.rank <= 3 && user.streak > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              <Flame className="w-3 h-3 mr-1 text-orange-500" />
                              {user.streak} дней
                            </Badge>
                          )}
                        </div>
                        {user.city && (
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {user.city}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Статистика */}
                      <div className="hidden sm:flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <p className="font-bold text-primary">{user.xp.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">XP</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold">{user.solved}</p>
                          <p className="text-xs text-muted-foreground">Решено</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-green-600">{user.accuracy}%</p>
                          <p className="text-xs text-muted-foreground">Точность</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ================================================= */}
        {/* ЛИДЕРБОРД ПО ПРЕДМЕТАМ                          */}
        {/* ================================================= */}
        {activeFilter === 'subject' && !isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjectLeaderboard.length === 0 ? (
              <div className="col-span-full p-8 text-center text-muted-foreground">
                Пока нет данных для отображения
              </div>
            ) : (
              subjectLeaderboard.map((subject, index) => (
                <motion.div
                  key={subject.subjectId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Award className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-semibold">{subject.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              <Users className="w-3 h-3 inline mr-1" />
                              {subject.participants.toLocaleString()} участников
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary">#{subject.rank}</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-border">
                        <div>
                          <p className="text-sm text-muted-foreground">Лидер</p>
                          <p className="font-medium">{subject.topUser}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Рекорд XP</p>
                          <p className="font-bold text-primary">{subject.xp.toLocaleString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* ================================================= */}
        {/* ЛИДЕРБОРД ПО ГОРОДАМ                            */}
        {/* ================================================= */}
        {activeFilter === 'city' && !isLoading && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Топ городов
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {cityLeaderboard.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Пока нет данных для отображения
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {cityLeaderboard.map((city, index) => (
                    <motion.div
                      key={city.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex items-center gap-4 p-4 ${getRankStyle(city.rank)}`}
                    >
                      <div className="w-10 flex justify-center">
                        {getRankIcon(city.rank)}
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="font-semibold">{city.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Лидер: {city.topUser}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <p className="font-bold text-primary">{city.totalXP.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Общий XP</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold">{city.users.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Учеников</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ================================================= */}
        {/* ПОЗИЦИЯ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ                   */}
        {/* ================================================= */}
        {isAuthenticated && userPosition && !isLoading && (
          <Card className="mt-8 border-primary/20 bg-primary/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                    {userPosition.rank}
                  </div>
                  <div>
                    <h4 className="font-semibold">Ваша позиция</h4>
                    <p className="text-sm text-muted-foreground">
                      Вы в топ-{userPosition.percentile}% учеников! Продолжайте в том же духе!
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    {userPosition.xp.toLocaleString()} XP
                  </p>
                  <p className="text-sm text-muted-foreground">
                    +{userPosition.xpToday} за сегодня
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ================================================= */}
        {/* ПРИЗЫВ К ДЕЙСТВИЮ (для неавторизованных)        */}
        {/* ================================================= */}
        {!isAuthenticated && !isLoading && (
          <Card className="mt-8 border-primary/20 bg-primary/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h4 className="font-semibold">Хотите попасть в топ?</h4>
                  <p className="text-sm text-muted-foreground">
                    Авторизуйтесь, чтобы участвовать в рейтинге и получать награды
                  </p>
                </div>
                <a
                  href="/register"
                  className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Зарегистрироваться
                </a>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Named export for lazy loading
export default LeaderboardPage;
