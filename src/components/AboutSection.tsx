import React from 'react';
import { Briefcase, Users, Heart } from 'lucide-react';

const AboutSection: React.FC = () => {
  return (
    <section id="about" className="py-16 md:py-24 bg-white relative overflow-hidden">
      {/* Grid pattern sutil */}
      <div className="absolute inset-0 grid-pattern opacity-20"></div>
      
      <div className="container mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
        
        {/* Imagem/Placeholder */}
        <div className="relative h-80 bg-black/5 rounded-2xl shadow-lg overflow-hidden border border-black/10">
          <img 
            src="/placeholder.svg" 
            alt="Sobre a Plataforma" 
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Briefcase className="h-16 w-16 text-black/30" />
          </div>
        </div>

        {/* Texto */}
        <div className="space-y-6">
          <h2 className="text-base font-semibold text-black uppercase tracking-wider">Nossa Missão</h2>
          <h3 className="text-4xl font-bold text-black">Soluções simples para seu negócio crescer.</h3>
          <p className="text-lg text-gray-600">
            Nós somos uma plataforma desenvolvida para ajudar pequenos negócios a otimizar o processo de agendamento e gerenciamento de clientes. Nosso objetivo é simplificar a vida dos donos de negócios, oferecendo uma solução intuitiva e eficiente.
          </p>
          <p className="text-md text-gray-600 border-l-4 border-black pl-4 italic">
            Temos uma equipe dedicada, focada em fornecer atendimento personalizado para garantir que você aproveite ao máximo todas as funcionalidades da plataforma.
          </p>
          
          <div className="flex space-x-6 pt-4">
            <div className="flex items-center text-black">
              <Users className="h-6 w-6 mr-2" />
              <span className="font-medium">Foco no Cliente</span>
            </div>
            <div className="flex items-center text-black">
              <Heart className="h-6 w-6 mr-2" />
              <span className="font-medium">Suporte Dedicado</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;