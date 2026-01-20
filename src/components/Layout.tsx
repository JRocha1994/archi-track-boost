import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { Building2, FileText, Layers, Users, ClipboardList, Menu, ChevronLeft, ChevronRight, BarChart3, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Footer } from '@/components/layout/Footer';
import { UserMenu } from '@/components/layout/UserMenu';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Revisões', href: '/dashboard', icon: ClipboardList },
  { name: 'Indicadores', href: '/indicadores', icon: BarChart3 },
  // { name: 'Assistente IA', href: '/assistente-ia', icon: Bot }, // Temporariamente desativado
  { name: 'Empreendimentos', href: '/empreendimentos', icon: Building2 },
  { name: 'Obras', href: '/obras', icon: FileText },
  { name: 'Disciplinas', href: '/disciplinas', icon: Layers },
  { name: 'Projetistas', href: '/projetistas', icon: Users },
  { name: 'Configurações', href: '/configuracoes', icon: Settings },
];

import { OnboardingTour } from '@/components/OnboardingTour';

export function Layout() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const NavLinks = ({ collapsed = false }: { collapsed?: boolean }) => (
    <>
      {navigation.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.href;
        return (
          <Link
            key={item.name}
            to={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              collapsed && 'justify-center'
            )}
            title={collapsed ? item.name : undefined}
          >
            <Icon className="h-4 w-4" />
            {!collapsed && item.name}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card">
        <div className="px-4 flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">Gestão de Projetos Executivos</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* User Menu */}
            <UserMenu />

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="outline" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <nav className="flex flex-col gap-2 mt-8">
                  <NavLinks />
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <div className="px-4 flex gap-4 py-6 flex-1">
        {/* Sidebar - Desktop */}
        <aside className={cn(
          "hidden lg:block shrink-0 transition-all duration-300",
          sidebarCollapsed ? "w-14" : "w-48"
        )}>
          <div className="sticky top-24 space-y-2">
            <Button
              variant="ghost"
              size="icon"
              className="w-full"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
            <nav className="flex flex-col gap-2">
              <NavLinks collapsed={sidebarCollapsed} />
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>

      <Footer />
      <OnboardingTour />
    </div>
  );
}
