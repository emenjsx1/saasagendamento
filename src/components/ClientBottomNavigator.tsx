import { Link, useLocation } from 'react-router-dom';
import { History, Store, User, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';

export function ClientBottomNavigator() {
  const location = useLocation();
  const { T } = useCurrency();

  const navItems = [
    { name: T('Histórico', 'History'), href: '/client/history', icon: History },
    { name: T('Marketplace', 'Marketplace'), href: '/marketplace', icon: Store },
    { name: T('Finanças', 'Finance'), href: '/client/finance', icon: DollarSign },
    { name: T('Perfil', 'Profile'), href: '/client/profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href || 
            (item.href === '/marketplace' && location.pathname.startsWith('/marketplace'));
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full transition-colors",
                isActive
                  ? "text-black"
                  : "text-gray-500"
              )}
            >
              <Icon className={cn(
                "h-5 w-5 mb-1",
                isActive && "text-black"
              )} />
              <span className={cn(
                "text-xs font-medium",
                isActive ? "text-black" : "text-gray-500"
              )}>
                {item.name}
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

