import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, Home, Calendar, Briefcase, DollarSign, BarChart3, User, Shield, MessageSquare, Settings, Plus, Menu, QrCode, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/session-context';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAdminCheck } from '@/hooks/use-admin-check';
import { useBusiness } from '@/hooks/use-business';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import ProfileWarningBanner from '@/components/ProfileWarningBanner';
import DashboardHeader from '@/components/DashboardHeader';

const Sidebar: React.FC = () => {
  const { user } = useSession();
  const { isAdmin } = useAdminCheck();
  const { business, isLoading: isBusinessLoading } = useBusiness();
  const { T } = useCurrency();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erro ao sair: " + error.message);
    } else {
      toast.success("Sessão encerrada com sucesso.");
    }
  };

  const navItems = [
    { name: T('Dashboard', 'Dashboard'), href: '/dashboard', icon: Home },
    { name: T('Agenda', 'Agenda'), href: '/dashboard/agenda', icon: Calendar },
    { name: T('Serviços', 'Services'), href: '/dashboard/services', icon: Briefcase },
    { name: T('Financeiro', 'Finance'), href: '/dashboard/finance', icon: DollarSign },
    { name: T('Relatórios', 'Reports'), href: '/dashboard/reports', icon: BarChart3 },
    { name: T('Divulgação & QR Code', 'Promotion & QR Code'), href: '/dashboard/qr-code', icon: QrCode },
    { name: T('Configurações do Negócio', 'Business Settings'), href: '/register-business', icon: Settings },
    { name: T('Meu Perfil', 'My Profile'), href: '/dashboard/profile', icon: User },
  ];

  const ticketItems = [
    { name: T('Criar Ticket', 'Create Ticket'), href: '/dashboard/tickets/create', icon: Plus },
    { name: T('Ver Tickets', 'View Tickets'), href: '/dashboard/tickets', icon: MessageSquare },
  ];
  
  const adminItem = { name: T('Área Admin', 'Admin Area'), href: '/admin', icon: Shield };

  const getBusinessInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="fixed top-[72px] left-0 h-[calc(100vh-72px)] w-72 flex flex-col bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 border-r border-gray-200 dark:border-gray-800 shadow-xl z-30">
      {/* Navegação Principal */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto min-h-0">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href || 
                           (location.pathname.startsWith(item.href) && item.href !== '/dashboard');

          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group",
                isActive 
                  ? 'bg-gradient-to-r from-gray-800 to-gray-900 text-white shadow-lg shadow-gray-800/20' 
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <item.icon className={cn(
                "h-5 w-5 transition-all duration-200",
                isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-900'
              )} />
              <span>{item.name}</span>
            </Link>
          );
        })}

        {/* Divisor */}
        <div className="my-4 border-t border-gray-200"></div>

        {/* Seção Tickets / Suporte */}
        <div className="mb-2">
          <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {T('Tickets / Suporte', 'Tickets / Support')}
          </p>
          <div className="space-y-1">
            {ticketItems.map((item) => {
              const isActive = location.pathname === item.href || 
                               location.pathname.startsWith('/dashboard/tickets');

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group",
                    isActive 
                      ? 'bg-gradient-to-r from-gray-700 to-gray-800 text-white shadow-lg shadow-gray-700/20' 
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <item.icon className={cn(
                    "h-5 w-5 transition-all duration-200",
                    isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-900'
                  )} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Divisor */}
        {isAdmin && <div className="my-4 border-t border-gray-200"></div>}
        
        {/* Link da Área de Admin (Apenas para Admins) */}
        {isAdmin && (
          <Link
            to={adminItem.href}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
              location.pathname.startsWith(adminItem.href)
                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/20' 
                : 'text-red-600 hover:bg-red-50 hover:text-red-700'
            )}
          >
            <adminItem.icon className="h-5 w-5" />
            <span>{adminItem.name}</span>
          </Link>
        )}
      </nav>

      {/* Footer com Botão Criar Ticket e Logout */}
      <div className="p-4 border-t border-gray-200 bg-white space-y-3 flex-shrink-0">
        {/* Botão Destacado: Criar Ticket */}
        <Button
          onClick={() => navigate('/dashboard/tickets/create')}
          className="w-full bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black text-white shadow-lg shadow-gray-800/20 font-semibold"
          size="lg"
        >
          <MessageSquare className="h-5 w-5 mr-2" />
          {T('Criar Ticket', 'Create Ticket')}
        </Button>

        {/* Info do Usuário e Logout */}
        <div className="pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-2 truncate px-1">
            {T('Logado como', 'Logged in as')}: {user?.email}
          </p>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {T('Sair', 'Logout')}
          </Button>
        </div>
      </div>
    </div>
  );
};

const MobileProfileArea: React.FC<{ user: any; business: any; onLogout: () => void; T: (pt: string, en: string) => string }> = ({ user, business, onLogout, T }) => {
  const getBusinessInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="bg-gradient-to-br from-gray-800 via-gray-900 to-black p-4 rounded-b-3xl shadow-2xl">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 border-2 border-white/30 shadow-lg">
          <AvatarImage src={business?.logo_url || undefined} alt={business?.name || 'Business'} />
          <AvatarFallback className="bg-white/20 text-white text-sm font-bold">
            {business?.name ? getBusinessInitials(business.name) : 'BN'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          {business?.name && (
            <p className="text-sm font-semibold text-white truncate">
              {business.name}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const MobileSidebar: React.FC<{ 
  user: any; 
  business: any; 
  location: any; 
  isAdmin: boolean; 
  onLogout: () => void;
  T: (pt: string, en: string) => string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ user, business, location, isAdmin, onLogout, T, isOpen, onOpenChange }) => {
  const navItems = [
    { name: T('Dashboard', 'Dashboard'), href: '/dashboard', icon: Home },
    { name: T('Agenda', 'Agenda'), href: '/dashboard/agenda', icon: Calendar },
    { name: T('Serviços', 'Services'), href: '/dashboard/services', icon: Briefcase },
    { name: T('Financeiro', 'Finance'), href: '/dashboard/finance', icon: DollarSign },
    { name: T('Relatórios', 'Reports'), href: '/dashboard/reports', icon: BarChart3 },
    { name: T('Divulgação & QR Code', 'Promotion & QR Code'), href: '/dashboard/qr-code', icon: QrCode },
    { name: T('Configurações do Negócio', 'Business Settings'), href: '/register-business', icon: Settings },
    { name: T('Meu Perfil', 'My Profile'), href: '/dashboard/profile', icon: User },
  ];

  const ticketItems = [
    { name: T('Criar Ticket', 'Create Ticket'), href: '/dashboard/tickets/create', icon: Plus },
    { name: T('Ver Tickets', 'View Tickets'), href: '/dashboard/tickets', icon: MessageSquare },
  ];

  const adminItem = { name: T('Área Admin', 'Admin Area'), href: '/admin', icon: Shield };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent 
        side="left" 
        className="w-[85vw] sm:w-80 p-0 h-full max-w-sm z-[100]"
      >
        <div className="flex flex-col h-full relative">
          {/* Botão de fechar visível no topo */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 z-50 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5 text-white" />
          </button>
          <div className="flex-shrink-0">
            <MobileProfileArea user={user} business={business} onLogout={onLogout} T={T} />
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href || 
                              (location.pathname.startsWith(item.href) && item.href !== '/dashboard');
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive 
                      ? 'bg-gradient-to-r from-gray-800 to-gray-900 text-white shadow-lg' 
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
            <Separator className="my-3" />
            <div className="space-y-2">
              {ticketItems.map((item) => {
                const isActive = location.pathname === item.href || 
                                location.pathname.startsWith('/dashboard/tickets');
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                      isActive 
                        ? 'bg-gradient-to-r from-gray-700 to-gray-800 text-white shadow-lg' 
                        : 'text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
            {isAdmin && (
              <>
                <Separator className="my-3" />
                <Link
                  to={adminItem.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                    location.pathname.startsWith(adminItem.href)
                      ? 'bg-gradient-to-r from-gray-800 to-gray-900 text-white shadow-lg' 
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <adminItem.icon className="h-5 w-5" />
                  <span>{adminItem.name}</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const DashboardLayout: React.FC = () => {
  const { user } = useSession();
  const { business } = useBusiness();
  const { isAdmin } = useAdminCheck();
  const { T } = useCurrency();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erro ao sair: " + error.message);
    } else {
      toast.success("Sessão encerrada com sucesso.");
    }
  };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Dashboard Header */}
      <DashboardHeader 
        isMenuOpen={isMobileMenuOpen}
        onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />
      
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>
      
      {/* Mobile Sidebar */}
      <MobileSidebar 
        user={user} 
        business={business} 
        location={location} 
        isAdmin={isAdmin} 
        onLogout={handleLogout}
        T={T}
        isOpen={isMobileMenuOpen}
        onOpenChange={setIsMobileMenuOpen}
      />
      
      {/* Main Content */}
      <div className="flex-grow w-full overflow-auto pt-16 md:pt-[72px] min-h-screen bg-gray-100 dark:bg-gray-900 md:ml-72">
        <div className="w-full px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6">
          {/* Banner de atenção para perfil incompleto */}
          <ProfileWarningBanner />
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;