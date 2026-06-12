import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, X, ChevronDown, ChevronUp, Shield, Settings, BarChart3, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  type CookieType,
  type CookieConsent,
  getCookieConsent,
  saveCookieConsent,
} from '@/lib/cookieConsent';

export function CookieConsentBanner() {
  const [showDetails, setShowDetails] = useState(false);
  const [consent, setConsent] = useState<CookieConsent>(() => getCookieConsent());
  const [isVisible, setIsVisible] = useState(() => !getCookieConsent().hasConsented);

  const handleAcceptAll = () => {
    const newConsent: CookieConsent = {
      hasConsented: true,
      date: new Date().toISOString(),
      allowed: { necessary: true, functional: true, analytics: true, marketing: true },
    };
    saveCookieConsent(newConsent);
    setConsent(newConsent);
    setIsVisible(false);
  };

  const handleAcceptNecessary = () => {
    const newConsent: CookieConsent = {
      hasConsented: true,
      date: new Date().toISOString(),
      allowed: { necessary: true, functional: false, analytics: false, marketing: false },
    };
    saveCookieConsent(newConsent);
    setConsent(newConsent);
    setIsVisible(false);
  };

  const handleSaveSettings = () => {
    const newConsent: CookieConsent = { ...consent, hasConsented: true, date: new Date().toISOString() };
    saveCookieConsent(newConsent);
    setConsent(newConsent);
    setIsVisible(false);
  };

  const toggleCookieType = (type: CookieType) => {
    if (type === 'necessary') return;
    setConsent(prev => ({
      ...prev,
      allowed: { ...prev.allowed, [type]: !prev.allowed[type] },
    }));
  };

  const cookieTypes: { type: CookieType; title: string; description: string; icon: typeof Shield }[] = [
    { type: 'necessary', title: 'Необходимые', description: 'Обязательны для работы сайта: аутентификация, безопасность, сохранение прогресса.', icon: Shield },
    { type: 'functional', title: 'Функциональные', description: 'Запоминают ваши настройки: тема оформления, язык, предпочтения.', icon: Settings },
    { type: 'analytics', title: 'Аналитические', description: 'Помогают нам улучшать сайт: статистика посещений, поведение пользователей.', icon: BarChart3 },
    { type: 'marketing', title: 'Маркетинговые', description: 'Используются для показа релевантной рекламы и рекомендаций.', icon: Target },
  ];

  return (
    <AnimatePresence>
      {isVisible && (
        /* bottom-16 на мобиле — баннер живёт НАД нижней таб-навигацией (h-16),
           иначе кнопка «Принять» уезжает под неё и недоступна. */
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-16 lg:bottom-0 left-0 right-0 z-[60] p-3 md:p-6"
        >
          <div className="max-w-4xl mx-auto">
            <div className="bg-background/95 backdrop-blur-lg border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[calc(100dvh-6rem)] overflow-y-auto">
              <div className="p-4 md:p-6 border-b border-border">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                    <Cookie className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1">Мы используем cookies</h3>
                    <p className="text-sm text-muted-foreground">
                      Этот сайт использует cookies для улучшения работы и персонализации.
                      Необходимые cookies всегда включены. Подробнее в нашей{' '}
                      <a href="/privacy" className="text-primary hover:underline" target="_blank">
                        Политике конфиденциальности
                      </a>.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsVisible(false)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-b border-border overflow-hidden"
                  >
                    <div className="p-4 md:p-6 space-y-4">
                      {cookieTypes.map(({ type, title, description, icon: Icon }) => (
                        <div key={type} className="flex items-start gap-4 p-3 rounded-lg bg-muted/50">
                          <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center shrink-0">
                            <Icon className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">{title}</span>
                              <Switch
                                checked={consent.allowed[type]}
                                onCheckedChange={() => toggleCookieType(type)}
                                disabled={type === 'necessary'}
                              />
                            </div>
                            <p className="text-sm text-muted-foreground">{description}</p>
                            {type === 'necessary' && (
                              <span className="text-xs text-amber-600 dark:text-amber-400 mt-1 inline-block">
                                Всегда включены
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="p-4 md:p-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors sm:mr-auto"
                >
                  {showDetails ? (
                    <><ChevronUp className="w-4 h-4" />Скрыть настройки</>
                  ) : (
                    <><ChevronDown className="w-4 h-4" />Настроить cookies</>
                  )}
                </button>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button variant="outline" onClick={handleAcceptNecessary} className="whitespace-nowrap">
                    Только необходимые
                  </Button>
                  {showDetails ? (
                    <Button onClick={handleSaveSettings} className="whitespace-nowrap">Сохранить настройки</Button>
                  ) : (
                    <Button onClick={handleAcceptAll} className="whitespace-nowrap">Принять все</Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default CookieConsentBanner;
