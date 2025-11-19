import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Home, Briefcase, Users, Calendar, BarChart3, Settings, ArrowLeft, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const AdminSidebar: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { name: 'Visão Geral', href: '/admin', icon: Home },
    { name: 'Gestão de Negócios', href: '/admin/businesses', icon: Briefcase },
    { name: 'Gestão de Usuários', href: '/admin/users', icon: Users },
    { name: 'Controle de Agendamentos', href: '/admin/appointments', icon: Calendar },
    { name: 'Gestão Financeira', href: '/admin/payments', icon: DollarSign }, // Novo Link
    { name: 'Relatórios', href: '/admin/reports', icon: BarChart3 },
    { name: 'Configurações', href: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="flex flex-col h-full border-r bg-gray-900 text-white p-4">
      <div className="text-2xl font-bold mb-8 text-red-500">Admin Panel</div>
      <nav className="flex-grow space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href || 
                           (location.pathname.startsWith(item.href) && item.href !== '/admin');

          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center p-3 rounded-lg text-sm font-medium transition-colors",
                isActive 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <item.icon className="h-5 w-5 mr-3" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto pt-4 border-t border-gray-700">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-sm text-gray-400 hover:bg-gray-800"
          asChild
        >
          <Link to="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Painel do Negócio
          </Link>
        </Button>
      </div>
    </div>
  );
};

const AdminLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="hidden md:block w-72 flex-shrink-0">
        <AdminSidebar />
      </div>
      <div className="flex-grow p-4 md:p-8 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;