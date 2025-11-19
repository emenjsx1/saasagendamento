import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AboutSection from '@/components/AboutSection';

const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        {/* Reutilizando o componente AboutSection, mas sem o ID de âncora */}
        <section className="py-16 md:py-24 bg-white">
          <div className="container mx-auto px-4">
            <AboutSection />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default AboutPage;