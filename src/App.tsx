import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom"; // Importar solo Routes y Route
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings"; // Nota: Usando capitalización consistente para la ruta Settings.
import PremiumPage from "./pages/PremiumPage"; // NUEVO: Importar la nueva página

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      {/* <BrowserRouter> fue movido a main.tsx */}
      <Routes>
        <Route path="/" element={<Index />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="/settings" element={<Settings />} />
        <Route path="/premium" element={<PremiumPage />} />{" "}
        {/* NUEVO: Ruta Premium */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
