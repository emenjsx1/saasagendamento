import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/session-context';
import { Navigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const LoginPage = () => {
  const { user, isLoading } = useSession();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  // Se o usuário já estiver logado, redireciona para o dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4 relative overflow-hidden">
      {/* Grid pattern sutil */}
      <div className="absolute inset-0 grid-pattern opacity-20"></div>
      
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-black/10 relative z-10">
        <h2 className="text-3xl font-bold text-center mb-8 text-black">Acesso ao Painel do Negócio</h2>
        <Auth
          supabaseClient={supabase}
          providers={[]}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#000000',
                  brandAccent: '#000000',
                },
              },
            },
          }}
          theme="light"
          view="sign_in"
          redirectTo={window.location.origin + '/dashboard'}
        />
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Não tem uma conta?{' '}
            <Link to="/checkout/trial" className="text-black hover:underline font-semibold border-b border-black/0 hover:border-black/30 transition-all">
              Crie sua conta gratuita
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;