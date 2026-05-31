import { useEffect } from 'react';
import { Header } from './Header';
import { CookieConsentBanner } from '@/components/CookieConsent';
import { useAppStore } from '@/store/useAppStore';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { theme, focusMode } = useAppStore();

  // Apply theme on mount
  useEffect(() => {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const activeTheme = theme === 'system' ? systemTheme : theme;
    document.documentElement.classList.toggle('dark', activeTheme === 'dark');
  }, [theme]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* In Focus mode the global header is hidden, so the offset is removed too. */}
      <main className={focusMode ? '' : 'pt-16'}>
        {children}
      </main>
      {/* Cookie consent banner — hidden during distraction-free Focus mode */}
      {!focusMode && <CookieConsentBanner />}
    </div>
  );
}
