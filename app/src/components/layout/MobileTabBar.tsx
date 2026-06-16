/**
 * Bottom tab navigation for mobile (hidden on lg+). Always-available primary
 * navigation with a spring-animated active indicator (framer-motion layoutId).
 * Hidden in Focus mode. The desktop header is untouched.
 */
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
      className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-background/90 backdrop-blur-xl border-t border-border/70 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
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
              className={`relative flex flex-col items-center justify-center gap-1 py-2 min-h-[3.5rem] text-[11px] font-medium transition-colors duration-200 ${
                t.active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.active && (
                <motion.span
                  layoutId="mobile-tab-indicator"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute inset-x-2 top-1 bottom-1 rounded-xl bg-primary/[0.09]"
                  aria-hidden
                />
              )}
              {t.active && (
                <motion.span
                  layoutId="mobile-tab-dash"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute top-0 h-0.5 w-10 rounded-full bg-primary"
                  aria-hidden
                />
              )}
              <Icon className={`relative w-[1.35rem] h-[1.35rem] transition-transform duration-200 ${t.active ? 'scale-110' : ''}`} />
              <span className="relative">{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
