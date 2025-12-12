import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Home, Briefcase, Users, Calendar, BarChart3, Settings, ArrowLeft, DollarSign, Shield, Menu, X, MessageSquare, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useSession } from '@/integrations/supabase/session-context';

const AdminSidebar: React.FC<{ isMobile?: boolean }> = ({ isMobile = false }) => {
  const location = useLocation();

  const navItems = [
    { name: 'Visão Geral', href: '/admin', icon: Home },
    { name: 'Negócios', href: '/admin/businesses', icon: Briefcase },
    { name: 'Usuários', href: '/admin/users', icon: Users },
    { name: 'Agendamentos', href: '/admin/appointments', icon: Calendar },
    { name: 'Pagamentos', href: '/admin/payments', icon: DollarSign },
    { name: 'Saques', href: '/admin/withdrawals', icon: Wallet },
    { name: 'Tickets', href: '/admin/tickets', icon: MessageSquare },
    { name: 'Relatórios', href: '/admin/reports', icon: BarChart3 },
    { name: 'Configurações', href: '/admin/settings', icon: Settings },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Admin Panel</h2>
            <p className="text-xs text-gray-400">Painel Administrativo</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-grow p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href || 
                           (location.pathname.startsWith(item.href) && item.href !== '/admin');

          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                isActive 
                  ? 'bg-gradient-to-r from-gray-800 to-gray-900 text-white shadow-lg shadow-gray-800/20' 
                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-sm text-gray-400 hover:bg-white/5 hover:text-white"
          asChild
        >
          <Link to="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Painel
          </Link>
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return <SidebarContent />;
  }

  return (
    <div className="hidden md:block w-72 flex-shrink-0 bg-gradient-to-b from-gray-900 to-gray-800 border-r border-gray-700">
      <SidebarContent />
    </div>
  );
};

const AdminLayout: React.FC = () => {
  const { user } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Desktop Sidebar */}
      <AdminSidebar />

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Admin Panel</h2>
            </div>
          </div>
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 bg-gradient-to-b from-gray-900 to-gray-800">
              <AdminSidebar isMobile />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-grow md:ml-0 pt-16 md:pt-0">
        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
