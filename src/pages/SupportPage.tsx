import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SupportSection from '@/components/SupportSection';

const SupportPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        {/* Reutilizando o componente SupportSection, mas sem o ID de âncora */}
        <SupportSection />
      </main>
      <Footer />
    </div>
  );
};

export default SupportPage;