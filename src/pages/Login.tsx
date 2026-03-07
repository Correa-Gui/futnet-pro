import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      toast.error('Erro ao entrar', { description: 'E-mail ou senha inválidos.' });
      return;
    }

    toast.success('Bem-vindo!');
    navigate('/');
  };

  return (
    <div className="flex min-h-screen">
      {/* Branding panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-secondary/70 items-center justify-center p-12">
        {/* Decorative net pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.07]" viewBox="0 0 400 400">
          <defs>
            <pattern id="net" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M0 20h40M20 0v40" stroke="white" strokeWidth="1" fill="none" />
            </pattern>
          </defs>
          <rect width="400" height="400" fill="url(#net)" />
        </svg>
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-secondary/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-primary-foreground/10 blur-3xl" />

        <div className="relative z-10 text-center space-y-8">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-primary-foreground/15 backdrop-blur-sm border border-primary-foreground/20 shadow-2xl">
            <span className="text-5xl font-bold text-primary-foreground font-brand">FV</span>
          </div>
          <div>
            <h1 className="text-4xl font-bold text-primary-foreground font-brand">
              FutVôlei Arena
            </h1>
            <p className="mt-3 text-lg text-primary-foreground/80 max-w-sm mx-auto leading-relaxed">
              Gerencie suas quadras, turmas e alunos em um só lugar.
            </p>
          </div>
          <div className="flex items-center justify-center gap-6 text-primary-foreground/60 text-sm">
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl font-bold text-primary-foreground font-brand">100%</span>
              <span>Digital</span>
            </div>
            <div className="h-8 w-px bg-primary-foreground/20" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl font-bold text-primary-foreground" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>24/7</span>
              <span>Acesso</span>
            </div>
            <div className="h-8 w-px bg-primary-foreground/20" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl font-bold text-primary-foreground" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>PIX</span>
              <span>Integrado</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile branding */}
          <div className="lg:hidden text-center space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
              <span className="text-2xl font-bold text-primary-foreground" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>FV</span>
            </div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>
              FutVôlei Arena
            </h1>
          </div>

          <Card className="border-border/50 shadow-xl">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl font-bold">Entrar na sua conta</CardTitle>
              <CardDescription>Preencha seus dados para continuar</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Senha</Label>
                    <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                      Esqueceu a senha?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button type="submit" className="w-full h-11 text-base font-semibold shadow-md hover:shadow-lg transition-shadow" disabled={isLoading}>
                  {isLoading ? 'Entrando...' : 'Entrar'}
                </Button>
                <p className="text-sm text-muted-foreground">
                  Não tem conta?{' '}
                  <Link to="/cadastro" className="text-primary font-medium hover:underline">
                    Cadastre-se
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
