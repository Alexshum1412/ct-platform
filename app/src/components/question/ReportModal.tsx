import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Flag, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/useAppStore';
import { questionsApi } from '@/lib/api/client';

interface ReportModalProps {
  questionId: string;
  isOpen: boolean;
  onClose: () => void;
}

const REASONS = [
  { id: 'ERROR', label: 'Ошибка в условии или ответе', icon: '❌' },
  { id: 'UNCLEAR', label: 'Непонятная формулировка', icon: '❓' },
  { id: 'INAPPROPRIATE', label: 'Неподходящий контент', icon: '🚫' },
  { id: 'DUPLICATE', label: 'Дублирующее задание', icon: '📋' },
  { id: 'OTHER', label: 'Другое', icon: '📝' },
] as const;

export function ReportModal({ questionId, isOpen, onClose }: ReportModalProps) {
  const { token } = useAppStore();
  const [reason, setReason] = useState<typeof REASONS[number]['id'] | ''>('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleSubmit = async () => {
    if (!reason) return;
    setStatus('sending');

    if (!token) {
      setStatus('error');
      return;
    }

    const result = await questionsApi.report({ questionId, reason, description: description || undefined }, token);
    if (result.error) {
      setStatus('error');
    } else {
      setStatus('success');
      setTimeout(() => {
        onClose();
        setStatus('idle');
        setReason('');
        setDescription('');
      }, 1500);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-background rounded-2xl shadow-2xl max-w-md w-full"
          >
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-orange-500" />
                <h3 className="font-semibold">Сообщить об ошибке</h3>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5">
              {status === 'success' ? (
                <div className="text-center py-6">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="font-semibold">Спасибо за обращение!</p>
                  <p className="text-sm text-muted-foreground mt-1">Мы рассмотрим ваш отчёт в течение 24 часов.</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-4">Выберите причину обращения:</p>
                  <div className="space-y-2 mb-4">
                    {REASONS.map(r => (
                      <button
                        key={r.id}
                        onClick={() => setReason(r.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                          reason === r.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                        }`}
                      >
                        <span className="text-lg">{r.icon}</span>
                        <span className="text-sm font-medium">{r.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="mb-4">
                    <label className="text-sm font-medium mb-1.5 block">Комментарий (необязательно)</label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Опишите ошибку подробнее..."
                      rows={3}
                      maxLength={500}
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                    />
                    <p className="text-xs text-muted-foreground text-right mt-1">{description.length}/500</p>
                  </div>

                  {status === 'error' && (
                    <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-xl mb-4 text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {token ? 'Ошибка отправки. Попробуйте позже.' : 'Войдите, чтобы отправить отчёт.'}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={onClose}>Отмена</Button>
                    <Button
                      className="flex-1"
                      disabled={!reason || status === 'sending'}
                      onClick={handleSubmit}
                    >
                      {status === 'sending' ? (
                        <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Отправка...</span>
                      ) : (
                        <span className="flex items-center gap-2"><Flag className="w-4 h-4" />Отправить</span>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
