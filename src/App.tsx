import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Layout } from "@/components/Layout";
import Index from "./pages/Index";
import Indicadores from "./pages/Indicadores";
import Empreendimentos from "./pages/Empreendimentos";
import Obras from "./pages/Obras";
import Disciplinas from "./pages/Disciplinas";
import Projetistas from "./pages/Projetistas";
import Configuracoes from "./pages/Configuracoes";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Rotas públicas (sem Layout) */}
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Cadastro />} />
            
            {/* Rotas privadas (com Layout) */}
            <Route element={<Layout />}>
              <Route path="/" element={<Index />} />
              <Route path="/indicadores" element={<Indicadores />} />
              <Route path="/empreendimentos" element={<Empreendimentos />} />
              <Route path="/obras" element={<Obras />} />
              <Route path="/disciplinas" element={<Disciplinas />} />
              <Route path="/projetistas" element={<Projetistas />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
            </Route>
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
