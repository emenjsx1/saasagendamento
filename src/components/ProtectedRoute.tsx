import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "@/integrations/supabase/session-context";
import { Loader2 } from "lucide-react";

const ProtectedRoute: React.FC = () => {
  const { user, isLoading } = useSession();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;