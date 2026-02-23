import { lazy, Suspense } from "react";
import { Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { AppGuard } from "@/components/auth/AppGuard";
import { AdminGuard } from "@/components/auth/AdminGuard";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/auth/Login";
import SignUp from "./pages/auth/SignUp";
import NotFound from "./pages/NotFound";
// Code splitting: painéis administrativos carregados sob demanda
const AdminLayout = lazy(() => import("./components/layouts/AdminLayout"));
const DashboardLayout = lazy(() => import("./components/layouts/DashboardLayout"));
import SiteLayout from "./components/layouts/SiteLayout";
import ClientLayout from "./components/layouts/ClientLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AppDashboard from "./pages/app/AppDashboard";
import AppAgenda from "./pages/app/AppAgenda";
import AppClients from "./pages/app/AppClients";
import AppServices from "./pages/app/AppServices";
import AppProfessionals from "./pages/app/AppProfessionals";
import AppFinancial from "./pages/app/AppFinancial";
import AppStock from "./pages/app/AppStock";
import AppSales from "./pages/app/AppSales";
import AppReports from "./pages/app/AppReports";
import AppSettings from "./pages/app/AppSettings";
import SiteLanding from "./pages/site/SiteLanding";
import ClientHome from "./pages/client/ClientHome";
import ClientBooking from "./pages/client/ClientBooking";
import ClientAppointments from "./pages/client/ClientAppointments";
import ClientProfile from "./pages/client/ClientProfile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TenantProvider>
        <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
              <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/signup" element={<SignUp />} />
              {/* /owner/dashboard: rota canônica para Owner; /admin mantido como alias */}
            <Route path="/owner" element={<AdminGuard><Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando...</div>}><AdminLayout /></Suspense></AdminGuard>}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
            </Route>
            <Route path="/admin" element={<AdminGuard><Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando...</div>}><AdminLayout /></Suspense></AdminGuard>}>
              <Route index element={<AdminDashboard />} />
            </Route>
            <Route path="/app" element={<AppGuard><Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando...</div>}><DashboardLayout /></Suspense></AppGuard>}>
              <Route index element={<AppDashboard />} />
              <Route path="agenda" element={<AppAgenda />} />
              <Route path="clients" element={<AppClients />} />
              <Route path="services" element={<AppServices />} />
              <Route path="professionals" element={<AppProfessionals />} />
              <Route path="financial" element={<AppFinancial />} />
              <Route path="stock" element={<AppStock />} />
              <Route path="sales" element={<AppSales />} />
              <Route path="reports" element={<AppReports />} />
              <Route path="settings" element={<AppSettings />} />
            </Route>
            <Route path="/site/:slug" element={<SiteLayout />}>
              <Route index element={<SiteLanding />} />
            </Route>
            <Route path="/client" element={<ClientLayout />}>
              <Route index element={<ProtectedRoute><ClientHome /></ProtectedRoute>} />
              <Route path="booking" element={<ClientBooking />} />
              <Route path="appointments" element={<ProtectedRoute><ClientAppointments /></ProtectedRoute>} />
              <Route path="profile" element={<ProtectedRoute><ClientProfile /></ProtectedRoute>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </TooltipProvider>
      </TenantProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
