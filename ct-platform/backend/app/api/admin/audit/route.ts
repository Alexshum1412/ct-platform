import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/audit — журнал действий администратора.
 * Фильтры: entity, action, actor (подстрока email), q (поиск по summary/entityId),
 * from/to (ISO-даты). Пагинация limit/offset. format=csv — экспорт.
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const entity = sp.get('entity') ?? '';
    const action = sp.get('action') ?? '';
    const actor = sp.get('actor') ?? '';
    const q = sp.get('q') ?? '';
    const from = sp.get('from') ?? '';
    const to = sp.get('to') ?? '';
    const format = sp.get('format') ?? '';

    const rawLimit = Number(sp.get('limit'));
    const rawOffset = Number(sp.get('offset'));
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), format === 'csv' ? 5000 : 100) : 50;
    const offset = Number.isFinite(rawOffset) ? Math.max(Math.trunc(rawOffset), 0) : 0;

    const where: Record<string, unknown> = {};
    if (entity) where.entity = entity;
    if (action) where.action = action;
    if (actor) where.actorEmail = { contains: actor, mode: 'insensitive' };
    if (q) {
      where.OR = [
        { summary: { contains: q, mode: 'insensitive' } },
        { entityId: { contains: q } },
      ];
    }
    const createdAt: Record<string, Date> = {};
    if (from) {
      const d = new Date(from);
      if (!Number.isNaN(d.getTime())) createdAt.gte = d;
    }
    if (to) {
      const d = new Date(to);
      if (!Number.isNaN(d.getTime())) {
        d.setHours(23, 59, 59, 999);
        createdAt.lte = d;
      }
    }
    if (Object.keys(createdAt).length > 0) where.createdAt = createdAt;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit, skip: offset }),
      prisma.auditLog.count({ where }),
    ]);

    if (format === 'csv') {
      const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const header = 'createdAt,actorEmail,action,entity,entityId,summary,ip,oldValue,newValue';
      const rows = logs.map(l =>
        [l.createdAt.toISOString(), l.actorEmail, l.action, l.entity, l.entityId, l.summary, l.ip, l.oldValue, l.newValue]
          .map(esc).join(','),
      );
      return new NextResponse('﻿' + [header, ...rows].join('\r\n'), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    // фасеты для селектов фильтров
    const [entities, actions] = await Promise.all([
      prisma.auditLog.findMany({ distinct: ['entity'], select: { entity: true }, orderBy: { entity: 'asc' } }),
      prisma.auditLog.findMany({ distinct: ['action'], select: { action: true }, orderBy: { action: 'asc' } }),
    ]);

    return NextResponse.json({
      logs,
      total,
      limit,
      offset,
      facets: { entities: entities.map(e => e.entity), actions: actions.map(a => a.action) },
    });
  } catch (error) {
    console.error('Audit log list error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
