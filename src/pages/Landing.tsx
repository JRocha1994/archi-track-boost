import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Footer } from '@/components/layout/Footer';
import { CheckCircle2, BarChart3, FileText } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <span className="font-bold text-xl text-gray-900">Gestão de Projetos</span>
            </div>
            <Link to="/login">
                <Button>Acessar Sistema</Button>
            </Link>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-16 flex flex-col items-center text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
          Gestão de Projetos <span className="text-primary">Simplificada</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mb-10">
          Centralize indicadores de desempenho, metas e controle de revisões para acompanhamento eficiente dos seus empreendimentos.
        </p>
        
        <div className="flex gap-4 mb-16">
          <Link to="/login">
            <Button size="lg" className="text-lg px-8">Começar Agora</Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline" className="text-lg px-8">Fazer Login</Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6 w-full max-w-5xl">
          <Card className="bg-white hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Gestão de Metas</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center text-base">
                Cadastre e acompanhe metas de projetos, obras e disciplinas em tempo real.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-white hover:shadow-lg transition-shadow">
            <CardHeader>
               <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Dashboards Completos</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center text-base">
                Visualize o progresso com gráficos e indicadores de desempenho detalhados.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-white hover:shadow-lg transition-shadow">
            <CardHeader>
               <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Controle de Revisões</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center text-base">
                Controle versões e revisões de documentos e projetos de forma organizada.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
