import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, Home, Calendar, Briefcase, DollarSign, BarChart3, User, Shield, MessageSquare, Settings, Plus, Menu } from 'lucide-react';
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
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-50 to-white border-r border-gray-200 shadow-xl">
      {/* Header com Logo e Nome do Negócio */}
      <div className="p-6 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3 mb-2">
          <Avatar className="h-12 w-12 border-2 border-gray-200 shadow-sm">
            <AvatarImage src={business?.logo_url || undefined} alt={business?.name || 'Business'} />
          <AvatarFallback className="bg-gradient-to-br from-gray-800 to-gray-900 text-white font-semibold text-sm">
            {business?.name ? getBusinessInitials(business.name) : 'BN'}
          </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 truncate">
              {T('Painel do Negócio', 'Business Panel')}
            </h2>
            <p className="text-sm text-gray-600 truncate">
              @{business?.name || T('Carregando...', 'Loading...')}
            </p>
          </div>
        </div>
      </div>

      {/* Navegação Principal */}
      <nav className="flex-grow p-4 space-y-1 overflow-y-auto">
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
      <div className="p-4 border-t border-gray-200 bg-white space-y-3">
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
  const [profileData, setProfileData] = useState<{ first_name: string | null; last_name: string | null; phone: string | null; avatar_url: string | null } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      setIsLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone, avatar_url')
        .eq('id', user.id)
        .single();
      setProfileData(data);
      setIsLoading(false);
    };
    fetchProfile();
  }, [user?.id]);

  const getUserInitials = () => {
    if (profileData?.first_name && profileData?.last_name) {
      return `${profileData.first_name[0]}${profileData.last_name[0]}`.toUpperCase();
    }
    if (profileData?.first_name) {
      return profileData.first_name[0].toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  const getUserName = () => {
    if (profileData?.first_name && profileData?.last_name) {
      return `${profileData.first_name} ${profileData.last_name}`;
    }
    if (profileData?.first_name) {
      return profileData.first_name;
    }
    return user?.email?.split('@')[0] || 'Usuário';
  };

  return (
    <div className="bg-gradient-to-br from-gray-800 via-gray-900 to-black p-6 rounded-b-3xl shadow-2xl">
      <div className="flex items-center gap-4 mb-4">
        <Avatar className="h-16 w-16 border-4 border-white/30 shadow-xl">
          <AvatarImage src={profileData?.avatar_url || undefined} alt={getUserName()} />
          <AvatarFallback className="bg-white/20 text-white text-xl font-bold">
            {getUserInitials()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-white truncate">{getUserName()}</h3>
          <p className="text-sm text-gray-300 truncate">{user?.email}</p>
          {business?.name && (
            <p className="text-xs text-gray-400 mt-1 truncate">
              {T('Negócio', 'Business')}: {business.name}
            </p>
          )}
        </div>
      </div>
      {profileData?.phone && (
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 mb-3">
          <p className="text-sm text-white/90">
            <span className="font-semibold">{T('Telefone', 'Phone')}:</span> {profileData.phone}
          </p>
        </div>
      )}
      <Button
        variant="ghost"
        className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30"
        onClick={onLogout}
      >
        <LogOut className="h-4 w-4 mr-2" />
        {T('Sair', 'Logout')}
      </Button>
    </div>
  );
};

const MobileBottomNav: React.FC<{ location: any; T: (pt: string, en: string) => string; isAdmin: boolean }> = ({ location, T, isAdmin }) => {
  const mainNavItems = [
    { name: T('Dashboard', 'Dashboard'), href: '/dashboard', icon: Home },
    { name: T('Agenda', 'Agenda'), href: '/dashboard/agenda', icon: Calendar },
    { name: T('Serviços', 'Services'), href: '/dashboard/services', icon: Briefcase },
    { name: T('Perfil', 'Profile'), href: '/dashboard/profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-2xl md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {mainNavItems.map((item) => {
          const isActive = location.pathname === item.href || 
                          (location.pathname.startsWith(item.href) && item.href !== '/dashboard');
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all duration-200",
                isActive ? 'text-gray-900' : 'text-gray-500'
              )}
            >
              <item.icon className={cn("h-6 w-6", isActive && "scale-110")} />
              <span className="text-xs font-medium">{item.name}</span>
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-900 rounded-t-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

const MobileSidebar: React.FC<{ 
  user: any; 
  business: any; 
  location: any; 
  isAdmin: boolean; 
  onLogout: () => void;
  T: (pt: string, en: string) => string;
}> = ({ user, business, location, isAdmin, onLogout, T }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navItems = [
    { name: T('Dashboard', 'Dashboard'), href: '/dashboard', icon: Home },
    { name: T('Agenda', 'Agenda'), href: '/dashboard/agenda', icon: Calendar },
    { name: T('Serviços', 'Services'), href: '/dashboard/services', icon: Briefcase },
    { name: T('Financeiro', 'Finance'), href: '/dashboard/finance', icon: DollarSign },
    { name: T('Relatórios', 'Reports'), href: '/dashboard/reports', icon: BarChart3 },
    { name: T('Configurações do Negócio', 'Business Settings'), href: '/register-business', icon: Settings },
    { name: T('Meu Perfil', 'My Profile'), href: '/dashboard/profile', icon: User },
  ];

  const ticketItems = [
    { name: T('Criar Ticket', 'Create Ticket'), href: '/dashboard/tickets/create', icon: Plus },
    { name: T('Ver Tickets', 'View Tickets'), href: '/dashboard/tickets', icon: MessageSquare },
  ];

  const adminItem = { name: T('Área Admin', 'Admin Area'), href: '/admin', icon: Shield };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="fixed top-4 left-4 z-40 bg-white shadow-lg md:hidden"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0">
        <div className="flex flex-col h-full">
          <MobileProfileArea user={user} business={business} onLogout={onLogout} T={T} />
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
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
            <Separator className="my-4" />
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
                <Separator className="my-4" />
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

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-72 flex-shrink-0">
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
      />
      
      {/* Main Content */}
      <div className="flex-grow p-4 md:p-8 overflow-auto pb-20 md:pb-8 pt-16 md:pt-4">
        <Outlet />
      </div>
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav location={location} T={T} isAdmin={isAdmin} />
    </div>
  );
};

export default DashboardLayout;