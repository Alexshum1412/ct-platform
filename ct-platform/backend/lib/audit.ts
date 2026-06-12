import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Запись в журнал действий администратора.
 * Никогда не валит основную операцию: все ошибки логируются и глотаются.
 * oldValue/newValue усечены, чтобы один лог не раздувал таблицу.
 */

const MAX_VALUE_LENGTH = 8000;
// Retention: записи старше 12 месяцев чистятся лениво (~1% вызовов logAudit),
// чтобы таблица не росла бесконечно без отдельного крона.
const RETENTION_MS = 365 * 24 * 60 * 60 * 1000;
const CLEANUP_PROBABILITY = 0.01;

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'BULK_UPDATE'
  | 'BULK_DELETE'
  | 'APPROVE'
  | 'REJECT';

export interface AuditEntry {
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  /** короткое человекочитаемое описание («Удалён вопрос „…“») */
  summary?: string;
  oldValue?: unknown;
  newValue?: unknown;
}

function clip(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  try {
    const s = typeof value === 'string' ? value : JSON.stringify(value);
    return s.length > MAX_VALUE_LENGTH ? `${s.slice(0, MAX_VALUE_LENGTH)}…` : s;
  } catch {
    return null;
  }
}

export async function logAudit(req: NextRequest, entry: AuditEntry): Promise<void> {
  try {
    const actorId = req.headers.get('x-user-id');
    const ip =
      (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      null;
    const userAgent = req.headers.get('user-agent')?.slice(0, 300) ?? null;

    let actorEmail: string | null = null;
    if (actorId) {
      const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { email: true } });
      actorEmail = actor?.email ?? null;
    }

    await prisma.auditLog.create({
      data: {
        actorId,
        actorEmail,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        summary: entry.summary?.slice(0, 500) ?? null,
        oldValue: clip(entry.oldValue),
        newValue: clip(entry.newValue),
        ip,
        userAgent,
      },
    });

    if (Math.random() < CLEANUP_PROBABILITY) {
      const cutoff = new Date(Date.now() - RETENTION_MS);
      await prisma.auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
    }
  } catch (error) {
    console.error('Audit log write failed:', error);
  }
}
