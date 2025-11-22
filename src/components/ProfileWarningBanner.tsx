import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/session-context';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

const ProfileWarningBanner: React.FC = () => {
  const { user } = useSession();
  const { T } = useCurrency();
  const [showBanner, setShowBanner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkProfile = React.useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      // Buscar perfil para verificar se o address (cidade) está preenchido
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('address')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao verificar perfil:', error);
        setIsLoading(false);
        return;
      }

      // Se não tem perfil OU se o address está vazio/nulo, mostrar o banner
      // IMPORTANTE: O banner deve aparecer sempre que a cidade não estiver preenchida,
      // independente de outras condições (pagamento expirado, limite atingido, etc.)
      if (!profile || !profile.address || profile.address.trim() === '') {
        setShowBanner(true);
      } else {
        setShowBanner(false);
      }
    } catch (error) {
      console.error('Erro ao verificar perfil:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    checkProfile();
  }, [checkProfile]);

  // Ouvir evento de atualização de perfil
  useEffect(() => {
    const handleProfileUpdate = () => {
      checkProfile();
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [checkProfile]);

  // Se estiver carregando ou não deve mostrar, não renderizar
  if (isLoading || !showBanner) {
    return null;
  }

  return (
    <Alert className="mb-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
      <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
            {T('⚠️ Atenção: Atualize suas informações', '⚠️ Attention: Update your information')}
          </p>
          <AlertDescription className="text-yellow-800 dark:text-yellow-200">
            {T('Por favor, complete seu perfil adicionando sua Província/Cidade para continuar usando a plataforma.', 'Please complete your profile by adding your Province/City to continue using the platform.')}
          </AlertDescription>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            asChild
            size="sm"
            className="bg-yellow-600 hover:bg-yellow-700 text-white whitespace-nowrap"
          >
            <Link to="/dashboard/profile">
              {T('Atualizar Perfil', 'Update Profile')}
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-yellow-700 hover:text-yellow-900 hover:bg-yellow-100 flex-shrink-0"
            onClick={() => setShowBanner(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Alert>
  );
};

export default ProfileWarningBanner;

