// Link questions to subtopics based on keyword/section matching
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function score(qContent, qSection, qTags, subtopicName) {
  const haystack = `${qContent || ''} ${qSection || ''} ${qTags || ''}`.toLowerCase();
  const subWords = subtopicName.toLowerCase().split(/[\s,.:()«»\/—\-]+/).filter(w => w.length > 3);
  let s = 0;
  for (const w of subWords) if (haystack.includes(w)) s++;
  return s;
}

async function main() {
  console.log('🔗 Привязываю задания к подтемам...');

  const questions = await prisma.question.findMany({
    where: { subtopicId: null, topicId: { not: null } },
    select: { id: true, topicId: true, content: true, section: true, tags: true },
  });

  // Group by topic for efficient subtopic lookup
  const topicIds = [...new Set(questions.map(q => q.topicId))];
  const subtopicsByTopic = {};
  for (const tid of topicIds) {
    const subs = await prisma.subtopic.findMany({ where: { topicId: tid } });
    subtopicsByTopic[tid] = subs;
  }

  let linked = 0;
  let bestMatched = 0;

  for (const q of questions) {
    const subs = subtopicsByTopic[q.topicId] ?? [];
    if (subs.length === 0) continue;

    let best = null;
    let bestScore = 0;
    for (const sub of subs) {
      const sc = score(q.content, q.section, q.tags, sub.name);
      if (sc > bestScore) { bestScore = sc; best = sub; }
    }

    // If no strong match, distribute round-robin to balance counts
    if (bestScore >= 1 && best) {
      await prisma.question.update({ where: { id: q.id }, data: { subtopicId: best.id } });
      bestMatched++;
    } else {
      // Round-robin: pick subtopic with fewest questions
      const counts = await Promise.all(
        subs.map(s => prisma.question.count({ where: { subtopicId: s.id } }))
      );
      const minIdx = counts.indexOf(Math.min(...counts));
      const fallback = subs[minIdx];
      await prisma.question.update({ where: { id: q.id }, data: { subtopicId: fallback.id } });
    }
    linked++;
  }

  console.log(`✅ Привязано ${linked} заданий (${bestMatched} по тексту, остальные распределены)`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
