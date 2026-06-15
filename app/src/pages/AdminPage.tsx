import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield, Plus, Edit2, Trash2, Search, BookOpen, Users, BarChart3,
  CheckCircle, XCircle, FileText, Loader2, AlertCircle, Eye,
  TrendingUp, Award, Flag, FolderTree, Mail, ClipboardList, Trophy, History,
  Wallet, Gift, Newspaper, Megaphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/store/useAppStore';
import { subjects } from '@/data/subjects';
import { apiClient, API_BASE_URL } from '@/lib/api/client';
import { ImageUpload } from '@/components/admin/ImageUpload';
import { AdminContentManager } from '@/components/admin/AdminContentManager';
import { PageHeader } from '@/components/PageHeader';
import { ExamBuilder } from '@/components/admin/ExamBuilder';
import { OlympiadManager } from '@/components/admin/OlympiadManager';
import { AuditLogViewer } from '@/components/admin/AuditLogViewer';
import { ReferralManager } from '@/components/admin/ReferralManager';
import { FinanceDashboard } from '@/components/admin/FinanceDashboard';
import { NewsManager } from '@/components/admin/NewsManager';
import { BannerManager } from '@/components/admin/BannerManager';
import type { Question } from '@/types';

interface AdminStats {
  totalUsers: number; totalQuestions: number; totalSolved: number;
  pendingReview: number; newUsersToday: number; activeUsers: number;
}

interface PendingQuestion {
  id: string; content: string; subject: string; author: string; date: string; status: string;
}

interface AdminUser {
  id: string; email: string; name?: string; role: string; plan: string;
  city?: string; school?: string; xp: number; level: number;
  streakDays: number; createdAt: string; solvedCount: number; examCount: number;
}

interface ReportRow {
  id: string;
  reason: string;
  description?: string;
  status: string;
  createdAt: string;
  user: { id: string; email: string; name?: string };
  question: {
    id: string; externalId?: string; content: string;
    subjectName: string; subjectSlug: string; topicName?: string;
  } | null;
}

interface Analytics {
  users: { total: number; premium: number; free: number; newToday: number; newWeek: number; newMonth: number; activeWeek: number };
  questions: { total: number; totalSolved: number; solvedToday: number; solvedWeek: number; accuracy?: number };
  exams: { total: number; today: number; entities?: number };
  reports: { total: number; pending: number; top: Array<{ questionId: string; count: number; content: string; externalId: string }> };
  content?: { theory: number; olympiadProblems: number; olympiadTheory: number; contactNew: number };
  olympiad?: { attempts: number; solved: number; participants: number };
  topSubjects?: Array<{ subjectId: string; name: string; color: string | null; questions: number; solved: number }>;
  activity: Array<{ date: string; solved: number; users: number; registrations?: number }>;
}

interface ContactMessageRow {
  id: string; name: string; email: string; subject: string; message: string;
  status: string; createdAt: string; userId?: string | null;
}

const SUBJECT_LABELS: Record<string, string> = {
  bug: 'Ошибка в задании', technical: 'Техническая проблема', suggestion: 'Предложение',
  premium: 'Вопрос по Premium', 'data-request': 'Запрос персональных данных', other: 'Другое',
};

interface NewQuestionForm {
  subjectId: string; topicId: string; type: 'SINGLE_CHOICE' | 'TEXT_INPUT';
  difficulty: number; part: 'A' | 'B'; section: string;
  content: string; options: { id: string; text: string }[];
  correctAnswer: string; explanation: string;
  imageUrl?: string;
}

export function AdminPage() {
  const navigate = useNavigate();
  const { user, token } = useAppStore();

  // MODERATOR видит только модерацию: «На проверке», «Жалобы», «Сообщения», «Журнал».
  const isModerator = user?.role === 'MODERATOR';
  const [activeTab, setActiveTab] = useState(user?.role === 'MODERATOR' ? 'pending' : 'questions');
  const [messages, setMessages] = useState<ContactMessageRow[]>([]);
  const [msgFilter, setMsgFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedPartFilter, setSelectedPartFilter] = useState<string>('all');
  const [selectedDifficultyFilter, setSelectedDifficultyFilter] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [pendingQuestions, setPendingQuestions] = useState<PendingQuestion[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userPlanFilter, setUserPlanFilter] = useState<string>('all');
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [reportStatusFilter, setReportStatusFilter] = useState<string>('PENDING');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const emptyForm: NewQuestionForm = {
    subjectId: subjects[0]?.id ?? '',
    topicId: '', type: 'SINGLE_CHOICE', difficulty: 2,
    part: 'A', section: '',
    content: '',
    options: [
      { id: 'A', text: '' }, { id: 'B', text: '' },
      { id: 'C', text: '' }, { id: 'D', text: '' },
      { id: 'E', text: '' },
    ],
    correctAnswer: 'A', explanation: '',
    imageUrl: '',
  };
  const [newQuestion, setNewQuestion] = useState<NewQuestionForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Массовые операции над заданиями
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDifficulty, setBulkDifficulty] = useState('');
  const [bulkPart, setBulkPart] = useState('');
  const [bulkSubject, setBulkSubject] = useState('');

  // Real subject/topic/subtopic for dropdowns (from API)
  const [apiSubjects, setApiSubjects] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [formTopics, setFormTopics] = useState<Array<{ id: string; name: string }>>([]);
  const [formSubtopics, setFormSubtopics] = useState<Array<{ id: string; name: string }>>([]);
  const [formSelectedSubjectId, setFormSelectedSubjectId] = useState<string>('');
  const [formSelectedTopicId, setFormSelectedTopicId] = useState<string>('');
  const [formSelectedSubtopicId, setFormSelectedSubtopicId] = useState<string>('');

  // Load API subjects on mount
  useEffect(() => {
    void apiClient('/subjects').then(res => {
      if (res.data) {
        const items = (res.data as { subjects: Array<{ id: string; name: string; slug: string }> }).subjects ?? [];
        setApiSubjects(items.map(s => ({ id: s.id, name: s.name, slug: s.slug })));
      }
    });
  }, []);

  // Load topics when subject chosen
  useEffect(() => {
    if (!formSelectedSubjectId) { setFormTopics([]); setFormSelectedTopicId(''); return; }
    void apiClient(`/subjects/${formSelectedSubjectId}/topics`).then(res => {
      if (res.data) {
        const t = (res.data as Array<{ id: string; name: string }>) ?? [];
        setFormTopics(t.map(x => ({ id: x.id, name: x.name })));
      }
    });
    setFormSelectedTopicId('');
    setFormSelectedSubtopicId('');
  }, [formSelectedSubjectId]);

  // Load subtopics when topic chosen
  useEffect(() => {
    if (!formSelectedTopicId) { setFormSubtopics([]); setFormSelectedSubtopicId(''); return; }
    void apiClient(`/topics/${formSelectedTopicId}/subtopics`).then(res => {
      if (res.data) {
        const s = (res.data as Array<{ id: string; name: string }>) ?? [];
        setFormSubtopics(s.map(x => ({ id: x.id, name: x.name })));
      }
    });
  }, [formSelectedTopicId]);

  const loadData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true); setError(null);
    try {
      // Модератору список заданий не нужен (и не разрешён) — только статистика и модерация.
      const [statsRes, qRes, pendRes] = await Promise.all([
        apiClient('/admin/stats', { token }),
        isModerator ? Promise.resolve(null) : apiClient('/questions?limit=500', { token }),
        apiClient('/admin/pending', { token }),
      ]);
      if (statsRes.data) setStats(statsRes.data as AdminStats);
      if (qRes?.data) {
        const d = qRes.data as { questions: Question[] };
        setQuestions(d.questions ?? []);
      }
      if (pendRes.data) setPendingQuestions(pendRes.data as PendingQuestion[]);
    } catch {
      setError('Ошибка загрузки данных');
    } finally {
      setIsLoading(false);
    }
  }, [token, isModerator]);

  const loadUsers = useCallback(async () => {
    if (!token) return;
    const res = await apiClient(`/admin/users?search=${encodeURIComponent(userSearch)}&plan=${userPlanFilter}&limit=50`, { token });
    if (res.data) setUsers((res.data as { users: AdminUser[] }).users ?? []);
  }, [token, userSearch, userPlanFilter]);

  const loadAnalytics = useCallback(async () => {
    if (!token) return;
    const res = await apiClient('/admin/analytics', { token });
    if (res.data) setAnalytics(res.data as Analytics);
  }, [token]);

  const loadReports = useCallback(async () => {
    if (!token) return;
    const res = await apiClient(`/admin/reports?status=${reportStatusFilter}`, { token });
    if (res.data) setReports((res.data as { reports: ReportRow[] }).reports ?? []);
  }, [token, reportStatusFilter]);

  const handleResolveReport = async (id: string, action: 'resolve' | 'reject') => {
    if (!token) return;
    await fetch(`${API_BASE_URL}/admin/reports/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action }),
    });
    setReports(reports.filter(r => r.id !== id));
  };

  const handleDeleteReport = async (id: string) => {
    if (!token) return;
    if (!confirm('Удалить жалобу из истории?')) return;
    await fetch(`${API_BASE_URL}/admin/reports/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setReports(reports.filter(r => r.id !== id));
  };

  const loadMessages = useCallback(async () => {
    if (!token) return;
    const res = await apiClient(`/admin/contact${msgFilter ? `?status=${msgFilter}` : ''}`, { token });
    if (res.data) setMessages((res.data as { messages: ContactMessageRow[] }).messages ?? []);
  }, [token, msgFilter]);

  const setMessageStatus = async (id: string, status: string) => {
    if (!token) return;
    await fetch(`${API_BASE_URL}/admin/contact/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    setMessages(prev => prev.map(m => m.id === id ? { ...m, status } : m));
  };

  const deleteMessage = async (id: string) => {
    if (!token) return;
    if (!confirm('Удалить сообщение?')) return;
    await fetch(`${API_BASE_URL}/admin/contact/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  useEffect(() => {
    void loadData();
    if (!isModerator) void loadAnalytics();
  }, [loadData, loadAnalytics, isModerator]);
  useEffect(() => {
    if (activeTab === 'users') void loadUsers();
    if (activeTab === 'stats') void loadAnalytics();
    if (activeTab === 'reports') void loadReports();
    if (activeTab === 'messages') void loadMessages();
  }, [activeTab, loadUsers, loadAnalytics, loadReports, loadMessages]);

  if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center max-w-sm">
          <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Доступ запрещён</h1>
          <p className="text-muted-foreground mb-4">У вас нет прав администратора</p>
          <Button onClick={() => navigate('/')}>На главную</Button>
        </Card>
      </div>
    );
  }

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = !searchQuery ||
      q.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.externalId ?? '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || q.subjectId === selectedSubject;
    const matchesPart = selectedPartFilter === 'all' || q.part === selectedPartFilter;
    const matchesDifficulty = selectedDifficultyFilter === 'all' || q.difficulty === parseInt(selectedDifficultyFilter);
    return matchesSearch && matchesSubject && matchesPart && matchesDifficulty;
  });

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Удалить это задание?')) return;
    try {
      const r = await fetch(`${API_BASE_URL}/questions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) setQuestions(questions.filter(q => q.id !== id));
    } catch {/*ignore*/}
  };

  const toggleQuestionSelected = (id: string) => {
    setSelectedQuestionIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const visibleQuestions = filteredQuestions.slice(0, 50);
  const allVisibleSelected = visibleQuestions.length > 0 && visibleQuestions.every(q => selectedQuestionIds.has(q.id));
  const toggleAllVisible = () => {
    setSelectedQuestionIds(prev => {
      const next = new Set(prev);
      if (allVisibleSelected) visibleQuestions.forEach(q => next.delete(q.id));
      else visibleQuestions.forEach(q => next.add(q.id));
      return next;
    });
  };

  const runQuestionsBulk = async (op: 'delete' | 'update', data?: Record<string, unknown>) => {
    if (selectedQuestionIds.size === 0 || bulkBusy) return;
    setBulkBusy(true);
    try {
      const r = await fetch(`${API_BASE_URL}/admin/questions/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids: Array.from(selectedQuestionIds), op, data }),
      });
      if (r.ok) {
        setSelectedQuestionIds(new Set());
        setBulkDifficulty(''); setBulkPart(''); setBulkSubject('');
        void loadData();
      } else {
        const body = await r.json().catch(() => null);
        alert(body?.error ?? 'Ошибка массовой операции');
      }
    } catch {/*ignore*/}
    setBulkBusy(false);
  };

  const handleModerate = async (id: string, action: 'approve' | 'reject') => {
    try {
      const r = await fetch(`${API_BASE_URL}/admin/pending/${id}?action=${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) setPendingQuestions(pendingQuestions.filter(q => q.id !== id));
    } catch {/*ignore*/}
  };

  const openCreateQuestion = () => {
    setEditingId(null);
    setNewQuestion(emptyForm);
    setFormSelectedSubjectId(''); setFormSelectedTopicId(''); setFormSelectedSubtopicId('');
    setShowAddDialog(true);
  };

  const openEditQuestion = (q: Question) => {
    setEditingId(q.id);
    setNewQuestion({
      subjectId: q.subjectId,
      topicId: q.topicId ?? '',
      type: (q.type as 'SINGLE_CHOICE' | 'TEXT_INPUT') ?? 'SINGLE_CHOICE',
      difficulty: q.difficulty ?? 1,
      part: (q.part as 'A' | 'B') ?? 'A',
      section: q.section ?? '',
      content: q.content,
      options: q.options && q.options.length ? q.options.map((o) => ({ id: o.id, text: o.text })) : emptyForm.options,
      correctAnswer: Array.isArray(q.correctAnswer) ? (q.correctAnswer[0] ?? '') : q.correctAnswer,
      explanation: q.explanation,
      imageUrl: q.imageUrl ?? '',
    });
    setFormSelectedSubjectId(q.subjectId);
    setFormSelectedTopicId(q.topicId ?? '');
    setFormSelectedSubtopicId(q.subtopicId ?? '');
    setShowAddDialog(true);
  };

  const handleCreateQuestion = async () => {
    if (!newQuestion.content.trim() || !newQuestion.explanation.trim()) return;
    if (!formSelectedSubjectId) return;
    setIsSaving(true);
    try {
      const base = {
        ...newQuestion,
        subjectId: formSelectedSubjectId,
        topicId: formSelectedTopicId || undefined,
        subtopicId: formSelectedSubtopicId || undefined,
      };
      // On create send tags:[] (backend default); on edit omit tags so existing ones aren't wiped.
      const payload = editingId ? base : { ...base, tags: [] };
      const r = await fetch(`${API_BASE_URL}/questions${editingId ? `/${editingId}` : ''}`, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        setShowAddDialog(false);
        setNewQuestion(emptyForm);
        setEditingId(null);
        setFormSelectedSubjectId(''); setFormSelectedTopicId(''); setFormSelectedSubtopicId('');
        void loadData();
      } else {
        const data = await r.json();
        alert(data.error ?? 'Ошибка сохранения');
      }
    } catch {/*ignore*/}
    setIsSaving(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <PageHeader
          icon={Shield}
          title="Админ-панель"
          subtitle="Управление контентом, пользователями и сообщениями платформы."
          accent="from-slate-700 to-slate-900"
          actions={
            <Badge variant="secondary" className="gap-1">
              <CheckCircle className="w-3 h-3" />{isModerator ? 'Модератор' : 'Администратор'}
            </Badge>
          }
        />

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Quick stats */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {[
              { icon: Users, value: stats.totalUsers.toLocaleString(), label: 'Пользователей' },
              { icon: BookOpen, value: stats.totalQuestions.toLocaleString(), label: 'Заданий' },
              { icon: CheckCircle, value: stats.totalSolved.toLocaleString(), label: 'Решений' },
              { icon: FileText, value: stats.pendingReview, label: 'На проверке', color: 'text-amber-500' },
              { icon: Users, value: stats.newUsersToday, label: 'Новых сегодня', color: 'text-green-500' },
              { icon: BarChart3, value: stats.activeUsers, label: 'Активных', color: 'text-blue-500' },
            ].map(({ icon: Icon, value, label, color }) => (
              <Card key={label}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-muted ${color ?? 'text-primary'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 h-auto flex-wrap justify-start gap-1">
            {!isModerator && (
              <>
                <TabsTrigger value="content" className="gap-2"><FolderTree className="w-4 h-4" />Контент</TabsTrigger>
                <TabsTrigger value="exams" className="gap-2"><ClipboardList className="w-4 h-4" />Экзамены</TabsTrigger>
                <TabsTrigger value="questions" className="gap-2"><BookOpen className="w-4 h-4" />Задания</TabsTrigger>
                <TabsTrigger value="olympiad" className="gap-2"><Trophy className="w-4 h-4" />Олимпиада</TabsTrigger>
              </>
            )}
            <TabsTrigger value="pending" className="gap-2">
              <FileText className="w-4 h-4" />На проверке
              {pendingQuestions.length > 0 && <Badge variant="destructive" className="text-xs">{pendingQuestions.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2">
              <Flag className="w-4 h-4" />Жалобы
              {analytics && analytics.reports.pending > 0 && (
                <Badge variant="destructive" className="text-xs">{analytics.reports.pending}</Badge>
              )}
            </TabsTrigger>
            {!isModerator && (
              <>
                <TabsTrigger value="users" className="gap-2"><Users className="w-4 h-4" />Пользователи</TabsTrigger>
                <TabsTrigger value="stats" className="gap-2"><BarChart3 className="w-4 h-4" />Аналитика</TabsTrigger>
                <TabsTrigger value="finance" className="gap-2"><Wallet className="w-4 h-4" />Финансы</TabsTrigger>
                <TabsTrigger value="referrals" className="gap-2"><Gift className="w-4 h-4" />Рефералы</TabsTrigger>
                <TabsTrigger value="news" className="gap-2"><Newspaper className="w-4 h-4" />Новости</TabsTrigger>
                <TabsTrigger value="banners" className="gap-2"><Megaphone className="w-4 h-4" />Баннеры</TabsTrigger>
              </>
            )}
            <TabsTrigger value="messages" className="gap-2"><Mail className="w-4 h-4" />Сообщения</TabsTrigger>
            <TabsTrigger value="audit" className="gap-2"><History className="w-4 h-4" />Журнал</TabsTrigger>
          </TabsList>

          {/* Content management — subjects / topics / subtopics / theory / exams CRUD */}
          <TabsContent value="content">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FolderTree className="w-5 h-5" />Управление контентом</CardTitle>
              </CardHeader>
              <CardContent>
                <AdminContentManager token={token} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Exam builder — ручная сборка пробных экзаменов */}
          <TabsContent value="exams">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ClipboardList className="w-5 h-5" />Конструктор экзаменов</CardTitle>
              </CardHeader>
              <CardContent>
                <ExamBuilder token={token} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Olympiad — задачи и теория повышенного уровня */}
          <TabsContent value="olympiad">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Trophy className="w-5 h-5" />Олимпиадная подготовка</CardTitle>
              </CardHeader>
              <CardContent>
                <OlympiadManager token={token} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Questions tab */}
          <TabsContent value="questions">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <CardTitle>Управление заданиями</CardTitle>
                  <Button onClick={openCreateQuestion}>
                    <Plus className="w-4 h-4 mr-2" />Добавить задание
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text" placeholder="Поиск заданий..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border bg-background"
                      />
                    </div>
                  </div>
                  <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="px-4 py-2 rounded-lg border bg-background text-sm">
                    <option value="all">Все предметы</option>
                    {apiSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <select value={selectedPartFilter} onChange={e => setSelectedPartFilter(e.target.value)} className="px-4 py-2 rounded-lg border bg-background text-sm">
                    <option value="all">Все части</option>
                    <option value="A">Часть А</option>
                    <option value="B">Часть Б</option>
                  </select>
                  <select value={selectedDifficultyFilter} onChange={e => setSelectedDifficultyFilter(e.target.value)} className="px-4 py-2 rounded-lg border bg-background text-sm">
                    <option value="all">Все уровни</option>
                    <option value="1">Уровень I</option>
                    <option value="2">Уровень II</option>
                    <option value="3">Уровень III</option>
                    <option value="4">Уровень IV</option>
                    <option value="5">Уровень V</option>
                  </select>
                </div>

                {/* Панель массовых операций */}
                {selectedQuestionIds.size > 0 && (
                  <div className="sticky top-16 z-20 mb-4 rounded-xl border border-primary/30 bg-primary/5 backdrop-blur-sm p-3 flex flex-wrap items-center gap-2">
                    <Badge className="text-xs">{selectedQuestionIds.size} выбрано</Badge>
                    <select value={bulkDifficulty} onChange={e => setBulkDifficulty(e.target.value)} disabled={bulkBusy}
                      className="h-9 rounded-lg border border-input bg-background px-2 text-sm">
                      <option value="">Сложность…</option>
                      {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>Уровень {n}</option>)}
                    </select>
                    {bulkDifficulty && (
                      <Button size="sm" variant="secondary" disabled={bulkBusy}
                        onClick={() => void runQuestionsBulk('update', { difficulty: Number(bulkDifficulty) })}>
                        Применить
                      </Button>
                    )}
                    <select value={bulkPart} onChange={e => setBulkPart(e.target.value)} disabled={bulkBusy}
                      className="h-9 rounded-lg border border-input bg-background px-2 text-sm">
                      <option value="">Часть…</option>
                      <option value="A">Часть А</option>
                      <option value="B">Часть Б</option>
                    </select>
                    {bulkPart && (
                      <Button size="sm" variant="secondary" disabled={bulkBusy}
                        onClick={() => void runQuestionsBulk('update', { part: bulkPart })}>
                        Применить
                      </Button>
                    )}
                    <select value={bulkSubject} onChange={e => setBulkSubject(e.target.value)} disabled={bulkBusy}
                      className="h-9 rounded-lg border border-input bg-background px-2 text-sm">
                      <option value="">Переместить в…</option>
                      {apiSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    {bulkSubject && (
                      <Button size="sm" variant="secondary" disabled={bulkBusy}
                        onClick={() => void runQuestionsBulk('update', { subjectId: bulkSubject })}>
                        Переместить
                      </Button>
                    )}
                    <div className="ml-auto flex items-center gap-2">
                      <Button size="sm" variant="outline" disabled={bulkBusy}
                        onClick={() => void runQuestionsBulk('update', { status: 'HIDDEN' })}>
                        Скрыть
                      </Button>
                      <Button size="sm" variant="destructive" disabled={bulkBusy} onClick={() => setBulkDeleteOpen(true)}>
                        <Trash2 className="w-3.5 h-3.5 mr-1" />Удалить
                      </Button>
                      <Button size="sm" variant="ghost" disabled={bulkBusy} onClick={() => setSelectedQuestionIds(new Set())}>
                        Отмена
                      </Button>
                    </div>
                  </div>
                )}

                {isLoading ? (
                  <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
                ) : filteredQuestions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Задания не найдены под фильтры</div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-3">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                        <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible}
                          className="w-4 h-4 rounded border-input accent-primary" />
                        Выбрать видимые
                      </label>
                      <span className="text-xs text-muted-foreground">
                        Показано {filteredQuestions.length} из {questions.length} заданий
                      </span>
                    </div>
                    <div className="divide-y divide-border">
                      {visibleQuestions.map((question, i) => (
                        <motion.div key={question.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                          className={`flex items-center justify-between py-3 ${selectedQuestionIds.has(question.id) ? 'bg-primary/5 -mx-2 px-2 rounded-lg' : ''}`}>
                          <input
                            type="checkbox"
                            checked={selectedQuestionIds.has(question.id)}
                            onChange={() => toggleQuestionSelected(question.id)}
                            className="w-4 h-4 mr-3 shrink-0 rounded border-input accent-primary"
                            aria-label="Выбрать задание"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge variant="outline" className="text-xs">#{question.externalId ?? question.id.slice(-6)}</Badge>
                              <Badge className="text-xs">{apiSubjects.find(s => s.id === question.subjectId)?.name ?? subjects.find(s => s.id === question.subjectId)?.name ?? '?'}</Badge>
                              {question.part && <Badge variant="secondary" className="text-xs">Часть {question.part}</Badge>}
                              <Badge variant="secondary" className="text-xs">Ур. {question.difficulty}</Badge>
                              {question.section && <span className="text-xs text-muted-foreground truncate max-w-[200px]">{question.section}</span>}
                            </div>
                            <p className="text-sm truncate text-muted-foreground">{question.content.substring(0, 120)}...</p>
                          </div>
                          <div className="flex items-center gap-1 ml-4">
                            <Button variant="ghost" size="icon" onClick={() => navigate(`/practice/${apiSubjects.find(s => s.id === question.subjectId)?.slug ?? question.subjectId}?question=${question.id}`)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openEditQuestion(question)} title="Редактировать">
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteQuestion(question.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    {filteredQuestions.length > 50 && (
                      <div className="text-xs text-muted-foreground text-center mt-3">
                        Показаны первые 50. Уточните фильтры для других.
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pending tab */}
          <TabsContent value="pending">
            <Card>
              <CardHeader><CardTitle>Задания на модерации</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
                ) : pendingQuestions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    Нет заданий на проверке
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {pendingQuestions.map((q) => (
                      <div key={q.id} className="flex items-center justify-between py-4">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{q.content.substring(0, 100)}...</p>
                          <p className="text-xs text-muted-foreground">{q.subject} · {q.author} · {q.date && new Date(q.date).toLocaleDateString('ru-RU')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleModerate(q.id, 'reject')}>
                            <XCircle className="w-4 h-4 mr-1" />Отклонить
                          </Button>
                          <Button size="sm" onClick={() => handleModerate(q.id, 'approve')}>
                            <CheckCircle className="w-4 h-4 mr-1" />Одобрить
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports tab */}
          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className="flex items-center gap-2">
                    <Flag className="w-5 h-5" />Жалобы на задания
                  </CardTitle>
                  <div className="flex gap-1">
                    {['PENDING', 'RESOLVED', 'REJECTED', 'all'].map(s => (
                      <Button
                        key={s}
                        size="sm"
                        variant={reportStatusFilter === s ? 'default' : 'outline'}
                        onClick={() => setReportStatusFilter(s)}
                      >
                        {s === 'PENDING' ? 'Ожидают' : s === 'RESOLVED' ? 'Решено' : s === 'REJECTED' ? 'Отклонено' : 'Все'}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {reports.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Flag className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    {reportStatusFilter === 'PENDING' ? 'Нет ожидающих жалоб' : 'Нет жалоб в этом статусе'}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reports.map(r => {
                      const reasonLabel: Record<string, string> = {
                        ERROR: '❌ Ошибка в условии/ответе',
                        UNCLEAR: '❓ Непонятная формулировка',
                        INAPPROPRIATE: '🚫 Неподходящий контент',
                        DUPLICATE: '📋 Дубликат',
                        OTHER: '📝 Другое',
                      };
                      return (
                        <Card key={r.id} className="border-l-4 border-l-amber-400">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <Badge variant="outline" className="text-xs">{reasonLabel[r.reason] ?? r.reason}</Badge>
                                  {r.question && (
                                    <Badge className="text-xs">{r.question.subjectName}</Badge>
                                  )}
                                  {r.question?.topicName && (
                                    <Badge variant="secondary" className="text-xs">{r.question.topicName}</Badge>
                                  )}
                                  <Badge variant="outline" className="text-xs">
                                    {new Date(r.createdAt).toLocaleDateString('ru-RU')}
                                  </Badge>
                                </div>

                                {r.question ? (
                                  <p className="text-sm font-medium mb-2 line-clamp-2">{r.question.content}...</p>
                                ) : (
                                  <p className="text-sm text-muted-foreground italic mb-2">Задание удалено</p>
                                )}

                                {r.description && (
                                  <div className="bg-muted/40 rounded-lg p-2 mb-2 text-sm">
                                    <span className="text-xs text-muted-foreground">Комментарий: </span>
                                    {r.description}
                                  </div>
                                )}

                                <p className="text-xs text-muted-foreground">
                                  от {r.user.name ?? r.user.email}
                                </p>
                              </div>

                              <div className="flex flex-col gap-1.5 shrink-0 min-w-[180px]">
                                {r.question && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="justify-start"
                                    onClick={() => navigate(`/practice/${r.question!.subjectSlug}?question=${r.question!.id}`)}
                                  >
                                    <Eye className="w-3 h-3 mr-1.5" />Перейти к заданию
                                  </Button>
                                )}
                                {r.question && !isModerator && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="justify-start"
                                    onClick={async () => {
                                      const qRes = await apiClient(`/questions/${r.question!.id}`);
                                      if (qRes.data) openEditQuestion(qRes.data as Question);
                                      else alert('Не удалось загрузить задание');
                                    }}
                                  >
                                    <Edit2 className="w-3 h-3 mr-1.5" />Исправить задание
                                  </Button>
                                )}
                                {r.question && !isModerator && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="justify-start text-destructive hover:text-destructive"
                                    onClick={() => {
                                      if (confirm('Удалить задание целиком?')) {
                                        handleDeleteQuestion(r.question!.id);
                                        handleResolveReport(r.id, 'resolve');
                                      }
                                    }}
                                  >
                                    <Trash2 className="w-3 h-3 mr-1.5" />Удалить задание
                                  </Button>
                                )}
                                {r.status === 'PENDING' && (
                                  <>
                                    <Button
                                      size="sm"
                                      className="justify-start"
                                      onClick={() => handleResolveReport(r.id, 'resolve')}
                                    >
                                      <CheckCircle className="w-3 h-3 mr-1.5" />Отметить решённым
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="justify-start"
                                      onClick={() => handleResolveReport(r.id, 'reject')}
                                    >
                                      <XCircle className="w-3 h-3 mr-1.5" />Отклонить
                                    </Button>
                                  </>
                                )}
                                {r.status !== 'PENDING' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="justify-start text-destructive"
                                    onClick={() => handleDeleteReport(r.id)}
                                  >
                                    <Trash2 className="w-3 h-3 mr-1.5" />Удалить запись
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Пользователи</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3 mb-4">
                  <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text" placeholder="Поиск по email или имени..."
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-lg border bg-background"
                    />
                  </div>
                  <select value={userPlanFilter} onChange={e => setUserPlanFilter(e.target.value)} className="px-4 py-2 rounded-lg border bg-background">
                    <option value="all">Все планы</option>
                    <option value="FREE">Free</option>
                    <option value="PREMIUM_MONTHLY">Premium (мес)</option>
                    <option value="PREMIUM_YEARLY">Premium (год)</option>
                  </select>
                </div>

                {users.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Нет пользователей</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                          <th className="text-left p-2">Пользователь</th>
                          <th className="text-left p-2">Роль</th>
                          <th className="text-left p-2">План</th>
                          <th className="text-left p-2">Уровень</th>
                          <th className="text-left p-2">Решено</th>
                          <th className="text-left p-2">Серия</th>
                          <th className="text-left p-2">Регистрация</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(u => (
                          <tr key={u.id} className="border-b hover:bg-muted/40">
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                                  {(u.name ?? u.email).charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium truncate">{u.name ?? '—'}</p>
                                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-2">
                              {u.id === user.id ? (
                                <Badge variant="secondary" className="text-xs">{u.role}</Badge>
                              ) : (
                                <select
                                  value={u.role}
                                  onChange={async (e) => {
                                    const role = e.target.value;
                                    const r = await fetch(`${API_BASE_URL}/admin/users/${u.id}`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                      body: JSON.stringify({ role }),
                                    });
                                    if (r.ok) setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role } : x));
                                    else alert((await r.json().catch(() => null))?.error ?? 'Не удалось изменить роль');
                                  }}
                                  className="h-8 rounded-lg border border-input bg-background px-2 text-xs"
                                >
                                  <option value="USER">USER</option>
                                  <option value="MODERATOR">MODERATOR</option>
                                  <option value="ADMIN">ADMIN</option>
                                </select>
                              )}
                            </td>
                            <td className="p-2">
                              <select
                                value={u.plan}
                                onChange={async (e) => {
                                  const plan = e.target.value;
                                  const r = await fetch(`${API_BASE_URL}/admin/users/${u.id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                    body: JSON.stringify({ plan }),
                                  });
                                  if (r.ok) setUsers(prev => prev.map(x => x.id === u.id ? { ...x, plan } : x));
                                  else alert((await r.json().catch(() => null))?.error ?? 'Не удалось изменить план');
                                }}
                                className={`h-8 rounded-lg border border-input px-2 text-xs ${u.plan !== 'FREE' ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 font-medium' : 'bg-background'}`}
                                title="Выдать / снять Premium"
                              >
                                <option value="FREE">Free</option>
                                <option value="PREMIUM_MONTHLY">Premium (месяц)</option>
                                <option value="PREMIUM_YEARLY">Premium (год)</option>
                              </select>
                            </td>
                            <td className="p-2">Lv.{u.level} ({u.xp} XP)</td>
                            <td className="p-2">{u.solvedCount}</td>
                            <td className="p-2">{u.streakDays}🔥</td>
                            <td className="p-2 text-muted-foreground">{new Date(u.createdAt).toLocaleDateString('ru-RU')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics tab */}
          <TabsContent value="stats">
            {!analytics ? (
              <div className="space-y-4">
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4" />Пользователи</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold mb-2">{analytics.users.total.toLocaleString()}</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Premium</span><span className="font-medium text-amber-600">{analytics.users.premium}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Free</span><span className="font-medium">{analytics.users.free}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">+ сегодня</span><span className="font-medium text-green-600">+{analytics.users.newToday}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">+ за неделю</span><span className="font-medium text-green-600">+{analytics.users.newWeek}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Активных (нед.)</span><span className="font-medium">{analytics.users.activeWeek}</span></div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2"><BookOpen className="w-4 h-4" />Задания</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold mb-2">{analytics.questions.totalSolved.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mb-2">всего решений</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Сегодня</span><span className="font-medium text-green-600">+{analytics.questions.solvedToday}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">За неделю</span><span className="font-medium">{analytics.questions.solvedWeek}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Активных заданий</span><span className="font-medium">{analytics.questions.total}</span></div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2"><Award className="w-4 h-4" />Экзамены</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold mb-2">{analytics.exams.total.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mb-2">пройдено</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Сегодня</span><span className="font-medium text-green-600">+{analytics.exams.today}</span></div>
                        {analytics.exams.entities !== undefined && (
                          <div className="flex justify-between"><span className="text-muted-foreground">Активных экзаменов</span><span className="font-medium">{analytics.exams.entities}</span></div>
                        )}
                        {analytics.questions.accuracy !== undefined && (
                          <div className="flex justify-between"><span className="text-muted-foreground">Точность платформы</span><span className="font-medium text-green-600">{analytics.questions.accuracy}%</span></div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Контент и олимпиада */}
                {(analytics.content || analytics.olympiad) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analytics.content && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2"><FolderTree className="w-4 h-4" />Контент</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                            <div className="flex justify-between"><span className="text-muted-foreground">Статей теории</span><span className="font-medium">{analytics.content.theory}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Олимп. задач</span><span className="font-medium">{analytics.content.olympiadProblems}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Теория PRO</span><span className="font-medium">{analytics.content.olympiadTheory}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Новых сообщений</span><span className={`font-medium ${analytics.content.contactNew > 0 ? 'text-amber-600' : ''}`}>{analytics.content.contactNew}</span></div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    {analytics.olympiad && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2"><Trophy className="w-4 h-4" />Олимпиадный раздел</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                            <div className="flex justify-between"><span className="text-muted-foreground">Попыток</span><span className="font-medium">{analytics.olympiad.attempts}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Решено</span><span className="font-medium text-green-600">{analytics.olympiad.solved}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Участников</span><span className="font-medium">{analytics.olympiad.participants}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Решаемость</span><span className="font-medium">{analytics.olympiad.attempts > 0 ? Math.round((analytics.olympiad.solved / analytics.olympiad.attempts) * 100) : 0}%</span></div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {/* Activity chart — решения за 14 дней */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4" />Решения за {analytics.activity.length} дней</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`grid gap-1.5 items-end h-32 ${analytics.activity.length > 7 ? 'grid-cols-14' : 'grid-cols-7'}`} style={{ gridTemplateColumns: `repeat(${analytics.activity.length}, minmax(0, 1fr))` }}>
                      {analytics.activity.map((d, i) => {
                        const maxSolved = Math.max(...analytics.activity.map(a => a.solved), 1);
                        const h = (d.solved / maxSolved) * 100;
                        return (
                          <div key={i} className="text-center flex flex-col items-center gap-1 h-full justify-end" title={`${d.date}: ${d.solved} решений, ${d.users} активных`}>
                            <span className="text-[10px] font-medium tabular-nums">{d.solved}</span>
                            <div className="w-full bg-primary rounded-t" style={{ height: `${Math.max(h, 3)}%` }} />
                            <span className="text-[10px] text-muted-foreground">{new Date(d.date).getDate()}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Регистрации за период */}
                {analytics.activity.some(d => d.registrations !== undefined) && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4" />Регистрации по дням</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-1.5 items-end h-24" style={{ gridTemplateColumns: `repeat(${analytics.activity.length}, minmax(0, 1fr))` }}>
                        {analytics.activity.map((d, i) => {
                          const maxReg = Math.max(...analytics.activity.map(a => a.registrations ?? 0), 1);
                          const h = ((d.registrations ?? 0) / maxReg) * 100;
                          return (
                            <div key={i} className="text-center flex flex-col items-center gap-1 h-full justify-end" title={`${d.date}: +${d.registrations ?? 0}`}>
                              <span className="text-[10px] font-medium tabular-nums">{d.registrations ?? 0}</span>
                              <div className="w-full bg-emerald-500 rounded-t" style={{ height: `${Math.max(h, 3)}%` }} />
                              <span className="text-[10px] text-muted-foreground">{new Date(d.date).getDate()}</span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Топ предметов по решениям */}
                {analytics.topSubjects && analytics.topSubjects.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4" />Популярность предметов</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2.5">
                      {analytics.topSubjects.map(s => {
                        const max = Math.max(...analytics.topSubjects!.map(x => x.solved), 1);
                        return (
                          <div key={s.subjectId}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="font-medium">{s.name}</span>
                              <span className="text-muted-foreground text-xs tabular-nums">{s.solved.toLocaleString()} решений · {s.questions} заданий</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${Math.max((s.solved / max) * 100, 2)}%`, background: s.color ?? 'hsl(var(--primary))' }} />
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}

                {/* Reports */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><Flag className="w-4 h-4" />Жалобы на задания</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 mb-3 text-sm">
                      <span>Всего: <strong>{analytics.reports.total}</strong></span>
                      <span>Ожидают: <strong className="text-amber-600">{analytics.reports.pending}</strong></span>
                    </div>
                    {analytics.reports.top.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Нет жалоб</p>
                    ) : (
                      <div className="space-y-2">
                        {analytics.reports.top.map(r => (
                          <div key={r.questionId} className="flex items-center gap-2 text-sm py-1.5 border-b border-border/40">
                            <Badge variant="destructive" className="text-xs">{r.count}</Badge>
                            <span className="text-xs text-muted-foreground">#{r.externalId}</span>
                            <span className="truncate flex-1">{r.content}...</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {!isModerator && (
            <TabsContent value="finance">
              <FinanceDashboard token={token} />
            </TabsContent>
          )}

          {!isModerator && (
            <TabsContent value="referrals">
              <ReferralManager token={token} />
            </TabsContent>
          )}

          {!isModerator && (
            <TabsContent value="news">
              <NewsManager token={token} />
            </TabsContent>
          )}

          {!isModerator && (
            <TabsContent value="banners">
              <BannerManager token={token} />
            </TabsContent>
          )}

          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className="flex items-center gap-2"><Mail className="w-5 h-5" />Обратная связь</CardTitle>
                  <select value={msgFilter} onChange={e => setMsgFilter(e.target.value)} className="px-3 py-2 rounded-lg border bg-background text-sm">
                    <option value="">Все</option>
                    <option value="NEW">Новые</option>
                    <option value="READ">Прочитанные</option>
                    <option value="RESOLVED">Решённые</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                {messages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Сообщений нет</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map(m => (
                      <div key={m.id} className="p-4 rounded-xl border bg-card">
                        <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold">{m.name}</span>
                              <a href={`mailto:${m.email}`} className="text-sm text-primary hover:underline break-all">{m.email}</a>
                              <Badge variant="secondary" className="text-xs">{SUBJECT_LABELS[m.subject] ?? m.subject}</Badge>
                              <Badge variant={m.status === 'NEW' ? 'default' : m.status === 'RESOLVED' ? 'outline' : 'secondary'} className="text-xs">
                                {m.status === 'NEW' ? 'Новое' : m.status === 'READ' ? 'Прочитано' : 'Решено'}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{new Date(m.createdAt).toLocaleString('ru-RU')}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {m.status !== 'READ' && <Button variant="ghost" size="sm" onClick={() => setMessageStatus(m.id, 'READ')}>Прочитано</Button>}
                            {m.status !== 'RESOLVED' && <Button variant="ghost" size="sm" onClick={() => setMessageStatus(m.id, 'RESOLVED')}>Решено</Button>}
                            <Button variant="ghost" size="icon" onClick={() => deleteMessage(m.id)} title="Удалить"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                          </div>
                        </div>
                        <p className="text-sm whitespace-pre-wrap break-words">{m.message}</p>
                        <div className="mt-2">
                          <a href={`mailto:${m.email}?subject=${encodeURIComponent('Re: ' + (SUBJECT_LABELS[m.subject] ?? 'обращение') + ' — CT-Platform')}`} className="text-sm text-primary hover:underline">Ответить по email →</a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit log — журнал действий администратора */}
          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><History className="w-5 h-5" />Журнал действий</CardTitle>
              </CardHeader>
              <CardContent>
                <AuditLogViewer token={token} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Подтверждение массового удаления */}
        <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить выбранные задания?</AlertDialogTitle>
              <AlertDialogDescription>
                Будет безвозвратно удалено заданий: {selectedQuestionIds.size}. Связанный прогресс пользователей по ним станет недоступен. Действие нельзя отменить.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => { setBulkDeleteOpen(false); void runQuestionsBulk('delete'); }}
              >
                Удалить {selectedQuestionIds.size}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Add Question Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Редактировать задание' : 'Добавить новое задание'}</DialogTitle>
              <DialogDescription>Заполните поля по формату РИКЗ</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Subject / Topic / Subtopic — cascade dropdowns */}
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Предмет <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={formSelectedSubjectId}
                    onChange={e => setFormSelectedSubjectId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
                  >
                    <option value="">— выберите предмет —</option>
                    {apiSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Тема (раздел)</label>
                    <select
                      value={formSelectedTopicId}
                      onChange={e => {
                        setFormSelectedTopicId(e.target.value);
                        const topic = formTopics.find(t => t.id === e.target.value);
                        if (topic) setNewQuestion(q => ({ ...q, section: topic.name }));
                      }}
                      disabled={!formSelectedSubjectId}
                      className="w-full px-3 py-2 rounded-lg border bg-background text-sm disabled:opacity-50"
                    >
                      <option value="">{formSelectedSubjectId ? '— выберите тему —' : 'Сначала предмет'}</option>
                      {formTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Подтема (опционально)</label>
                    <select
                      value={formSelectedSubtopicId}
                      onChange={e => setFormSelectedSubtopicId(e.target.value)}
                      disabled={!formSelectedTopicId || formSubtopics.length === 0}
                      className="w-full px-3 py-2 rounded-lg border bg-background text-sm disabled:opacity-50"
                    >
                      <option value="">— не выбрано —</option>
                      {formSubtopics.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Часть теста</label>
                  <select value={newQuestion.part} onChange={e => setNewQuestion({ ...newQuestion, part: e.target.value as 'A' | 'B' })} className="w-full px-3 py-2 rounded-lg border bg-background text-sm">
                    <option value="A">Часть А (выбор)</option>
                    <option value="B">Часть Б (открытый)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Тип задания</label>
                  <select value={newQuestion.type} onChange={e => setNewQuestion({ ...newQuestion, type: e.target.value as 'SINGLE_CHOICE' | 'TEXT_INPUT' })} className="w-full px-3 py-2 rounded-lg border bg-background text-sm">
                    <option value="SINGLE_CHOICE">Один верный ответ</option>
                    <option value="TEXT_INPUT">Текстовый ввод</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Уровень сложности: {newQuestion.difficulty}</label>
                <input type="range" min={1} max={5} value={newQuestion.difficulty} onChange={e => setNewQuestion({ ...newQuestion, difficulty: parseInt(e.target.value) })} className="w-full" />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>I (базовый)</span><span>II</span><span>III</span><span>IV</span><span>V (повышенный)</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Условие задачи (поддерживает KaTeX: $...$)</label>
                <textarea value={newQuestion.content} onChange={e => setNewQuestion({ ...newQuestion, content: e.target.value })} placeholder="Введите текст задания..." rows={3} className="w-full px-3 py-2 rounded-lg border bg-background text-sm resize-none" />
              </div>

              {newQuestion.type === 'SINGLE_CHOICE' && (
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Варианты ответов</label>
                  <div className="space-y-2">
                    {newQuestion.options.map((opt) => (
                      <div key={opt.id} className="flex items-center gap-2">
                        <input type="radio" name="correctAnswer" checked={newQuestion.correctAnswer === opt.id} onChange={() => setNewQuestion({ ...newQuestion, correctAnswer: opt.id })} />
                        <span className="text-sm font-medium w-6">{opt.id})</span>
                        <input type="text" value={opt.text} onChange={e => setNewQuestion({ ...newQuestion, options: newQuestion.options.map(o => o.id === opt.id ? { ...o, text: e.target.value } : o) })} placeholder={`Вариант ${opt.id}`} className="flex-1 px-3 py-1.5 rounded-lg border bg-background text-sm" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {newQuestion.type === 'TEXT_INPUT' && (
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Правильный ответ</label>
                  <input value={newQuestion.correctAnswer} onChange={e => setNewQuestion({ ...newQuestion, correctAnswer: e.target.value })} placeholder="Введите правильный ответ" className="w-full px-3 py-2 rounded-lg border bg-background text-sm" />
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-1.5 block">Объяснение</label>
                <textarea value={newQuestion.explanation} onChange={e => setNewQuestion({ ...newQuestion, explanation: e.target.value })} placeholder="Как решается задача..." rows={3} className="w-full px-3 py-2 rounded-lg border bg-background text-sm resize-none" />
              </div>

              <ImageUpload
                value={newQuestion.imageUrl}
                onChange={(url) => setNewQuestion({ ...newQuestion, imageUrl: url })}
                label="Изображение к заданию (опционально)"
              />

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>Отмена</Button>
                <Button onClick={handleCreateQuestion} disabled={isSaving || !newQuestion.content.trim() || !formSelectedSubjectId || !newQuestion.explanation.trim()}>
                  {isSaving ? <><Loader2 className="w-3 h-3 mr-2 animate-spin" />Сохранение...</> : editingId ? 'Сохранить изменения' : 'Создать задание'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default AdminPage;
