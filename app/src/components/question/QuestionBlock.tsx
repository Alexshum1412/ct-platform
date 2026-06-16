/**
 * Компонент блока заданий (Question Block)
 *
 * Отображает несколько вопросов, относящихся к одному общему тексту/контексту.
 * Используется в ЦТ/ЦЭ когда к одному тексту относится несколько вопросов.
 *
 * Особенности:
 * - Показывает общий контекст/текст один раз
 * - Позволяет переключаться между вопросами блока
 * - Показывает прогресс по блоку
 * - Поддерживает навигацию между вопросами
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, BookOpen, List, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MathFormula } from '@/components/ui/MathFormula';
import { QuestionCard } from './QuestionCard';
import type { Question } from '@/types';

// =====================================================
// ТИПЫ И ИНТЕРФЕЙСЫ
// =====================================================

interface QuestionBlockProps {
  /** ID блока */
  blockId: string;
  /** Общий контекст/текст для всех вопросов блока */
  context: string;
  /** Массив вопросов в блоке */
  questions: Question[];
  /** Callback при ответе на вопрос */
  onAnswer?: (questionId: string, answer: string) => void;
  /** Callback при завершении блока */
  onComplete?: () => void;
  /** Callback для перехода к следующему блоку */
  onNextBlock?: () => void;
}

// =====================================================
// КОМПОНЕНТ QuestionBlock
// =====================================================

export function QuestionBlock({
  blockId,
  context,
  questions,
  onAnswer,
  onComplete,
  onNextBlock,
}: QuestionBlockProps) {
  // Текущий индекс вопроса в блоке
  const [currentIndex, setCurrentIndex] = useState(0);
  // Показывать ли список всех вопросов
  const [showList, setShowList] = useState(false);
  // Ответы на вопросы блока
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;
  const progress = Math.round((answeredCount / totalQuestions) * 100);
  const isLastQuestion = currentIndex === totalQuestions - 1;

  // Перейти к следующему вопросу
  const handleNext = useCallback(() => {
    if (isLastQuestion) {
      onComplete?.();
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  }, [isLastQuestion, onComplete]);

  // Перейти к предыдущему вопросу
  const handlePrevious = useCallback(() => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  }, []);

  // Перейти к конкретному вопросу
  const goToQuestion = useCallback((index: number) => {
    setCurrentIndex(index);
    setShowList(false);
  }, []);

  // Обработка ответа
  const handleAnswer = useCallback((questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
    onAnswer?.(questionId, answer);
  }, [onAnswer]);

  return (
    <div className="space-y-6">
      {/* Шапка блока с контекстом */}
      <div className="bg-muted/50 rounded-xl p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Блок заданий</h3>
              <p className="text-sm text-muted-foreground">
                Задание {currentIndex + 1} из {totalQuestions}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="font-mono">
            #{blockId}
          </Badge>
        </div>

        {/* Прогресс по блоку */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Прогресс</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Общий контекст/текст */}
        <div className="bg-background rounded-lg p-4 border border-border">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            Прочитайте текст и ответьте на вопросы:
          </h4>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <MathFormula formula={context} />
          </div>
        </div>

        {/* Навигация по вопросам */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowList(!showList)}
            className="flex items-center gap-2"
          >
            <List className="w-4 h-4" />
            {showList ? 'Скрыть список' : 'Все задания блока'}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              {currentIndex + 1} / {totalQuestions}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNext}
              disabled={isLastQuestion && answeredCount < totalQuestions}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Список всех вопросов блока */}
      <AnimatePresence>
        {showList && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-muted/30 rounded-xl p-4 overflow-hidden"
          >
            <h4 className="font-medium mb-3">Все задания блока:</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {questions.map((q, index) => {
                const isAnswered = !!answers[q.id];
                const isCurrent = index === currentIndex;

                return (
                  <button
                    key={q.id}
                    onClick={() => goToQuestion(index)}
                    className={`p-3 rounded-lg text-left text-sm transition-all ${
                      isCurrent
                        ? 'bg-primary text-primary-foreground'
                        : isAnswered
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-background hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isAnswered && <CheckCircle className="w-4 h-4" />}
                      <span className="font-medium">Задание {index + 1}</span>
                    </div>
                    <p className="text-xs opacity-80 truncate mt-1">
                      {q.content.substring(0, 50)}...
                    </p>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Текущий вопрос */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <QuestionCard
            question={currentQuestion}
            onAnswer={(answer) => handleAnswer(currentQuestion.id, answer)}
            onNext={handleNext}
          />
        </motion.div>
      </AnimatePresence>

      {/* Кнопка завершения блока */}
      {answeredCount === totalQuestions && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center"
        >
          <Button onClick={onNextBlock} size="lg" className="gap-2">
            <CheckCircle className="w-5 h-5" />
            Завершить блок и перейти дальше
          </Button>
        </motion.div>
      )}
    </div>
  );
}

export default QuestionBlock;
