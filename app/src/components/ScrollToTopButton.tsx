/**
 * ScrollToTopButton — плавающая кнопка «наверх».
 *
 * Появляется, когда страница прокручена достаточно далеко вниз, и мгновенно
 * (плавно) возвращает пользователя в самый верх. Рендерится глобально в Layout.
 * Прячется в фокус-режиме и приподнята над мобильной нижней панелью.
 */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export function ScrollToTopButton() {
  const focusMode = useAppStore((s) => s.focusMode);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (focusMode) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          initial={{ opacity: 0, scale: 0.7, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7, y: 12 }}
          transition={{ duration: 0.2 }}
          onClick={() => window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })}
          aria-label="Наверх"
          title="Наверх"
          className="fixed right-4 bottom-20 lg:bottom-6 z-40 w-11 h-11 rounded-full bg-primary text-white shadow-lg shadow-primary/30 flex items-center justify-center hover:bg-primary/90 hover:scale-105 active:scale-95 transition-transform"
        >
          <ArrowUp className="w-5 h-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

export default ScrollToTopButton;
