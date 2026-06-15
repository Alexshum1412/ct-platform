/**
 * Конвертирует выбранный файл изображения в сжатый base64 data URL.
 * Хранится прямо в БД (как аватары) — устойчиво к эфемерной ФС Render.
 * Ресайз до maxW по ширине, JPEG q≈0.82.
 */
export function imageToDataUrl(file: File, maxW = 1200, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) { reject(new Error('Не изображение')); return; }
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => { img.src = reader.result as string; };
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas недоступен')); return; }
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Битое изображение'));
    reader.readAsDataURL(file);
  });
}
