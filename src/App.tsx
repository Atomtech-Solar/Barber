import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminLayout from "./components/layouts/AdminLayout";
import DashboardLayout from "./components/layouts/DashboardLayout";
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
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
          </Route>
          <Route path="/app" element={<DashboardLayout />}>
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
            <Route index element={<ClientHome />} />
            <Route path="booking" element={<ClientBooking />} />
            <Route path="appointments" element={<ClientAppointments />} />
            <Route path="profile" element={<ClientProfile />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
