import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAdminCheck } from "@/hooks/use-admin-check";
import { useSession } from "@/integrations/supabase/session-context";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldOff } from "lucide-react";

const AdminRoute: React.FC = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const { isAdmin, isLoading: isAdminLoading } = useAdminCheck();

  const isLoading = isSessionLoading || isAdminLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 1. Se não estiver logado, redireciona para o login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 2. Se estiver logado, mas não for admin, mostra erro de acesso
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <Alert variant="destructive">
              <ShieldOff className="h-4 w-4" />
              <AlertTitle>Acesso Negado</AlertTitle>
              <AlertDescription>
                Você não tem permissão para acessar esta página. Apenas administradores podem visualizar este conteúdo.
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

  // 3. Se for admin, permite acesso
  return <Outlet />;
};

export default AdminRoute;