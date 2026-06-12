# Миграции

`20260612000000_baseline_full_schema` — полная baseline-миграция, сгенерированная
из актуальной схемы 12.06.2026 (`prisma migrate diff --from-empty`). Она заменила
устаревшую `0_init`, которая отставала от схемы (развитие шло через `db push`).

- **Свежая база:** `npx prisma migrate deploy` создаёт всю схему одной миграцией.
- **Прод (Neon):** baseline помечена применённой через `migrate resolve --applied`.
  В `_prisma_migrations` осталась запись старой `0_init` — предупреждение
  «applied but missing locally» от `migrate deploy` ожидаемо и безвредно.
- **Дальнейшие изменения схемы:** добавляйте обычные миграции поверх baseline
  (`prisma migrate dev` локально / `migrate deploy` на проде) либо продолжайте
  `db push` + периодическую регенерацию baseline — но не смешивайте подходы
  в одном релизе.
