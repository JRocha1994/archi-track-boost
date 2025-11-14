import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { Moon, Sun, Upload, X, User, Mail, Calendar } from 'lucide-react';

interface UserData {
  email: string;
  nome: string;
  createdAt: string;
}

export default function Configuracoes() {
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  useEffect(() => {
    const savedLogo = localStorage.getItem('company_logo');
    if (savedLogo) {
      setCompanyLogo(savedLogo);
    }
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserData({
          email: user.email || '',
          nome: user.user_metadata?.nome || 'Não informado',
          createdAt: new Date(user.created_at).toLocaleDateString('pt-BR'),
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione uma imagem válida',
        variant: 'destructive',
      });
      return;
    }

    // Validar tamanho (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Erro',
        description: 'A imagem deve ter no máximo 2MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setCompanyLogo(base64String);
      localStorage.setItem('company_logo', base64String);
      window.dispatchEvent(new Event('company_logo_updated'));
      setIsUploading(false);
      toast({
        title: 'Logo atualizada com sucesso!',
      });
    };
    reader.onerror = () => {
      setIsUploading(false);
      toast({
        title: 'Erro ao fazer upload',
        description: 'Não foi possível ler o arquivo',
        variant: 'destructive',
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setCompanyLogo(null);
    localStorage.removeItem('company_logo');
    window.dispatchEvent(new Event('company_logo_updated'));
    toast({
      title: 'Logo removida com sucesso!',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Personalize a aparência e configurações da plataforma
        </p>
      </div>

      <div className="grid gap-6">
        {/* Informações da Conta */}
        <Card>
          <CardHeader>
            <CardTitle>Informações da Conta</CardTitle>
            <CardDescription>
              Detalhes sobre sua conta e perfil
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {userData && (
              <>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Nome</p>
                    <p className="text-sm text-muted-foreground">{userData.nome}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">E-mail</p>
                    <p className="text-sm text-muted-foreground">{userData.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Membro desde</p>
                    <p className="text-sm text-muted-foreground">{userData.createdAt}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Tema */}
        <Card>
          <CardHeader>
            <CardTitle>Aparência</CardTitle>
            <CardDescription>
              Escolha entre o modo claro ou escuro
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Tema</Label>
                <p className="text-sm text-muted-foreground">
                  Modo {theme === 'light' ? 'Claro' : 'Escuro'}
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={toggleTheme}
              >
                {theme === 'light' ? (
                  <Moon className="h-5 w-5" />
                ) : (
                  <Sun className="h-5 w-5" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Logo da Empresa */}
        <Card>
          <CardHeader>
            <CardTitle>Logo da Empresa</CardTitle>
            <CardDescription>
              Faça upload da logo da sua empresa (máx. 2MB)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {companyLogo ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <img
                    src={companyLogo}
                    alt="Logo da empresa"
                    className="h-20 w-auto max-w-xs object-contain border rounded-lg p-2"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleRemoveLogo}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={isUploading}
                  className="hidden"
                />
                <Label
                  htmlFor="logo-upload"
                  className="cursor-pointer"
                >
                  <Button
                    variant="outline"
                    disabled={isUploading}
                    asChild
                  >
                    <span>
                      <Upload className="mr-2 h-4 w-4" />
                      {isUploading ? 'Enviando...' : 'Fazer Upload'}
                    </span>
                  </Button>
                </Label>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Formatos aceitos: PNG, JPG, SVG. Tamanho máximo: 2MB
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
