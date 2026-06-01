import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '@/lib/api/client';
import { Mail, MessageCircle, Bug, HelpCircle, ChevronDown, ChevronUp, Send, CheckCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const FAQ = [
  { q: 'Как работает платформа?', a: 'CT-Platform — бесплатный сервис подготовки к ЦТ и ЦЭ Беларуси. Решайте задания, проходите пробные экзамены, изучайте теорию и отслеживайте прогресс.' },
  { q: 'Сколько заданий можно решать бесплатно?', a: 'Бесплатный план включает 10 заданий в день. Лимит сбрасывается каждый день в полночь. Premium-подписка снимает ограничения.' },
  { q: 'Чем отличается Premium?', a: 'Premium даёт неограниченное решение заданий, полную аналитику по слабым темам, симулятор ЦТ с разбором ошибок, защиту серии (1 пропуск/месяц) и значок 👑 в профиле и таблице лидеров.' },
  { q: 'Задания соответствуют реальному ЦТ?', a: 'Да! Все задания строго соответствуют официальным спецификациям РИКЗ: правильный формат, разделы, уровни сложности (I–V) и типы заданий (Часть А и Часть Б).' },
  { q: 'Как создать аккаунт?', a: 'Нажмите «Регистрация» в правом верхнем углу. Для регистрации нужен только email и пароль (мин. 8 символов с заглавной буквой и цифрой).' },
  { q: 'Что делать, если нашёл ошибку в задании?', a: 'Во время решения нажмите кнопку с флажком на карточке задания → выберите причину → отправьте. Мы проверим и исправим в течение 24 часов.' },
  { q: 'Есть ли мобильное приложение?', a: 'Мобильное приложение в разработке. Пока сайт адаптирован для мобильных устройств и работает как прогрессивное веб-приложение (PWA).' },
];

export function ContactPage() {
  const [searchParams] = useSearchParams();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', email: '', subject: searchParams.get('topic') || '', message: '' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const r = await fetch(`${API_BASE_URL}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (r.ok) {
        setSent(true);
      } else {
        const d = await r.json().catch(() => ({}));
        setError(d.error || 'Не удалось отправить сообщение. Попробуйте позже.');
      }
    } catch {
      setError('Нет соединения с сервером. Проверьте интернет и попробуйте снова.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-background border-b border-border">
        <div className="container py-16 max-w-4xl text-center">
          <Badge className="mb-4">Поддержка</Badge>
          <h1 className="text-4xl font-bold mb-4">Свяжитесь с нами</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Есть вопрос, нашли ошибку или хотите поделиться идеей? Мы рады помочь и всегда открыты к обратной связи.
          </p>
        </div>
      </div>

      <div className="container py-12 max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {/* Contact options */}
          {[
            { icon: Mail, title: 'Email поддержки', desc: 'support@ct-platform.by', sub: 'Ответим в течение 24 часов', color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30', href: 'mailto:support@ct-platform.by' },
            { icon: MessageCircle, title: 'Telegram', desc: '@ctplatform_by', sub: 'Быстрые ответы в рабочее время', color: 'text-sky-500 bg-sky-100 dark:bg-sky-900/30', href: '#' },
            { icon: Bug, title: 'Сообщить об ошибке', desc: 'Ошибки в заданиях', sub: 'Используйте кнопку флажка в задании', color: 'text-orange-500 bg-orange-100 dark:bg-orange-900/30', href: '#' },
          ].map(({ icon: Icon, title, desc, sub, color, href }, i) => (
            <motion.a key={title} href={href} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="block">
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold mb-1">{title}</h3>
                  <p className="font-medium text-primary">{desc}</p>
                  <p className="text-sm text-muted-foreground mt-1">{sub}</p>
                </CardContent>
              </Card>
            </motion.a>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* FAQ */}
          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <HelpCircle className="w-6 h-6 text-primary" />
              Частые вопросы
            </h2>
            <div className="space-y-3">
              {FAQ.map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card>
                    <button className="w-full p-4 text-left" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-sm">{item.q}</span>
                        {openFaq === i ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                      </div>
                    </button>
                    {openFaq === i && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="overflow-hidden">
                        <div className="px-4 pb-4 text-sm text-muted-foreground">{item.a}</div>
                      </motion.div>
                    )}
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Contact Form */}
          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Send className="w-6 h-6 text-primary" />
              Обратная связь
            </h2>
            {sent ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Сообщение отправлено!</h3>
                  <p className="text-muted-foreground">Мы ответим вам в течение 24 часов.</p>
                  <Button className="mt-6" onClick={() => { setSent(false); setError(null); setForm({ name: '', email: '', subject: '', message: '' }); }}>
                    Отправить ещё
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Имя</label>
                        <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Иван Иванов" required className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Email</label>
                        <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="you@email.com" required className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Тема</label>
                      <select value={form.subject} onChange={e => setForm(f => ({...f, subject: e.target.value}))} required className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                        <option value="">Выберите тему...</option>
                        <option value="bug">Ошибка в задании</option>
                        <option value="technical">Техническая проблема</option>
                        <option value="suggestion">Предложение</option>
                        <option value="premium">Вопрос по Premium</option>
                        <option value="data-request">Запрос персональных данных</option>
                        <option value="other">Другое</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Сообщение</label>
                      <textarea value={form.message} onChange={e => setForm(f => ({...f, message: e.target.value}))} rows={5} placeholder="Опишите подробно..." required className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                    </div>
                    {error && (
                      <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-lg px-3 py-2">{error}</p>
                    )}
                    <Button type="submit" className="w-full" size="lg" disabled={sending}>
                      {sending ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Отправка...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2"><Send className="w-4 h-4" />Отправить</span>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            <Card className="mt-4 bg-muted/50">
              <CardContent className="p-4 flex items-start gap-3">
                <ExternalLink className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Информация о структуре ЦТ/ЦЭ:{' '}
                  <a href="#" className="text-primary hover:underline">официальный сайт РИКЗ</a>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContactPage;
