import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/DashboardLayout"; 
import AdminLayout from "./components/AdminLayout"; // Importar AdminLayout
import { SessionContextProvider } from "./integrations/supabase/session-context";
import AdminRoute from "./components/AdminRoute"; 

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
import PricingPage from "./pages/PricingPage"; 
import ProfilePage from "./pages/ProfilePage"; 
import CheckoutPage from "./pages/CheckoutPage";
import RegisterPage from "./pages/RegisterPage";
import ChoosePlanPage from "./pages/ChoosePlanPage"; 
import AdminDashboardPage from "./pages/AdminDashboardPage"; 
import AdminBusinessesPage from "./pages/AdminBusinessesPage"; // Nova
import AdminUsersPage from "./pages/AdminUsersPage"; // Nova
import AdminAppointmentsPage from "./pages/AdminAppointmentsPage"; // Nova
import AdminReportsPage from "./pages/AdminReportsPage"; // Nova
import AdminSettingsPage from "./pages/AdminSettingsPage"; // Nova
import AdminPaymentsPage from "./pages/AdminPaymentsPage"; // Nova
import AdminTicketsPage from "./pages/AdminTicketsPage";
import AdminTicketDetailsPage from "./pages/AdminTicketDetailsPage";
import TicketsPage from "./pages/TicketsPage";
import CreateTicketPage from "./pages/CreateTicketPage";
import TicketDetailPage from "./pages/TicketDetailPage";
import WelcomePage from "./pages/WelcomePage";
import TrialStartedPage from "./pages/TrialStartedPage";
import QRCodePage from "./pages/QRCodePage";

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
            <Route path="/pricing" element={<PricingPage />} /> 
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/choose-plan" element={<ChoosePlanPage />} />
            <Route path="/checkout/:planSlug" element={<CheckoutPage />} />
            <Route path="/welcome" element={<WelcomePage />} />
            <Route path="/trial-started" element={<TrialStartedPage />} /> 
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
                <Route path="/dashboard/qr-code" element={<QRCodePage />} />
                <Route path="/dashboard/tickets" element={<TicketsPage />} />
                <Route path="/dashboard/tickets/create" element={<CreateTicketPage />} />
                <Route path="/dashboard/tickets/:ticketId" element={<TicketDetailPage />} />
              </Route>
            </Route>
            
            {/* Rotas Protegidas para Administradores */}
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboardPage />} />
                <Route path="businesses" element={<AdminBusinessesPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="appointments" element={<AdminAppointmentsPage />} />
                <Route path="reports" element={<AdminReportsPage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
                <Route path="payments" element={<AdminPaymentsPage />} />
                <Route path="tickets" element={<AdminTicketsPage />} />
                <Route path="tickets/:ticketId" element={<AdminTicketDetailsPage />} />
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