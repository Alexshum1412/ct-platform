import { BookOpen, Github, Mail, MessageCircle } from 'lucide-react';

/**
 * Ссылки в футере
 * 
 * ССЫЛКИ:
 * - /terms - Условия использования
 * - /privacy - Политика конфиденциальности
 * - /subject/:slug - Страницы предметов
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
    { label: 'Теория', href: '/theory/math' },
    { label: 'Практика', href: '/practice/math' },
    { label: 'Лидерборд', href: '/leaderboard' },
    { label: 'Достижения', href: '/achievements' },
  ],
  about: [
    { label: 'Контакты', href: '/contact' },
    { label: 'Избранное', href: '/favorites' },
    { label: 'Условия использования', href: '/terms' },
    { label: 'Политика конфиденциальности', href: '/privacy' },
  ],
};

export function FooterSection() {
  return (
    <footer className="bg-muted/50 border-t border-border">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">CT-Platform</span>
            </div>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Современная платформа для подготовки к централизованному 
              тестированию и экзаменам в Республике Беларусь.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
              >
                <Mail className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>
          
          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Предметы</h4>
            <ul className="space-y-3">
              {footerLinks.subjects.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Ресурсы</h4>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">О нас</h4>
            <ul className="space-y-3">
              {footerLinks.about.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
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
