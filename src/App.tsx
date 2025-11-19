import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage"; 
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/DashboardLayout"; 
import { SessionContextProvider } from "./integrations/supabase/session-context";

// Importar páginas
import DashboardPage from "./pages/DashboardPage";
import RegisterBusinessPage from "./pages/RegisterBusinessPage";
import BookingPage from "./pages/BookingPage";
import ConfirmationPage from "./pages/ConfirmationPage";
import ServicesPage from "./pages/ServicesPage"; 
import AppointmentsPage from "./pages/AppointmentsPage"; 
import FinancePage from "./pages/FinancePage"; 
import ReportsPage from "./pages/ReportsPage"; 
import AboutPage from "./pages/AboutPage"; 
import SupportPage from "./pages/SupportPage"; 
import ContactPage from "./pages/ContactPage"; 
import ProfilePage from "./pages/ProfilePage"; 


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <SessionContextProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<AboutPage />} /> 
            <Route path="/support" element={<SupportPage />} /> 
            <Route path="/contact" element={<ContactPage />} /> 
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup/:planSlug" element={<SignupPage />} /> {/* Rota dinâmica */}
            <Route path="/book/:businessId" element={<BookingPage />} />
            <Route path="/confirmation/:appointmentId" element={<ConfirmationPage />} />

            {/* Rotas Protegidas para o Dono do Negócio */}
            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/register-business" element={<RegisterBusinessPage />} />
                <Route path="/dashboard/services" element={<ServicesPage />} />
                <Route path="/dashboard/agenda" element={<AppointmentsPage />} />
                <Route path="/dashboard/finance" element={<FinancePage />} /> 
                <Route path="/dashboard/reports" element={<ReportsPage />} /> 
                <Route path="/dashboard/profile" element={<ProfilePage />} /> 
              </Route>
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </SessionContextProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;