/**
 * png.ts — минимальный PNG-энкодер без внешних зависимостей.
 *
 * Render-окружение не содержит `canvas`/`sharp`, а ставить их ради месячного
 * снимка полотна нерационально. Здесь — кодирование RGB (8 бит, color type 2)
 * через встроенный zlib: сигнатура + IHDR + IDAT (deflate) + IEND, с CRC-32.
 */
import { deflateSync } from 'zlib';

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

/** Кодирует RGB-буфер (длина width*height*3) в PNG. Возвращает Buffer. */
export function encodePNG(width: number, height: number, rgb: Uint8Array): Buffer {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type 2 = truecolor RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Сырые данные: на каждую строку байт фильтра (0 = None) + RGB-пиксели.
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0;
    for (let i = 0; i < stride; i++) raw[rowStart + 1 + i] = rgb[y * stride + i];
  }
  const idat = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** PNG как data-URL (base64) — для хранения в БД. */
export function encodePNGDataUrl(width: number, height: number, rgb: Uint8Array): string {
  return 'data:image/png;base64,' + encodePNG(width, height, rgb).toString('base64');
}
