import { useEffect } from 'react';
import { Header } from './Header';
import { CookieConsentBanner } from '@/components/CookieConsent';
import { NotificationStack } from '@/components/NotificationStack';
import { MobileTabBar } from './MobileTabBar';
import { GlobalClickCounter } from '@/components/GlobalClickCounter';
import { NightTicker } from '@/components/NightTicker';
import { AuthGateModal } from '@/components/AuthGateModal';
import { ScrollToTopButton } from '@/components/ScrollToTopButton';
import { PremiumReminder } from '@/components/PremiumReminder';
import { VerifyEmailBanner } from '@/components/VerifyEmailBanner';
import { WelcomeOnboarding } from '@/components/WelcomeOnboarding';
import { BannerDisplay } from '@/components/BannerDisplay';
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
      {/* In Focus mode the global header is hidden, so the offset is removed too.
          Top offset clears the fixed header + верхний вырез; bottom offset reserves
          the mobile tab-bar height + нижний safe-area (домашний индикатор iPhone),
          иначе нижняя часть контента пряталась за навигацией. На lg таб-бара нет. */}
      <main
        className={
          focusMode
            ? ''
            : 'pt-[calc(4rem_+_env(safe-area-inset-top))] pb-[calc(4rem_+_env(safe-area-inset-bottom))] lg:pb-0'
        }
      >
        {/* Временные баннеры (ЧП/техработы/реклама) — управляются из админки */}
        {!focusMode && <BannerDisplay />}
        {/* Напоминание подтвердить email (для вошедших, но не подтверждённых) */}
        <VerifyEmailBanner />
        {children}
        {/* Командный кликер — общий счётчик в самом низу каждой страницы
            (скрыт в фокус-режиме, чтобы не отвлекать) */}
        {!focusMode && <GlobalClickCounter />}
      </main>
      {/* Ночная бегущая строка (00:00–06:00) */}
      {!focusMode && <NightTicker />}
      {/* Cookie consent banner — hidden during distraction-free Focus mode */}
      {!focusMode && <CookieConsentBanner />}
      {/* Global toast notifications (level-ups, achievements, feedback) */}
      <NotificationStack />
      {/* Floating «scroll to top» button (appears after scrolling down) */}
      <ScrollToTopButton />
      {/* Recurring Premium nudge for free users */}
      <PremiumReminder />
      {/* Registration wall — shown when a guest tries a members-only action */}
      <AuthGateModal />
      {/* Трёхшаговое знакомство для нового гостя (один раз, в фокус-режиме не нужно) */}
      {!focusMode && <WelcomeOnboarding />}
      {/* Mobile bottom navigation (self-hides on desktop & in Focus mode) */}
      <MobileTabBar />
    </div>
  );
}
