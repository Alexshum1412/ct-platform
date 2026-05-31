import { useEffect, useState } from 'react';
import { SubjectCard } from './SubjectCard';
import { subjects as staticSubjects } from '@/data/subjects';
import { apiClient } from '@/lib/api/client';
import type { Subject } from '@/types';

interface SubjectGridProps {
  onSubjectClick?: (subject: Subject) => void;
}

interface ApiSubject {
  id: string;
  slug: string;
  stats: { questionsCount: number; topicsCount: number; rating: number };
}

export function SubjectGrid({ onSubjectClick }: SubjectGridProps) {
  const [apiData, setApiData] = useState<Record<string, ApiSubject['stats']>>({});

  useEffect(() => {
    void apiClient('/subjects').then((res) => {
      if (res.data) {
        const items = (res.data as { subjects: ApiSubject[] }).subjects ?? [];
        const map: Record<string, ApiSubject['stats']> = {};
        for (const s of items) map[s.slug] = s.stats;
        setApiData(map);
      }
    });
  }, []);

  // Merge real stats into static subjects
  const subjects = staticSubjects.map(s => {
    const live = apiData[s.slug];
    if (live) return { ...s, stats: live };
    return s;
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-7">
      {subjects.map((subject, index) => (
        <SubjectCard
          key={subject.id}
          subject={subject}
          index={index}
          onClick={() => onSubjectClick?.(subject)}
        />
      ))}
    </div>
  );
}
