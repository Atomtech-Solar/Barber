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
// Code splitting: rotas principais carregadas sob demanda
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/auth/Login"));
const SignUp = lazy(() => import("./pages/auth/SignUp"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminLayout = lazy(() => import("./components/layouts/AdminLayout"));
const DashboardLayout = lazy(() => import("./components/layouts/DashboardLayout"));
const SiteLayout = lazy(() => import("./components/layouts/SiteLayout"));
const ClientLayout = lazy(() => import("./components/layouts/ClientLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminCompanyTeam = lazy(() => import("./pages/admin/AdminCompanyTeam"));
const AppDashboard = lazy(() => import("./pages/app/AppDashboard"));
const AppAgenda = lazy(() => import("./pages/app/AppAgenda"));
const AppClients = lazy(() => import("./pages/app/AppClients"));
const AppServices = lazy(() => import("./pages/app/AppServices"));
const AppProfessionals = lazy(() => import("./pages/app/AppProfessionals"));
const AppFinancial = lazy(() => import("./pages/app/AppFinancial"));
const AppStock = lazy(() => import("./pages/app/AppStock"));
const AppReports = lazy(() => import("./pages/app/AppReports"));
import { ReportsGuard } from "./components/auth/ReportsGuard";
const AppSettings = lazy(() => import("./pages/app/AppSettings"));
const SiteLanding = lazy(() => import("./pages/site/SiteLanding"));
const ClientHome = lazy(() => import("./pages/client/ClientHome"));
const ClientBooking = lazy(() => import("./pages/client/ClientBooking"));
const ClientAppointments = lazy(() => import("./pages/client/ClientAppointments"));
const ClientProfile = lazy(() => import("./pages/client/ClientProfile"));

const queryClient = new QueryClient();
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-pulse text-muted-foreground">Carregando...</div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TenantProvider>
        <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth/login" element={<Login />} />
              <Route path="/auth/signup" element={<SignUp />} />
              {/* /owner/dashboard: rota canônica para Owner; /admin mantido como alias */}
              <Route
                path="/owner"
                element={
                  <AdminGuard>
                    <AdminLayout />
                  </AdminGuard>
                }
              >
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="companies/:companyId/team" element={<AdminCompanyTeam />} />
              </Route>
              <Route
                path="/admin"
                element={
                  <AdminGuard>
                    <AdminLayout />
                  </AdminGuard>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="companies/:companyId/team" element={<AdminCompanyTeam />} />
              </Route>
              <Route
                path="/app"
                element={
                  <AppGuard>
                    <DashboardLayout />
                  </AppGuard>
                }
              >
                <Route index element={<AppDashboard />} />
                <Route path="agenda" element={<AppAgenda />} />
                <Route path="clients" element={<AppClients />} />
                <Route path="services" element={<AppServices />} />
                <Route path="professionals" element={<AppProfessionals />} />
                <Route path="financial" element={<AppFinancial />} />
                <Route path="stock" element={<AppStock />} />
                <Route
                  path="reports"
                  element={
                    <ReportsGuard>
                      <AppReports />
                    </ReportsGuard>
                  }
                />
                <Route path="settings" element={<AppSettings />} />
              </Route>
              <Route path="/site/:slug" element={<SiteLayout />}>
                <Route index element={<SiteLanding />} />
              </Route>
              <Route path="/client" element={<ClientLayout />}>
                <Route
                  index
                  element={
                    <ProtectedRoute>
                      <ClientHome />
                    </ProtectedRoute>
                  }
                />
                <Route path="booking" element={<ClientBooking />} />
                <Route
                  path="appointments"
                  element={
                    <ProtectedRoute>
                      <ClientAppointments />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="profile"
                  element={
                    <ProtectedRoute>
                      <ClientProfile />
                    </ProtectedRoute>
                  }
                />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        </TooltipProvider>
      </TenantProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
