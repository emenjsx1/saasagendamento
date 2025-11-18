import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, Home, Settings, Calendar, Briefcase } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/session-context';
import { toast } from 'sonner';

const Sidebar: React.FC = () => {
  const { user } = useSession();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erro ao sair: " + error.message);
    } else {
      toast.success("Sessão encerrada com sucesso.");
    }
  };

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Meu Negócio', href: '/register-business', icon: Briefcase },
    { name: 'Agenda', href: '/dashboard/agenda', icon: Calendar },
    { name: 'Serviços', href: '/dashboard/services', icon: Settings },
  ];

  return (
    <div className="flex flex-col h-full border-r bg-sidebar text-sidebar-foreground p-4">
      <div className="text-xl font-bold mb-8 text-sidebar-primary-foreground">Painel Admin</div>
      <nav className="flex-grow space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.name}
            to={item.href}
            className="flex items-center p-3 rounded-lg text-sm font-medium hover:bg-sidebar-accent transition-colors"
          >
            <item.icon className="h-5 w-5 mr-3" />
            {item.name}
          </Link>
        ))}
      </nav>
      <div className="mt-auto pt-4 border-t border-sidebar-border">
        <p className="text-xs text-gray-400 mb-2 truncate">Logado como: {user?.email}</p>
        <Button 
          variant="ghost" 
          className="w-full justify-start text-sm text-red-400 hover:bg-red-900/20"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </div>
    </div>
  );
};

const DashboardLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="hidden md:block w-64 flex-shrink-0">
        <Sidebar />
      </div>
      <div className="flex-grow p-4 md:p-8 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
};

export default DashboardLayout;