import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  variant?: 'default' | 'floating';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ variant = 'default', className }) => {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const isDark = theme === 'dark';

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  if (variant === 'floating') {
    return (
      <button
        onClick={toggleTheme}
        className={cn(
          "fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full shadow-2xl",
          "bg-gradient-to-br from-black via-gray-900 to-black",
          "dark:from-white dark:via-gray-100 dark:to-white",
          "flex items-center justify-center",
          "transition-all duration-500 transform hover:scale-110 active:scale-95",
          "border-2 border-white/20 dark:border-black/20",
          "hover:shadow-[0_0_30px_rgba(0,0,0,0.5)] dark:hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]",
          "group overflow-hidden",
          className
        )}
        aria-label="Alternar tema"
      >
        {/* Efeito de brilho animado */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer"></div>
        
        {/* Ícone com animação suave */}
        <div className="relative z-10 transition-all duration-500 transform">
          {isDark ? (
            <Sun className="h-7 w-7 text-black rotate-0 group-hover:rotate-180 transition-transform duration-500" />
          ) : (
            <Moon className="h-7 w-7 text-white rotate-0 group-hover:rotate-[-15deg] transition-transform duration-500" />
          )}
        </div>

        {/* Partículas de brilho */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute top-2 left-2 w-1 h-1 bg-white dark:bg-black rounded-full animate-sparkle"></div>
          <div className="absolute bottom-2 right-2 w-1 h-1 bg-white dark:bg-black rounded-full animate-sparkle" style={{ animationDelay: '0.2s' }}></div>
          <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-white dark:bg-black rounded-full animate-sparkle" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </button>
    );
  }

  // Variante padrão - Switch toggle chamativo
  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "relative w-14 h-8 rounded-full transition-all duration-500 ease-in-out",
        "bg-gradient-to-r from-gray-200 to-gray-300",
        "dark:from-gray-700 dark:to-gray-800",
        "shadow-lg hover:shadow-xl",
        "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white",
        "group overflow-hidden",
        className
      )}
      aria-label="Alternar tema"
    >
      {/* Fundo animado */}
      <div className={cn(
        "absolute inset-0 rounded-full transition-all duration-500",
        isDark 
          ? "bg-gradient-to-r from-gray-800 via-gray-900 to-black" 
          : "bg-gradient-to-r from-yellow-200 via-yellow-300 to-yellow-400"
      )}></div>

      {/* Ícone do sol/lua dentro do switch */}
      <div className={cn(
        "absolute top-1/2 -translate-y-1/2 transition-all duration-500 ease-in-out",
        "flex items-center justify-center",
        isDark ? "left-1 translate-x-0" : "left-1 translate-x-6"
      )}>
        <div className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center",
          "bg-white dark:bg-gray-900 shadow-lg",
          "transform transition-transform duration-300 group-hover:scale-110"
        )}>
          {isDark ? (
            <Moon className="h-3.5 w-3.5 text-yellow-400" />
          ) : (
            <Sun className="h-3.5 w-3.5 text-yellow-500" />
          )}
        </div>
      </div>

      {/* Efeito de brilho no hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 translate-x-[-100%] group-hover:translate-x-[100%]"></div>
    </button>
  );
};



