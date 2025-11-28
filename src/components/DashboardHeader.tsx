import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, User, LogOut, MessageSquare, Settings, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useSession } from '@/integrations/supabase/session-context';
import { useCurrency } from '@/contexts/CurrencyContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent } from '@/components/ui/sheet';

interface DashboardHeaderProps {
  onMenuToggle?: () => void;
  isMenuOpen?: boolean;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ onMenuToggle, isMenuOpen = false }) => {
  const { user } = useSession();
  const { T } = useCurrency();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<{ 
    first_name: string | null; 
    last_name: string | null; 
    phone: string | null; 
    avatar_url: string | null 
  } | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Buscar dados do perfil
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone, avatar_url')
        .eq('id', user.id)
        .single();
      setProfileData(data);
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

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erro ao sair: " + error.message);
    } else {
      toast.success("Sessão encerrada com sucesso.");
    }
  };

  const handleMenuClick = () => {
    if (onMenuToggle) {
      onMenuToggle();
    } else {
      setIsMobileMenuOpen(!isMobileMenuOpen);
    }
  };

  return (
    <>
      <header className={cn(
        "fixed top-0 left-0 right-0 z-40 h-16 md:h-[72px]",
        "bg-white dark:bg-[#1A1A1A]",
        "border-b border-gray-200 dark:border-gray-800",
        "shadow-sm dark:shadow-[0_1px_4px_rgba(0,0,0,0.3)]",
        "transition-all duration-200"
      )}>
        <div className="h-full flex items-center justify-between px-6 md:px-8">
          {/* Left Section: Logo + Hamburger */}
          <div className="flex items-center gap-3 md:gap-4">
            {/* Hamburger Button - Mobile */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-9 w-9 md:hidden",
                "hover:bg-gray-100 dark:hover:bg-gray-800",
                "transition-all duration-200"
              )}
              onClick={handleMenuClick}
              aria-label="Toggle menu"
            >
              {isMenuOpen || isMobileMenuOpen ? (
                <X className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              ) : (
                <Menu className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              )}
            </Button>

            {/* Logo */}
            <Link 
              to="/dashboard" 
              className="flex items-center gap-2.5 hover:opacity-80 transition-opacity group"
            >
              <div className={cn(
                "h-8 w-8 rounded-lg",
                "bg-gradient-to-br from-black to-gray-900 dark:from-white dark:to-gray-100",
                "flex items-center justify-center",
                "shadow-sm group-hover:shadow-md transition-shadow duration-200"
              )}>
                <span className={cn(
                  "text-white dark:text-black",
                  "font-bold text-base",
                  "transition-transform duration-200 group-hover:scale-110"
                )}>
                  A
                </span>
              </div>
              <span className={cn(
                "text-lg md:text-xl font-semibold",
                "text-gray-900 dark:text-white",
                "tracking-tight",
                "hidden sm:inline-block"
              )}>
                AgenCode
              </span>
            </Link>
          </div>

          {/* Right Section: Theme Toggle + Avatar */}
          <div className="flex items-center gap-3 md:gap-4">
            {/* Theme Toggle */}
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>

            {/* User Avatar with Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "h-9 w-9 rounded-full p-0",
                    "hover:ring-2 hover:ring-gray-200 dark:hover:ring-gray-700",
                    "transition-all duration-200",
                    "hover:scale-105 active:scale-95"
                  )}
                >
                  <Avatar className="h-9 w-9 ring-2 ring-gray-100 dark:ring-gray-800">
                    <AvatarImage 
                      src={profileData?.avatar_url || undefined} 
                      alt={getUserName()} 
                    />
                    <AvatarFallback className={cn(
                      "bg-gradient-to-br from-gray-800 to-gray-900",
                      "dark:from-gray-700 dark:to-gray-800",
                      "text-white text-sm font-semibold"
                    )}>
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className={cn(
                  "w-56",
                  "bg-white dark:bg-[#1A1A1A]",
                  "border border-gray-200 dark:border-gray-800",
                  "shadow-lg"
                )}
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-gray-900 dark:text-white">
                      {getUserName()}
                    </p>
                    <p className="text-xs leading-none text-gray-500 dark:text-gray-400 truncate">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-800" />
                <DropdownMenuItem
                  onClick={() => navigate('/dashboard/profile')}
                  className="cursor-pointer"
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>{T('Meu Perfil', 'My Profile')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/dashboard/tickets/create')}
                  className="cursor-pointer"
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  <span>{T('Criar Ticket', 'Create Ticket')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/register-business')}
                  className="cursor-pointer"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>{T('Configurações', 'Settings')}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-800" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{T('Sair', 'Logout')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Mobile Menu Sheet */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="w-80 p-0">
          {/* Mobile menu content would go here if needed */}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default DashboardHeader;

