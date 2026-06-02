/**
 * Загрузка и смена аватара профиля.
 *
 * Картинка уменьшается прямо в браузере (canvas → квадрат 256×256, center-crop)
 * и кодируется в data URL (base64). Это надёжно для текущей архитектуры:
 * строка сохраняется в поле `users.image` (PostgreSQL/Neon) обычным PATCH
 * /users/me и переживает рестарты сервера (в отличие от файлов на диске Render).
 *
 * Компонент только формирует data URL и отдаёт его через `onChange` —
 * фактическое сохранение делает родитель (ProfilePage) при нажатии «Сохранить».
 * Так работает live-preview до сохранения.
 */
import { useRef, useState } from 'react';
import { Camera, Trash2, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const OUTPUT_SIZE = 256; // px — итоговая сторона квадратного аватара
const MAX_INPUT_BYTES = 8 * 1024 * 1024; // 8 МБ на исходный файл

interface AvatarUploadProps {
  /** Текущее изображение: data URL, http(s)-ссылка или пусто. */
  value?: string;
  /** Буква(ы) для fallback-аватара, если изображения нет. */
  fallback: string;
  /** Вызывается с новым data URL (или '' при удалении). */
  onChange: (dataUrl: string) => void;
  /** Размер отображаемого кружка в px (по умолчанию 96). */
  displaySize?: number;
  disabled?: boolean;
}

/** Рисует файл-картинку на квадратный canvas (cover, центр) и возвращает JPEG data URL. */
function fileToSquareDataUrl(file: File, size: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Не удалось обработать изображение'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas недоступен'));

        // cover: масштабируем по меньшей стороне, центрируем, обрезаем квадратом
        const scale = Math.max(size / img.width, size / img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        const dx = (size - drawW) / 2;
        const dy = (size - drawH) / 2;
        // Белый фон под картинкой — чтобы прозрачные PNG не давали чёрных углов в JPEG
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, dx, dy, drawW, drawH);

        // JPEG даёт компактную строку; прозрачность для аватара не нужна
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function AvatarUpload({ value, fallback, onChange, displaySize = 96, disabled }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Выберите файл изображения');
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      setError('Файл слишком большой (макс. 8 МБ)');
      return;
    }
    setProcessing(true);
    try {
      const dataUrl = await fileToSquareDataUrl(file, OUTPUT_SIZE);
      onChange(dataUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка обработки');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: displaySize, height: displaySize }}>
        <Avatar className="w-full h-full" style={{ width: displaySize, height: displaySize }}>
          <AvatarImage src={value || ''} alt="Аватар" className="object-cover" />
          <AvatarFallback className="bg-primary/10 text-primary font-bold" style={{ fontSize: displaySize / 2.6 }}>
            {fallback}
          </AvatarFallback>
        </Avatar>

        {/* Кнопка выбора файла поверх аватара */}
        <button
          type="button"
          disabled={disabled || processing}
          onClick={() => inputRef.current?.click()}
          title="Сменить аватар"
          className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-md ring-2 ring-background hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
        </button>

        {/* Кнопка удаления — только если есть изображение */}
        {value && !processing && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => { setError(null); onChange(''); }}
            title="Удалить аватар"
            className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center shadow ring-2 ring-background hover:bg-destructive/90 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ''; }}
      />

      <button
        type="button"
        disabled={disabled || processing}
        onClick={() => inputRef.current?.click()}
        className="text-xs text-primary hover:underline disabled:opacity-60"
      >
        {value ? 'Сменить фото' : 'Загрузить фото'}
      </button>

      {error && <p className="text-xs text-destructive text-center max-w-[180px]">{error}</p>}
    </div>
  );
}

export default AvatarUpload;
