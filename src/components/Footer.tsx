import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Linkedin, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const institutionalLinks = [
    { name: 'Sobre Nós', href: '/about' },
    { name: 'Suporte', href: '/support' },
    { name: 'Política de Privacidade', href: '#' },
    { name: 'Termos de Serviço', href: '#' },
  ];

  const socialLinks = [
    { icon: Facebook, href: '#' },
    { icon: Instagram, href: '#' },
    { icon: Linkedin, href: '#' },
  ];

  return (
    <footer className="relative bg-black text-white py-12 border-t border-white/10 overflow-hidden">
      {/* Grid pattern */}
      <div className="absolute inset-0 grid-pattern-dark opacity-10"></div>
      
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
        {/* Coluna 1: Logo e Contato */}
        <div className="text-center md:text-left space-y-4">
          <h3 className="text-3xl font-extrabold tracking-wider text-white">
            AgenCode
          </h3>
          <p className="text-sm text-gray-400">A próxima geração em gestão de agendamentos.</p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-center md:justify-start group">
              <Mail className="h-4 w-4 mr-2 text-white group-hover:opacity-80 transition-opacity" />
              <a href="mailto:suporte@exemplo.com" className="text-gray-400 hover:text-white transition-colors">
                suporte@exemplo.com
              </a>
            </div>
            <div className="flex items-center justify-center md:justify-start group">
              <Phone className="h-4 w-4 mr-2 text-white group-hover:opacity-80 transition-opacity" />
              <span className="text-gray-400">+258 123 456 789</span>
            </div>
          </div>
        </div>

        {/* Coluna 2: Links Institucionais */}
        <div className="text-center md:text-left space-y-4">
          <h4 className="font-semibold text-lg border-b border-white/20 pb-2 text-white">
            Institucional
          </h4>
          <ul className="space-y-2 text-sm">
            {institutionalLinks.map((link) => (
              <li key={link.name}>
                <Link 
                  to={link.href} 
                  className="text-gray-400 hover:text-white transition-colors duration-300 relative group inline-block"
                >
                  {link.name}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white group-hover:w-full transition-all duration-300"></span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Coluna 3: Redes Sociais */}
        <div className="space-y-4">
          <h4 className="font-semibold text-lg border-b border-white/20 pb-2 text-white text-center md:text-left">
            Siga-nos
          </h4>
          <div className="flex space-x-4 justify-center md:justify-start">
            {socialLinks.map((link, index) => (
              <a 
                key={index} 
                href={link.href} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="relative p-3 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300 transform hover:scale-110"
              >
                <link.icon className="h-5 w-5" />
              </a>
            ))}
          </div>
        </div>
        
        {/* Coluna 4: Newsletter */}
        <div className="space-y-4">
          <h4 className="font-semibold text-lg border-b border-white/20 pb-2 text-white text-center md:text-left">
            Fique Atualizado
          </h4>
          <p className="text-sm text-gray-400 text-center md:text-left">Receba novidades e dicas de gestão.</p>
          <div className="flex space-x-2">
            <input 
              type="email" 
              placeholder="Seu e-mail" 
              className="flex-grow p-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:ring-2 focus:ring-white/50 focus:border-white/30 transition-all"
            />
            <Button 
              variant="default" 
              size="sm" 
              className="bg-white text-black hover:bg-white/90 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Assinar
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-8 border-t border-white/10 pt-6 pb-4 relative z-10">
        <div className="text-center">
          <p className="text-sm text-gray-400">
            &copy; {currentYear} <span className="text-white font-semibold">AgenCode</span>. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;