import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "@/integrations/supabase/session-context";
import { useUserType } from "@/hooks/use-user-type";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldOff } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";

const ClientRoute: React.FC = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const { userType, isLoading: isUserTypeLoading, hasBusiness } = useUserType();
  const { T } = useCurrency();

  const isLoading = isSessionLoading || isUserTypeLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Se não estiver logado, redireciona para o login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Se for admin ou owner (tem negócio), bloqueia acesso e redireciona
  if (userType === 'admin' || userType === 'owner' || hasBusiness) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <Alert variant="destructive">
              <ShieldOff className="h-4 w-4" />
              <AlertTitle>{T('Acesso Negado', 'Access Denied')}</AlertTitle>
              <AlertDescription>
                {T(
                  'Esta área é exclusiva para clientes. Como dono de negócio, você deve acessar o dashboard do seu negócio.',
                  'This area is exclusive for clients. As a business owner, you should access your business dashboard.'
                )}
              </AlertDescription>
            </Alert>
            <div className="mt-4 text-center">
              <Navigate to="/dashboard" replace />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Se for cliente, permite acesso
  return <Outlet />;
};

export default ClientRoute;








