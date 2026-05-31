const COOKIE_CONSENT_KEY = 'ct-platform-cookie-consent';

export type CookieType = 'necessary' | 'functional' | 'analytics' | 'marketing';

export interface CookieConsent {
  hasConsented: boolean;
  date: string;
  allowed: Record<CookieType, boolean>;
}

export const defaultConsent: CookieConsent = {
  hasConsented: false,
  date: '',
  allowed: {
    necessary: true,
    functional: false,
    analytics: false,
    marketing: false,
  },
};

export function getCookieConsent(): CookieConsent {
  if (typeof window === 'undefined') return defaultConsent;
  try {
    const saved = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (saved) return JSON.parse(saved) as CookieConsent;
  } catch {
    // ignore
  }
  return defaultConsent;
}

export function saveCookieConsent(consent: CookieConsent): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
  } catch {
    // ignore
  }
}

export function isCookieAllowed(type: CookieType): boolean {
  const consent = getCookieConsent();
  return consent.hasConsented && consent.allowed[type];
}
