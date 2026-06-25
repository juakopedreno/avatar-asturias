import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "./pages/Landing";
import AvatarDemo from "./pages/AvatarDemo";
import FeriaDisplay from "./pages/FeriaDisplay";
import FeriaKiosk from "./pages/FeriaKiosk";
import AdminLayout from "./components/layout/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import ContentManagement from "./pages/admin/ContentManagement";
import Alerts from "./pages/admin/Alerts";
import Sources from "./pages/admin/Sources";
import Training from "./pages/admin/Training";
import Analytics from "./pages/admin/Analytics";
import Audit from "./pages/admin/Audit";
import Users from "./pages/admin/Users";
import SettingsPage from "./pages/admin/Settings";
import NotFound from "./pages/NotFound";
import AdminLoginPage from "./pages/admin/Login";
import { AuthProvider } from "./context/auth-context";

const queryClient = new QueryClient();

const FAVICON_HREF = "/asturias-favicon.svg?v=1";

function useFavicon() {
  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/png";
      document.head.appendChild(link);
    }
    link.href = FAVICON_HREF;
    const shortcut = document.querySelector<HTMLLinkElement>('link[rel="shortcut icon"]');
    if (shortcut) shortcut.href = FAVICON_HREF;
  }, []);
}

const App = () => {
  useFavicon();
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/demo" element={<AvatarDemo />} />
            <Route path="/feria/display" element={<FeriaDisplay />} />
            <Route path="/feria/kiosk" element={<FeriaKiosk />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="content" element={<ContentManagement />} />
              <Route path="alerts" element={<Alerts />} />
              <Route path="sources" element={<Sources />} />
              <Route path="training" element={<Training />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="audit" element={<Audit />} />
              <Route path="users" element={<Users />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
