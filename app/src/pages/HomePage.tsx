import { useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { HeroSection } from '@/sections/HeroSection';
import { SubjectsSection } from '@/sections/SubjectsSection';
import { FeaturesSection } from '@/sections/FeaturesSection';
import { HowItWorksSection } from '@/sections/HowItWorksSection';
import { PremiumSection } from '@/sections/PremiumSection';
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
      <FeaturesSection />
      <HowItWorksSection />
      <PremiumSection />
      <CTASection onStartLearning={scrollToSubjects} />
      <FooterSection />
    </div>
  );
}
