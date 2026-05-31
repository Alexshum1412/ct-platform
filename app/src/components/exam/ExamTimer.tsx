import { motion } from 'framer-motion';
import { Clock, Pause, Play, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ExamTimerProps {
  durationSeconds: number;
  timeRemaining: number;
  isPaused: boolean;
  onTogglePause: () => void;
  onFinish: () => void;
}

export function ExamTimer({
  durationSeconds,
  timeRemaining,
  isPaused,
  onTogglePause,
  onFinish,
}: ExamTimerProps) {
  const percentage = Math.round((timeRemaining / durationSeconds) * 100);
  
  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Determine color based on time remaining
  const getTimeColor = () => {
    if (percentage > 50) return 'text-green-600 dark:text-green-400';
    if (percentage > 25) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };
  
  const getProgressColor = () => {
    if (percentage > 50) return 'bg-green-500';
    if (percentage > 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  return (
    <div className="relative bg-card border border-border rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Осталось времени</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onTogglePause}
            className="gap-2"
          >
            {isPaused ? (
              <>
                <Play className="w-4 h-4" />
                Продолжить
              </>
            ) : (
              <>
                <Pause className="w-4 h-4" />
                Пауза
              </>
            )}
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-2">
                <Flag className="w-4 h-4" />
                Завершить
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Завершить экзамен?</AlertDialogTitle>
                <AlertDialogDescription>
                  Вы уверены, что хотите завершить экзамен досрочно? 
                  Неотвеченные вопросы будут засчитаны как неверные.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Продолжить экзамен</AlertDialogCancel>
                <AlertDialogAction onClick={onFinish} className="bg-destructive">
                  Завершить
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      
      {/* Timer Display */}
      <div className="flex items-center gap-6">
        <motion.div
          className={`text-5xl font-bold font-mono tabular-nums ${getTimeColor()}`}
          animate={percentage <= 10 && !isPaused ? { opacity: [1, 0.5, 1] } : {}}
          transition={{ duration: 1, repeat: Infinity }}
        >
          {formatTime(timeRemaining)}
        </motion.div>
        
        <div className="flex-1 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Прогресс времени</span>
            <span className={getTimeColor()}>{percentage}%</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full transition-all duration-1000 ${getProgressColor()}`}
              initial={{ width: '100%' }}
              animate={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Low Time Warning */}
      {percentage <= 10 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded-lg text-sm flex items-center gap-2"
        >
          <Clock className="w-4 h-4" />
          Внимание! Осталось мало времени. Поторопитесь!
        </motion.div>
      )}
      
      {/* Paused Overlay */}
      {isPaused && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-2xl flex items-center justify-center"
        >
          <div className="text-center">
            <Pause className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
            <p className="text-lg font-semibold">Экзамен на паузе</p>
            <p className="text-sm text-muted-foreground">
              Нажмите "Продолжить" чтобы вернуться
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
