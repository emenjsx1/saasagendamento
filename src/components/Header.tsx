import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, Globe, ChevronDown } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import CurrencySelector from './CurrencySelector';
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navItems = [
  { name_pt: 'Home', name_en: 'Home', href: '/' },
  { name_pt: 'Sobre', name_en: 'About', href: '/about', isAnchor: false },
  { name_pt: 'Preços', name_en: 'Pricing', href: '/#pricing', isAnchor: true },
  { name_pt: 'Suporte', name_en: 'Support', href: '/support', isAnchor: false },
  { name_pt: 'Contato', name_en: 'Contact', href: '/contact', isAnchor: false },
];

const Header: React.FC = () => {
  const { T } = useCurrency();
  
  const loginText = T('Log In', 'Log In');
  const startText = T('Começar Agora', 'Get Started');
  const talkToSales = T('Falar com Vendas', 'Talk to Sales');

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200">
      {/* Top Row - Utility Navigation (Visible on Mobile and Desktop) */}
      <div className="border-b border-gray-200 bg-gray-50/50">
        <div className="container mx-auto flex h-9 items-center justify-between px-3 sm:px-4 md:px-6">
          {/* Language Selector - Left side */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium">
                <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500" />
                <span>{T('Português', 'English')}</span>
                <ChevronDown className="h-3 w-3 text-gray-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <div className="p-2">
                <CurrencySelector />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Talk to Sales - Right side */}
          <Link 
            to="/contact" 
            className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium"
          >
            {talkToSales}
          </Link>
        </div>
      </div>

      {/* Bottom Row - Main Navigation */}
      <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4 md:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity flex-shrink-0">
          <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-base">A</span>
          </div>
          <span className="text-xl sm:text-2xl font-semibold text-black tracking-tight hidden sm:inline">
            AgenCode
          </span>
        </Link>

        {/* Desktop Navigation - Links (Centered) */}
        <nav className="hidden lg:flex items-center gap-8 absolute left-1/2 transform -translate-x-1/2">
          {navItems.map((item) => (
            item.isAnchor ? (
              <a 
                key={item.name_pt}
                href={item.href}
                className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors whitespace-nowrap"
              >
                {T(item.name_pt, item.name_en)}
              </a>
            ) : (
              <Link 
                key={item.name_pt}
                to={item.href}
                className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors whitespace-nowrap"
              >
                {T(item.name_pt, item.name_en)}
              </Link>
            )
          ))}
        </nav>

        {/* Desktop Navigation - Actions */}
        <div className="hidden lg:flex items-center gap-4 ml-auto flex-shrink-0">
          <Link 
            to="/login" 
            className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors whitespace-nowrap"
          >
            {loginText}
          </Link>
          <Button 
            asChild 
            className="bg-black hover:bg-gray-900 text-white px-6 py-2 rounded-lg font-medium shadow-sm hover:shadow-md transition-all whitespace-nowrap"
          >
            <Link to="/register">
              {startText}
            </Link>
          </Button>
        </div>

        {/* Mobile Navigation */}
        <div className="flex lg:hidden items-center gap-2 ml-auto">
          <Button 
            asChild 
            className="bg-black hover:bg-gray-900 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium shadow-sm whitespace-nowrap"
          >
            <Link to="/register">
              {startText}
            </Link>
          </Button>
          
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 p-0">
                <Menu className="h-5 w-5 text-gray-700" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <div className="flex flex-col space-y-6 pt-8">
                {/* Mobile Menu Links */}
                {navItems.map((item) => (
                  item.isAnchor ? (
                    <a 
                      key={item.name_pt}
                      href={item.href}
                      className="text-base font-medium text-gray-700 hover:text-gray-900 transition-colors"
                    >
                      {T(item.name_pt, item.name_en)}
                    </a>
                  ) : (
                    <Link 
                      key={item.name_pt}
                      to={item.href}
                      className="text-base font-medium text-gray-700 hover:text-gray-900 transition-colors"
                    >
                      {T(item.name_pt, item.name_en)}
                    </Link>
                  )
                ))}
                
                <div className="border-t border-gray-200 pt-6 space-y-4">
                  <Link 
                    to="/login" 
                    className="block text-base font-medium text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    {loginText}
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Header;