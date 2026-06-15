import { useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { HeroSection } from '@/sections/HeroSection';
import { SubjectsSection } from '@/sections/SubjectsSection';
import { FeaturesSection } from '@/sections/FeaturesSection';
import { OlympiadSection } from '@/sections/OlympiadSection';
import { HowItWorksSection } from '@/sections/HowItWorksSection';
import { PremiumSection } from '@/sections/PremiumSection';
import { NewsSection } from '@/sections/NewsSection';
import { CTASection } from '@/sections/CTASection';
import { FooterSection } from '@/sections/FooterSection';
import type { Subject } from '@/types';

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
      <div ref={subjectsRef} id="subjects-section">
        <SubjectsSection onSubjectClick={handleSubjectClick} />
      </div>
      {/* Premium сразу после каталога предметов — главная точка монетизации */}
      <PremiumSection />
      {/* Новостная лента — сразу после блока Premium */}
      <NewsSection />
      <FeaturesSection />
      <OlympiadSection />
      <HowItWorksSection />
      <CTASection onStartLearning={scrollToSubjects} />
      <FooterSection />
    </div>
  );
}
