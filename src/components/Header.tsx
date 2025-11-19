import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import CurrencySelector from './CurrencySelector';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';

const navItems = [
  { name_pt: 'Home', name_en: 'Home', href: '/' },
  { name_pt: 'Sobre', name_en: 'About', href: '/about', isAnchor: false },
  { name_pt: 'Preços', name_en: 'Pricing', href: '/#pricing', isAnchor: true },
  { name_pt: 'Suporte', name_en: 'Support', href: '/support', isAnchor: false },
  { name_pt: 'Contato', name_en: 'Contact', href: '/contact', isAnchor: false },
];

const Header: React.FC = () => {
  const { T } = useCurrency();
  
  const loginText = T('Login / Painel', 'Login / Dashboard');
  const startText = T('Começar Agora', 'Start Now');

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/95 backdrop-blur-md transition-shadow duration-300 shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <Link to="/" className="text-2xl font-extrabold text-primary tracking-wider">
          AGENCODES
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          {navItems.map((item) => (
            item.isAnchor ? (
              <a 
                key={item.name_pt}
                href={item.href}
                className="text-sm font-medium text-gray-600 hover:text-primary transition-colors relative group"
              >
                {T(item.name_pt, item.name_en)}
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></span>
              </a>
            ) : (
              <Link 
                key={item.name_pt}
                to={item.href}
                className="text-sm font-medium text-gray-600 hover:text-primary transition-colors relative group"
              >
                {T(item.name_pt, item.name_en)}
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></span>
              </Link>
            )
          ))}
          <CurrencySelector />
          <Button asChild className="shadow-md hover:shadow-lg transition-all duration-300">
            <Link to="/login">{loginText}</Link>
          </Button>
        </nav>

        {/* Mobile Navigation */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="outline" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <div className="flex flex-col space-y-4 pt-6">
              <CurrencySelector />
              {navItems.map((item) => (
                item.isAnchor ? (
                  <a 
                    key={item.name_pt}
                    href={item.href}
                    className="text-lg font-medium text-gray-700 hover:text-primary"
                  >
                    {T(item.name_pt, item.name_en)}
                  </a>
                ) : (
                  <Link 
                    key={item.name_pt}
                    to={item.href}
                    className="text-lg font-medium text-gray-700 hover:text-primary"
                  >
                    {T(item.name_pt, item.name_en)}
                  </Link>
                )
              ))}
              <Button asChild className="mt-4">
                <Link to="/login">{startText}</Link>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};

export default Header;