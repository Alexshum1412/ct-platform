/**
 * Компонент карточки вопроса с поддержкой формул KaTeX
 * Отображает вопрос, варианты ответов, подсказки, объяснения и видео-разбор
 *
 * ВАЖНО: Использует встроенный YouTube плеер для видео-объяснений
 */

import { useState, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Star, HelpCircle, BookOpen, Clock, TrendingUp, Lightbulb, ChevronDown, Flag, Video, Play, ExternalLink, Check, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { MathFormula } from '@/components/ui/MathFormula';
import { useAppStore } from '@/store/useAppStore';
import type { Question } from '@/types';

// =====================================================
// ТИПЫ И ИНТЕРФЕЙСЫ
// =====================================================

interface QuestionCardProps {
  /** Объект вопроса с данными */
  question: Question;
  /** Callback при выборе ответа */
  onAnswer?: (answer: string) => void;
  /** Callback для показа теории по теме */
  onShowTheory?: () => void;
  /** Callback для перехода к следующему вопросу */
  onNext?: () => void;
  /** Callback для жалобы на вопрос */
  onReport?: () => void;
  /** Статистика ответов по вариантам (для анимации) */
  answerStats?: Record<string, number>;
  /** ID блока заданий (если задание часть блока) */
  blockId?: string;
  /** Callback для просмотра всех заданий блока */
  onViewBlock?: (blockId: string) => void;
}

// Уровни подсказок с иконками
const hintLevels = [
  { id: 'small', name: 'Маленькая подсказка', icon: Lightbulb },
  { id: 'detailed', name: 'Подробная подсказка', icon: HelpCircle },
  { id: 'stepby', name: 'Пошаговое решение', icon: BookOpen },
] as const;

// =====================================================
// УТИЛИТЫ ДЛЯ РАБОТЫ С YOUTUBE
// =====================================================

/**
 * Извлекает YouTube video ID из различных форматов URL
 * Поддерживает: youtube.com/watch?v=, youtu.be/, youtube.com/embed/
 *
 * @param url - URL видео на YouTube
 * @returns video ID или null если не удалось извлечь
 */
function extractYouTubeId(url: string): string | null {
  if (!url) return null;

  // Регулярные выражения для разных форматов YouTube URL
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/, // Просто ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Компонент встроенного YouTube плеера
 * Использует iframe API для встраивания видео
 *
 * ССЫЛКА: https://developers.google.com/youtube/iframe_api_reference
 */
interface YouTubePlayerProps {
  /** URL или ID видео на YouTube */
  videoUrl: string;
  /** Заголовок для отображения над плеером */
  title?: string;
}

const YouTubePlayer = memo(function YouTubePlayer({ videoUrl, title }: YouTubePlayerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const videoId = extractYouTubeId(videoUrl);

  // Если не удалось извлечь ID - показываем ссылку
  if (!videoId) {
    return (
      <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
            <Video className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-blue-800 dark:text-blue-400 truncate">
              {title || 'Видео-разбор'}
            </p>
          </div>
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md border border-blue-300 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors shrink-0"
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            Открыть
          </a>
        </div>
      </div>
    );
  }

  // URL для встраивания с параметрами
  // rel=0 - не показывать похожие видео
  // modestbranding=1 - минимальный брендинг
  // enablejsapi=1 - включить JS API
  const embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1`;

  return (
    <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 overflow-hidden">
      {/* Заголовок и кнопка развернуть */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center gap-3 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
      >
        <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
          {isExpanded ? (
            <Video className="w-6 h-6 text-white" />
          ) : (
            <Play className="w-6 h-6 text-white ml-1" />
          )}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="font-medium text-blue-800 dark:text-blue-400 truncate">
            {title || 'Видео-разбор'}
          </p>
          <p className="text-sm text-blue-600 dark:text-blue-500">
            {isExpanded ? 'Нажмите, чтобы скрыть' : 'Нажмите, чтобы посмотреть'}
          </p>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-blue-600 dark:text-blue-400 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Встроенный плеер */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-blue-200 dark:border-blue-800"
          >
            <div className="relative pt-[56.25%] bg-black">
              {/* 16:9 aspect ratio */}
              <iframe
                src={embedUrl}
                title={title || 'Видео-разбор'}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            </div>
            {/* Кнопка открыть на YouTube */}
            <div className="p-3 bg-blue-100 dark:bg-blue-900/40 flex justify-end">
              <a
                href={`https://youtube.com/watch?v=${videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-700 dark:text-blue-400 hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                Открыть на YouTube
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// =====================================================
// КОМПОНЕНТ QuestionCard (оптимизированный с React.memo)
// =====================================================

export const QuestionCard = memo(function QuestionCard({
  question,
  onAnswer,
  onShowTheory,
  onNext,
  onReport,
  answerStats,
  blockId,
  onViewBlock,
}: QuestionCardProps) {
  // ---------------------------------------------------
  // СОСТОЯНИЕ КОМПОНЕНТА
  // ---------------------------------------------------

  /** Выбранный пользователем ответ (ID опции или текст) */
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  /** Флаг - ответ уже проверен */
  const [isAnswered, setIsAnswered] = useState(false);
  /** Показывать ли секцию подсказок */
  const [showHints, setShowHints] = useState(false);
  /** Активный уровень подсказки (small/detailed/stepby) */
  const [activeHintLevel, setActiveHintLevel] = useState<string | null>(null);
  /** Множество использованных подсказок */
  const [usedHints, setUsedHints] = useState<Set<string>>(new Set());
  /** Показывать ли статистику ответов */
  const [showStats, setShowStats] = useState(false);

  // Получаем функции из глобального store
  const { toggleFavorite, favorites, isQuestionSolved, getQuestionResult, addSolvedQuestion } = useAppStore();
  const navigate = useNavigate();
  
  // Проверяем, решено ли это задание ранее
  const wasSolvedBefore = isQuestionSolved(question.id);
  const previousResult = getQuestionResult(question.id);

  // ---------------------------------------------------
  // ВЫЧИСЛЯЕМЫЕ ЗНАЧЕНИЯ (мемоизированы)
  // ---------------------------------------------------

  /** Находится ли вопрос в избранном */
  const isFavorite = favorites.includes(question.id);
  /** Правильно ли ответил пользователь */
  const isCorrect = selectedAnswer === question.correctAnswer;

  /** Процент правильных ответов (вычисляется из реальных данных) */
  const correctPercentage = question.timesSolved > 0
    ? Math.round((question.timesCorrect / question.timesSolved) * 100)
    : 0;

  /** Среднее время решения в секундах */
  const avgTime = question.avgTimeSeconds || 60;

  // ---------------------------------------------------
  // ОБРАБОТЧИКИ СОБЫТИЙ (мемоизированы с useCallback)
  // ---------------------------------------------------

  /** Проверить выбранный ответ */
  const handleCheck = useCallback(() => {
    if (!selectedAnswer) return;
    const correct = selectedAnswer === question.correctAnswer;
    setIsAnswered(true);
    // Сохраняем результат в store
    addSolvedQuestion(question.id, correct);
    // Показываем статистику с анимацией
    setShowStats(true);
    onAnswer?.(selectedAnswer);
  }, [selectedAnswer, question.correctAnswer, question.id, addSolvedQuestion, onAnswer]);

  /** Перейти к следующему вопросу, сбросить состояние */
  const handleNext = useCallback(() => {
    setSelectedAnswer('');
    setIsAnswered(false);
    setShowHints(false);
    setActiveHintLevel(null);
    setUsedHints(new Set());
    onNext?.();
  }, [onNext]);

  /** Использовать подсказку определенного уровня */
  const handleUseHint = useCallback((level: string) => {
    setActiveHintLevel(level);
    setUsedHints(prev => new Set(prev).add(level));
  }, []);

  /** Переключить избранное */
  const handleToggleFavorite = useCallback(() => {
    toggleFavorite(question.id);
  }, [toggleFavorite, question.id]);
  
  // ---------------------------------------------------
  // КОНФИГУРАЦИЯ СЛОЖНОСТИ
  // ---------------------------------------------------
  
  /** Названия уровней сложности */
  const difficultyLabels: Record<number, string> = {
    1: 'Лёгкий',
    2: 'Средний',
    3: 'Сложный',
    4: 'Очень сложный',
    5: 'Эксперт',
  };
  
  /** CSS классы для стилизации бейджа сложности */
  const difficultyColors: Record<number, string> = {
    1: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    2: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    3: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    4: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    5: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="outline" className="font-mono">
              #{question.externalId || question.id}
            </Badge>
            <Badge className={difficultyColors[question.difficulty]}>
              {difficultyLabels[question.difficulty]}
            </Badge>
            {/* Отметка о том, что задание уже решено */}
            {wasSolvedBefore && (
              <Badge 
                variant="secondary" 
                className={`flex items-center gap-1 ${
                  previousResult 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                    : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                }`}
              >
                <History className="w-3 h-3" />
                {previousResult ? 'Решено верно' : 'Решено с ошибкой'}
              </Badge>
            )}
            {/* Отметка о блоке заданий */}
            {blockId && (
              <Badge 
                variant="secondary" 
                className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 cursor-pointer hover:bg-purple-200"
                onClick={() => onViewBlock?.(blockId)}
              >
                Блок заданий
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleFavorite}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              title="В избранное"
            >
              <Star
                className={`w-5 h-5 transition-colors ${
                  isFavorite
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-muted-foreground'
                }`}
              />
            </button>
            {onShowTheory && (
              <button
                onClick={onShowTheory}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                title="Показать теорию"
              >
                <BookOpen className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
            <button
              onClick={onReport}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              title="Пометить на разбор"
            >
              <Flag className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
        
        {/* ================================================= */}
        {/* СОДЕРЖИМОЕ ВОПРОСА С ПОДДЕРЖКОЙ ФОРМУЛ KATEX      */}
        {/* ================================================= */}
        <div className="mt-4">
          {/* 
            Рендерим содержимое вопроса через MathFormula
            для поддержки LaTeX формул вида $...$ или $$...$$
            Формулы должны быть в формате KaTeX:
            - $x^2$ - inline формула
            - $$x^2$$ - блочная формула
          */}
          <MathFormula
            formula={question.content}
            className="text-lg sm:text-xl leading-relaxed font-medium"
          />
        </div>

        {/* Image attached to question */}
        {question.imageUrl && (
          <div className="mt-4 rounded-xl overflow-hidden border border-border bg-muted/30">
            <img
              src={question.imageUrl.startsWith('http') ? question.imageUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${question.imageUrl}`}
              alt="Иллюстрация к заданию"
              loading="lazy"
              className="w-full max-h-96 object-contain"
            />
          </div>
        )}
        {question.images && question.images.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {question.images.map((img, i) => (
              <div key={i} className="rounded-lg overflow-hidden border border-border bg-muted/30">
                <img
                  src={img.startsWith('http') ? img : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${img}`}
                  alt={`Изображение ${i + 1}`}
                  loading="lazy"
                  className="w-full max-h-64 object-contain"
                />
              </div>
            ))}
          </div>
        )}
        
        {/* Tags */}
        {question.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {question.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-xs cursor-pointer hover:bg-primary/20 hover:text-primary transition-colors"
                onClick={() => navigate(`/theory?tag=${encodeURIComponent(tag)}`)}
                title={`Открыть теорию по теме "${tag}"`}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Hints Section */}
        {!isAnswered && (
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
            <button
              onClick={() => setShowHints(!showHints)}
              className="flex items-center justify-between w-full"
            >
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
                <Lightbulb className="w-5 h-5" />
                <span className="font-medium">Нужна подсказка?</span>
              </div>
              <ChevronDown className={`w-5 h-5 transition-transform ${showHints ? 'rotate-180' : ''}`} />
            </button>
            
            <AnimatePresence>
              {showHints && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-4 space-y-3"
                >
                  {/* Hint Level Buttons */}
                  <div className="flex flex-wrap gap-2">
                    {hintLevels.map((level) => (
                      <button
                        key={level.id}
                        onClick={() => handleUseHint(level.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          activeHintLevel === level.id
                            ? 'bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-200'
                            : usedHints.has(level.id)
                            ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'
                            : 'bg-white dark:bg-background border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                        }`}
                      >
                        <level.icon className="w-4 h-4" />
                        {level.name}
                      </button>
                    ))}
                  </div>
                  
                  {/* ================================================= */}
                  {/* АКТИВНАЯ ПОДСКАЗКА С ПОДДЕРЖКОЙ ФОРМУЛ              */}
                  {/* ================================================= */}
                  {activeHintLevel && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white dark:bg-background rounded-lg p-4 border border-amber-200 dark:border-amber-800"
                    >
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-400 mb-2">
                        {hintLevels.find(h => h.id === activeHintLevel)?.name}:
                      </p>
                      {/* 
                        Подсказки рендерятся через MathFormula
                        Поддерживаются формулы в LaTeX формате
                      */}
                      <ul className="space-y-2">
                        {question.hints?.[activeHintLevel as keyof typeof question.hints]?.map((hint, i) => (
                          <li key={i} className="text-sm text-amber-700 dark:text-amber-500 flex items-start gap-2">
                            <span className="text-amber-400 mt-0.5">•</span>
                            <MathFormula formula={hint} inline />
                          </li>
                        )) || (
                          <li className="text-sm text-muted-foreground italic">
                            Подсказки для этого вопроса ещё не добавлены
                          </li>
                        )}
                      </ul>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Options */}
        {question.options && (
          <RadioGroup
            value={selectedAnswer}
            onValueChange={setSelectedAnswer}
            disabled={isAnswered}
            className="space-y-3"
          >
            {question.options.map((option) => {
              const isSelected = selectedAnswer === option.id;
              const isCorrectOption = option.id === question.correctAnswer;
              const showCorrect = isAnswered && isCorrectOption;
              const showWrong = isAnswered && isSelected && !isCorrect;
              
              return (
                <div
                  key={option.id}
                  className={`flex items-center space-x-3 p-4 sm:p-5 rounded-xl border-2 transition-all duration-200 ${
                    showCorrect
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : showWrong
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/30 hover:bg-muted/50'
                  }`}
                >
                  <RadioGroupItem
                    value={option.id}
                    id={option.id}
                    className="sr-only"
                  />
                  <Label
                    htmlFor={option.id}
                    className="flex-1 flex items-center gap-3 cursor-pointer"
                  >
                    <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted font-semibold text-sm shrink-0">
                      {option.id.toUpperCase()}
                    </span>
                    {/* Вариант ответа с поддержкой формул KaTeX */}
                    <span className="flex-1 text-base">
                      <MathFormula formula={option.text} inline />
                    </span>
                    {showCorrect && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    {showWrong && (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        )}
        
        {/* АНИМАЦИЯ СТАТИСТИКИ ОТВЕТОВ */}
        <AnimatePresence>
          {showStats && answerStats && question.options && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-muted/50 rounded-xl p-4 space-y-3"
            >
              <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Как ответили другие пользователи:
              </h4>
              <div className="space-y-2">
                {question.options.map((option) => {
                  const stat = answerStats[option.id] || 0;
                  const total = Object.values(answerStats).reduce((a, b) => a + b, 0);
                  const percentage = total > 0 ? Math.round((stat / total) * 100) : 0;
                  const isCorrectOption = option.id === question.correctAnswer;
                  
                  return (
                    <div key={option.id} className="relative">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="flex items-center gap-2">
                          <span className="font-medium">{option.id.toUpperCase()}:</span>
                          {isCorrectOption && <Check className="w-3 h-3 text-green-500" />}
                        </span>
                        <span className="text-muted-foreground">{percentage}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className={`h-full rounded-full ${
                            isCorrectOption 
                              ? 'bg-green-500' 
                              : 'bg-primary/60'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Text Input for TEXT_INPUT type */}
        {question.type === 'TEXT_INPUT' && !isAnswered && (
          <div className="space-y-3">
            <input
              type="text"
              value={selectedAnswer}
              onChange={(e) => setSelectedAnswer(e.target.value)}
              placeholder="Введите ваш ответ..."
              className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
            />
          </div>
        )}
        
        {/* Actions */}
        {!isAnswered ? (
          <Button
            onClick={handleCheck}
            disabled={!selectedAnswer}
            className="w-full"
            size="lg"
          >
            Проверить ответ
          </Button>
        ) : (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              {/* Result */}
              <div
                className={`p-4 rounded-xl flex items-center gap-3 ${
                  isCorrect
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                }`}
              >
                {isCorrect ? (
                  <>
                    <CheckCircle className="w-6 h-6" />
                    <div>
                      <p className="font-semibold">Правильно!</p>
                      <p className="text-sm opacity-80">
                        Отличная работа, так держать!
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="w-6 h-6" />
                    <div>
                      <p className="font-semibold">Неправильно</p>
                      <p className="text-sm opacity-80">
                        Правильный ответ: {question.correctAnswer}
                      </p>
                    </div>
                  </>
                )}
              </div>
              
              {/* ================================================= */}
              {/* ОБЪЯСНЕНИЕ С ПОДДЕРЖКОЙ ФОРМУЛ KATEX               */}
              {/* ================================================= */}
              <div className="p-4 rounded-xl bg-muted/50 space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <HelpCircle className="w-5 h-5" />
                  Объяснение
                </h4>
                {/* Объяснение с формулами */}
                <div className="text-muted-foreground">
                  <MathFormula formula={question.explanation || 'Объяснение пока не добавлено'} />
                </div>
                
                {/* Подробное решение (если есть) */}
                {question.solution && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <h4 className="font-semibold mb-2">Решение:</h4>
                    {/* Решение с формулами - используем моноширинный шрифт для структуры */}
                    <div className="text-muted-foreground font-mono text-sm bg-muted p-3 rounded-lg overflow-x-auto">
                      <MathFormula formula={question.solution} />
                    </div>
                  </div>
                )}
              </div>

              {/* ================================================= */}
              {/* ВИДЕО-РАЗБОР (встроенный YouTube плеер)            */}
              {/* ================================================= */}
              {question.videoExplanationUrl && (
                <YouTubePlayer
                  videoUrl={question.videoExplanationUrl}
                  title="Видео-разбор задания"
                />
              )}
              
              {/* Next Button */}
              <Button onClick={handleNext} className="w-full" size="lg">
                Следующее задание
              </Button>
            </motion.div>
          </AnimatePresence>
        )}
        
        {/* ================================================= */}
        {/* СТАТИСТИКА ВОПРОСА (реальные данные из БД)         */}
        {/* ================================================= */}
        <div className="flex items-center justify-between pt-4 border-t border-border text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            {/* Процент правильных ответов */}
            <span className="flex items-center gap-1" title="Процент правильных ответов">
              <TrendingUp className="w-4 h-4" />
              {correctPercentage}% решают верно
            </span>
            {/* Среднее время решения */}
            <span className="flex items-center gap-1" title="Среднее время решения">
              <Clock className="w-4 h-4" />
              ~{avgTime} сек
            </span>
          </div>
          {/* Общее количество решений */}
          <span>{question.timesSolved} решений</span>
        </div>
      </CardContent>
    </Card>
  );
});
