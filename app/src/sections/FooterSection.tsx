import { BookOpen, Mail, MessageCircle, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Футер главной страницы. Все внутренние ссылки — SPA <Link> (без перезагрузки),
 * каждая ведёт на реально работающую страницу:
 * - «Теория» — на хаб /theory (НЕ /theory/:slug — тот без темы пустоват);
 * - иконки: контакт-форма, mailto поддержки, олимпиады.
 * Спрятанные ссылки на демо-игры (рулетка/блэкджек) сохранены.
 */
const footerLinks = {
  subjects: [
    { label: 'Математика', href: '/subject/math' },
    { label: 'Русский язык', href: '/subject/russian' },
    { label: 'Физика', href: '/subject/physics' },
    { label: 'Химия', href: '/subject/chemistry' },
    { label: 'Биология', href: '/subject/biology' },
  ],
  resources: [
    { label: 'Теория', href: '/theory' },
    { label: 'Практика', href: '/practice/math' },
    { label: 'Олимпиады', href: '/olympiad' },
    { label: 'Рейтинг', href: '/leaderboard' },
    { label: 'Достижения', href: '/achievements' },
    // Спрятанная после «Достижения» ссылка на демо-мини-игру «Блэкджэк».
    { label: 'Блэкджэк', href: '/blackjack' },
  ],
  about: [
    { label: 'Контакты', href: '/contact' },
    { label: 'Premium', href: '/payment' },
    { label: 'Избранное', href: '/favorites' },
    { label: 'Политика конфиденциальности', href: '/privacy' },
    // Спрятанная между политикой и условиями ссылка на демо-мини-игру «Рулетка».
    { label: 'Рулетка', href: '/roulette' },
    { label: 'Условия использования', href: '/terms' },
  ],
};

const HIDDEN_GAME_LINKS: Record<string, { title: string; cls: string }> = {
  '/blackjack': { title: 'Мини-игра на виртуальные бриллианты', cls: 'text-muted-foreground/40 hover:text-muted-foreground transition-colors text-sm' },
  '/roulette': { title: 'Мини-игра на виртуальные монеты', cls: 'text-muted-foreground/35 hover:text-muted-foreground transition-colors text-sm' },
};

function FooterLink({ href, label }: { href: string; label: string }) {
  const hidden = HIDDEN_GAME_LINKS[href];
  return (
    <Link
      to={href}
      title={hidden?.title}
      className={hidden?.cls ?? 'text-muted-foreground hover:text-foreground transition-colors'}
    >
      {label}
    </Link>
  );
}

export function FooterSection() {
  return (
    <footer className="bg-muted/50 border-t border-border">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-violet-600 shadow-md shadow-primary/25 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">CT-Platform</span>
            </div>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Современная платформа для подготовки к централизованному
              тестированию и экзаменам в Республике Беларусь.
            </p>
            <div className="flex items-center gap-4">
              <Link
                to="/contact"
                title="Написать нам"
                aria-label="Форма обратной связи"
                className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
              </Link>
              <a
                href="mailto:support@ct-platform.by"
                title="support@ct-platform.by"
                aria-label="Email поддержки"
                className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
              >
                <Mail className="w-5 h-5" />
              </a>
              <Link
                to="/olympiad"
                title="Олимпиадная подготовка"
                aria-label="Олимпиадная подготовка"
                className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
              >
                <Trophy className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Предметы</h4>
            <ul className="space-y-3">
              {footerLinks.subjects.map((link) => (
                <li key={link.label}><FooterLink {...link} /></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Ресурсы</h4>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.label}><FooterLink {...link} /></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">О нас</h4>
            <ul className="space-y-3">
              {footerLinks.about.map((link) => (
                <li key={link.label}><FooterLink {...link} /></li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2027 CT-Platform. Все права защищены.
          </p>
          <p className="text-sm text-muted-foreground">
            Подготовка к ЦТ и ЦЭ в Республике Беларусь
          </p>
        </div>
      </div>
    </footer>
  );
}
