import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/useAppStore';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
}

export function ImageUpload({ value, onChange, label = 'Изображение' }: ImageUploadProps) {
  const { token } = useAppStore();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const API = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api';
      const r = await fetch(`${API}/admin/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await r.json();
      if (!r.ok) {
        setError(data.error || 'Ошибка загрузки');
      } else {
        onChange(data.url);
      }
    } catch {
      setError('Не удалось загрузить файл');
    }
    setUploading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleUpload(file);
  };

  const imgUrl = value && (value.startsWith('http') ? value : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${value}`);

  return (
    <div>
      <label className="text-sm font-medium mb-1.5 block">{label}</label>

      {value ? (
        <div className="relative inline-block">
          <img src={imgUrl} alt="Preview" className="max-h-48 rounded-lg border border-border" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-white rounded-full flex items-center justify-center hover:bg-destructive/90"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors ${
            dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          }`}
        >
          <div className="flex flex-col items-center gap-2 text-center">
            {uploading ? (
              <>
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Загрузка...</p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">Перетащите файл или нажмите для выбора</p>
                <p className="text-xs text-muted-foreground">PNG, JPG, WebP, SVG · до 5 МБ</p>
              </>
            )}
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {error && (
        <p className="text-sm text-destructive mt-2">{error}</p>
      )}

      {!value && !uploading && (
        <div className="mt-2">
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            <Upload className="w-3 h-3 mr-1" />Выбрать файл
          </Button>
        </div>
      )}
    </div>
  );
}
