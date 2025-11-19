import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ContactSection from '@/components/ContactSection';
import { MadeWithDyad } from '@/components/made-with-dyad';

const ContactPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        {/* Reutilizando o componente ContactSection, mas sem o ID de âncora */}
        <ContactSection />
      </main>
      <Footer />
      <MadeWithDyad />
    </div>
  );
};

export default ContactPage;