import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SupportSection from '@/components/SupportSection';
import { MadeWithDyad } from '@/components/made-with-dyad';

const SupportPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        {/* Reutilizando o componente SupportSection, mas sem o ID de âncora */}
        <SupportSection />
      </main>
      <Footer />
      <MadeWithDyad />
    </div>
  );
};

export default SupportPage;