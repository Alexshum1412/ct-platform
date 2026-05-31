/**
 * Страница восстановления пароля
 * 
 * Позволяет пользователям запросить ссылку для сброса пароля
 * 
 * Ссылки на API:
 * - POST /api/auth/forgot-password - запрос сброса пароля
 * - POST /api/auth/reset-password - установка нового пароля
 */

import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  ArrowLeft, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { API_BASE_URL } from '@/lib/api/client';

// =====================================================
// API ФУНКЦИИ
// =====================================================

/**
 * Запросить сброс пароля
 * 
 * ССЫЛКА: POST /api/auth/forgot-password
 * 
 * @param email - Email пользователя
 * @returns Результат запроса
 */
async function requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Ошибка при запросе сброса пароля');
    }
    
    return { success: true, message: data.message };
  } catch (error) {
    console.error('Password reset request error:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Произошла ошибка' 
    };
  }
}

// =====================================================
// КОМПОНЕНТ ForgotPasswordPage
// =====================================================

export function ForgotPasswordPage() {
  // ---------------------------------------------------
  // СОСТОЯНИЕ
  // ---------------------------------------------------
  
  /** Email для восстановления */
  const [email, setEmail] = useState('');
  /** Состояние загрузки */
  const [isLoading, setIsLoading] = useState(false);
  /** Результат отправки */
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // ---------------------------------------------------
  // ОБРАБОТЧИКИ
  // ---------------------------------------------------
  
  /**
   * Обработка отправки формы
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Валидация email
    if (!email || !email.includes('@')) {
      setResult({
        success: false,
        message: 'Пожалуйста, введите корректный email',
      });
      return;
    }
    
    setIsLoading(true);
    setResult(null);
    
    // Отправка запроса
    const response = await requestPasswordReset(email);
    setResult(response);
    
    setIsLoading(false);
  };

  // ---------------------------------------------------
  // РЕНДЕР
  // ---------------------------------------------------

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader className="text-center">
            {/* Иконка */}
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            
            <CardTitle className="text-2xl">Восстановление пароля</CardTitle>
            <CardDescription>
              Введите email, указанный при регистрации, и мы отправим вам ссылку для сброса пароля
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {/* Уведомления */}
            <AnimatePresence mode="wait">
              {result && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4"
                >
                  <Alert variant={result.success ? 'default' : 'destructive'}>
                    {result.success ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    <AlertDescription>{result.message}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Форма */}
            {!result?.success ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Отправка...
                    </>
                  ) : (
                    'Отправить ссылку'
                  )}
                </Button>
              </form>
            ) : (
              /* Успешная отправка */
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  Проверьте вашу почту. Мы отправили инструкции по восстановлению пароля на {email}
                </p>
                <p className="text-sm text-muted-foreground">
                  Если письмо не пришло в течение нескольких минут, проверьте папку "Спам"
                </p>
              </div>
            )}
            
            {/* Ссылка назад */}
            <div className="mt-6 text-center">
              <Link 
                to="/login" 
                className="inline-flex items-center text-sm text-primary hover:underline"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Вернуться к входу
              </Link>
            </div>
          </CardContent>
        </Card>
        
        {/* Дополнительная помощь */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Нужна помощь?{' '}
          <a 
            href="mailto:support@ct-platform.by" 
            className="text-primary hover:underline"
          >
            Свяжитесь с поддержкой
          </a>
        </p>
      </motion.div>
    </div>
  );
}

// =====================================================
// КОМПОНЕНТ ResetPasswordPage
// =====================================================

/**
 * Страница установки нового пароля
 * 
 * Открывается по ссылке из письма
 * URL: /reset-password?token=...
 */
export function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  /**
   * Установить новый пароль
   * 
   * ССЫЛКА: POST /api/auth/reset-password
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Валидация
    if (password.length < 8) {
      setResult({
        success: false,
        message: 'Пароль должен содержать минимум 8 символов',
      });
      return;
    }
    
    if (password !== confirmPassword) {
      setResult({
        success: false,
        message: 'Пароли не совпадают',
      });
      return;
    }
    
    if (!token) {
      setResult({
        success: false,
        message: 'Недействительная или просроченная ссылка',
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Ошибка при сбросе пароля');
      }
      
      setResult({ success: true, message: 'Пароль успешно изменён' });
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Произошла ошибка',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Если нет токена - показываем ошибку
  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <CardTitle>Недействительная ссылка</CardTitle>
            <CardDescription>
              Ссылка для сброса пароля недействительна или просрочена
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link to="/forgot-password">
              <Button>Запросить новую ссылку</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Новый пароль</CardTitle>
            <CardDescription>
              Придумайте новый надёжный пароль
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <AnimatePresence mode="wait">
              {result && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4"
                >
                  <Alert variant={result.success ? 'default' : 'destructive'}>
                    {result.success ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    <AlertDescription>{result.message}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>
            
            {!result?.success ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">
                    Новый пароль
                  </label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Минимум 8 символов"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium">
                    Подтвердите пароль
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Повторите пароль"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Сохранение...
                    </>
                  ) : (
                    'Сохранить пароль'
                  )}
                </Button>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  Ваш пароль успешно изменён
                </p>
                <Link to="/login">
                  <Button>Войти с новым паролем</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// Named export for lazy loading
export default ForgotPasswordPage;
