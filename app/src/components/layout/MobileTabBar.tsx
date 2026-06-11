/**
 * Bottom tab navigation for mobile (hidden on lg+). Always-available primary
 * navigation: Главная / Теория / Практика / Профиль, with a clear active state.
 * Hidden in Focus mode. The desktop header is untouched.
 */
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, BookOpen, Target, Trophy, User } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export function MobileTabBar() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const focusMode = useAppStore((s) => s.focusMode);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);

  if (focusMode) return null;

  const onHome = pathname === '/';
  const tabs = [
    { label: 'Главная', icon: Home, to: '/', active: onHome && !search.includes('subjects') },
    { label: 'Теория', icon: BookOpen, to: '/theory', active: pathname.startsWith('/theory') },
    { label: 'Практика', icon: Target, to: '/?scroll=subjects', active: pathname.startsWith('/practice') || pathname.startsWith('/subject') },
    { label: 'Олимп.', icon: Trophy, to: '/olympiad', active: pathname.startsWith('/olympiad') },
    { label: 'Профиль', icon: User, to: isAuthenticated ? '/profile' : '/login', active: pathname.startsWith('/profile') || pathname.startsWith('/login') },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur-md border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Основная навигация"
    >
      <div className="grid grid-cols-5">
        {tabs.map((t) => {
          const Icon = t.icon;
          const handleClick = (e: React.MouseEvent) => {
            // "Практика" → лента предметов на главной (выбор предмета для практики)
            if (t.to === '/?scroll=subjects') {
              e.preventDefault();
              if (onHome) document.getElementById('subjects-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              else navigate('/?scroll=subjects');
            }
          };
          return (
            <Link
              key={t.label}
              to={t.to}
              onClick={handleClick}
              aria-current={t.active ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center gap-1 py-2 min-h-[3.5rem] text-[11px] font-medium transition-colors ${
                t.active ? 'text-primary bg-primary/[0.07]' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {t.active && <span className="absolute top-0 h-0.5 w-10 rounded-full bg-primary" />}
              <Icon className="w-[1.35rem] h-[1.35rem]" />
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
