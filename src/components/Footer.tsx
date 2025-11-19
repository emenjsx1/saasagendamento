import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Linkedin, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const institutionalLinks = [
    { name: 'Sobre Nós', href: '#about' },
    { name: 'Suporte', href: '#support' },
    { name: 'Política de Privacidade', href: '#' },
    { name: 'Termos de Serviço', href: '#' },
  ];

  const socialLinks = [
    { icon: Facebook, href: '#' },
    { icon: Instagram, href: '#' },
    { icon: Linkedin, href: '#' },
  ];

  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="container mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
        {/* Coluna 1: Logo e Contato */}
        <div className="col-span-2 md:col-span-1 space-y-4">
          <h3 className="text-2xl font-bold text-primary-foreground">Agendamento SaaS</h3>
          <p className="text-sm text-gray-400">Simplifique a gestão do seu negócio.</p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center">
              <Mail className="h-4 w-4 mr-2 text-primary-foreground" />
              <a href="mailto:suporte@exemplo.com" className="hover:text-primary transition-colors">suporte@exemplo.com</a>
            </div>
            <div className="flex items-center">
              <Phone className="h-4 w-4 mr-2 text-primary-foreground" />
              <span className="text-gray-400">+258 123 456 789</span>
            </div>
          </div>
        </div>

        {/* Coluna 2: Links Institucionais */}
        <div className="space-y-4">
          <h4 className="font-semibold text-lg border-b border-gray-700 pb-2">Institucional</h4>
          <ul className="space-y-2 text-sm">
            {institutionalLinks.map((link) => (
              <li key={link.name}>
                <a href={link.href} className="text-gray-400 hover:text-primary transition-colors">
                  {link.name}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Coluna 3: Redes Sociais */}
        <div className="space-y-4">
          <h4 className="font-semibold text-lg border-b border-gray-700 pb-2">Siga-nos</h4>
          <div className="flex space-x-4">
            {socialLinks.map((link, index) => (
              <a key={index} href={link.href} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary transition-colors">
                <link.icon className="h-6 w-6" />
              </a>
            ))}
          </div>
        </div>
        
        {/* Coluna 4: Newsletter (Placeholder) */}
        <div className="space-y-4 col-span-2 md:col-span-1">
          <h4 className="font-semibold text-lg border-b border-gray-700 pb-2">Fique Atualizado</h4>
          <p className="text-sm text-gray-400">Receba novidades e dicas de gestão.</p>
          {/* Placeholder for a simple newsletter form */}
          <div className="flex space-x-2">
            <input 
              type="email" 
              placeholder="Seu e-mail" 
              className="flex-grow p-2 rounded-md text-gray-900 text-sm"
            />
            <Button variant="secondary" size="sm">Assinar</Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-8 border-t border-gray-700 pt-6 text-center">
        <p className="text-sm text-gray-500">&copy; {currentYear} Agendamento SaaS. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
};

export default Footer;