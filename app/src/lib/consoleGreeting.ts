/**
 * Стилизованное приветствие в консоли браузера (для тех, кто открывает DevTools).
 * Чистый вывод через console.log с %c-стилями и ASCII-артом. Ничего не ломает.
 */
export function printConsoleGreeting(): void {
  // не дублируем при hot-reload / повторных вызовах
  const w = window as unknown as { __ctGreeted?: boolean };
  if (w.__ctGreeted) return;
  w.__ctGreeted = true;

  try {
    const art = [
      '   ____ _____   ____  _       _    __                      ',
      '  / ___|_   _| |  _ \\| | __ _| |_ / _| ___  _ __ _ __ ___  ',
      ' | |     | |   | |_) | |/ _` | __| |_ / _ \\| \'__| \'_ ` _ \\ ',
      ' | |___  | |   |  __/| | (_| | |_|  _| (_) | |  | | | | | |',
      '  \\____| |_|   |_|   |_|\\__,_|\\__|_|  \\___/|_|  |_| |_| |_|',
    ].join('\n');

    console.log(
      `%c${art}`,
      'color:#3b82f6;font-weight:bold;font-family:monospace;line-height:1.1;text-shadow:0 1px 0 rgba(0,0,0,.15)',
    );
    console.log(
      '%c⚠️  Не лезьте в консоль, тут водятся баги! 🐛',
      'color:#fff;background:linear-gradient(90deg,#ef4444,#f59e0b);font-size:15px;font-weight:bold;padding:8px 14px;border-radius:8px;',
    );
    console.log(
      '%cА если серьёзно — добро пожаловать! CT-Platform делается с любовью к ученикам. ' +
      'Нашли баг или хотите помочь? Пишите: /contact 💙',
      'color:#64748b;font-size:12px;',
    );
  } catch {
    /* консоль недоступна — молча игнорируем */
  }
}
