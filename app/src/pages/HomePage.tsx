import { useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { HeroSection } from '@/sections/HeroSection';
import { ScenariosSection } from '@/sections/ScenariosSection';
import { SubjectsSection } from '@/sections/SubjectsSection';
import { OlympiadSection } from '@/sections/OlympiadSection';
import { PremiumSection } from '@/sections/PremiumSection';
import { CTASection } from '@/sections/CTASection';
import { FooterSection } from '@/sections/FooterSection';
import type { Subject } from '@/types';

/**
 * Главная. Порядок секций — путь пользователя:
 * Hero (обещание) → Сценарии (что умеет платформа) → Предметы (каталог) →
 * Premium (монетизация после каталога) → Олимпиады (отдельный трек) →
 * CTA → Footer. Generic-секции Features/HowItWorks заменены ScenariosSection.
 */
export function HomePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const subjectsRef = useRef<HTMLDivElement>(null);

  const scrollToSubjects = () => {
    subjectsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    if (params.get('scroll') === 'subjects') {
      setTimeout(() => subjectsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [params]);

  const handleSubjectClick = (subject: Subject) => {
    navigate(`/subject/${subject.slug}`);
  };

  return (
    <div className="min-h-screen">
      <HeroSection onStartLearning={scrollToSubjects} />
      <ScenariosSection />
      <div ref={subjectsRef} id="subjects-section">
        <SubjectsSection onSubjectClick={handleSubjectClick} />
      </div>
      <PremiumSection />
      <OlympiadSection />
      <CTASection onStartLearning={scrollToSubjects} />
      <FooterSection />
    </div>
  );
}
