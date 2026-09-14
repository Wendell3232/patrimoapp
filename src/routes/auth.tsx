import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Patrimo" },
      {
        name: "description",
        content: "Acesse sua conta Patrimo para acompanhar patrimônio, despesas, cartões e metas.",
      },
      { property: "og:title", content: "Entrar — Patrimo" },
      {
        property: "og:description",
        content: "Acesse sua conta Patrimo para acompanhar patrimônio, despesas, cartões e metas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z
  .string()
  .trim()
  .min(1, "Informe seu e-mail.")
  .email("E-mail inválido.")
  .max(255, "E-mail muito longo.");
const passwordSchema = z
  .string()
  .min(8, "A senha precisa ter ao menos 8 caracteres.")
  .max(72, "A senha pode ter no máximo 72 caracteres.");
const nameSchema = z.string().trim().min(2, "Informe seu nome.").max(80, "Nome muito longo.");

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"entrar" | "criar">("entrar");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  function validate(): boolean {
    const next: Record<string, string> = {};
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) next["email"] = emailResult.error.issues[0]?.message ?? "";
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) next["password"] = passwordResult.error.issues[0]?.message ?? "";
    if (mode === "criar") {
      const nameResult = nameSchema.safeParse(name);
      if (!nameResult.success) next["name"] = nameResult.error.issues[0]?.message ?? "";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (mode === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          toast.error(
            error.message.toLowerCase().includes("invalid")
              ? "E-mail ou senha incorretos."
              : "Não foi possível entrar. Tente novamente.",
          );
          return;
        }
        navigate({ to: "/dashboard", replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name.trim() },
          },
        });
        if (error) {
          toast.error(
            error.message.toLowerCase().includes("already")
              ? "Este e-mail já possui conta. Faça login."
              : "Não foi possível criar a conta. Tente novamente.",
          );
          return;
        }
        if (!data.session) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (signInError) {
            toast.error("Conta criada. Entre com seu e-mail e senha.");
            return;
          }
        }
        navigate({ to: "/onboarding", replace: true });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/auth-callback`,
    });
    if (result.error) {
      setLoading(false);
      toast.error("Não foi possível entrar com o Google.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_1fr]">
      <section className="hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <Link to="/" className="flex items-center gap-3 font-display text-xl font-semibold">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-foreground font-bold text-primary">
            P
          </span>
          Patrimo
        </Link>
        <div className="max-w-md space-y-6">
          <h1 className="font-display text-4xl leading-tight">
            Seu patrimônio, mês a mês, com clareza absoluta.
          </h1>
          <p className="text-sm leading-relaxed text-primary-foreground/75">
            Patrimônio contínuo entre meses, receitas e despesas do período, transferências neutras
            e cartões com parcelas projetadas automaticamente.
          </p>
          <ul className="space-y-3 text-sm text-primary-foreground/85">
            <li className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-positive" />
              Dados isolados por usuário
            </li>
            <li className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-positive" />
              Sem conexão com bancos externos
            </li>
          </ul>
        </div>
        
      </section>

      <section className="relative flex items-center justify-center px-5 py-12 sm:px-8">
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-elevated sm:p-8 lg:border-0 lg:shadow-none">
          <Link
            to="/"
            className="flex items-center gap-2 font-display text-xl font-semibold lg:hidden"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
              P
            </span>
            Patrimo
          </Link>
          <h2 className="mt-6 font-display text-2xl font-semibold">
            {mode === "entrar" ? "Entrar na sua conta" : "Criar sua conta"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "entrar"
              ? "Use seu e-mail e senha ou entre com o Google."
              : "Leva menos de um minuto para começar."}
          </p>

          <Tabs
            value={mode}
            onValueChange={(value) => {
              setMode(value as "entrar" | "criar");
              setErrors({});
            }}
            className="mt-6"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="entrar">Entrar</TabsTrigger>
              <TabsTrigger value="criar">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value={mode} className="mt-6">
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {mode === "criar" && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome completo</Label>
                    <Input
                      id="name"
                      value={name}
                      maxLength={80}
                      onChange={(e) => setName(e.target.value)}
                      aria-invalid={Boolean(errors["name"])}
                    />
                    {errors["name"] && <p className="text-xs text-destructive">{errors["name"]}</p>}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    maxLength={255}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={Boolean(errors["email"])}
                  />
                  {errors["email"] && <p className="text-xs text-destructive">{errors["email"]}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete={mode === "entrar" ? "current-password" : "new-password"}
                      value={password}
                      maxLength={72}
                      onChange={(e) => setPassword(e.target.value)}
                      aria-invalid={Boolean(errors["password"])}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors["password"] && (
                    <p className="text-xs text-destructive">{errors["password"]}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {mode === "entrar" ? "Entrar" : "Criar conta"}
                </Button>
              </form>

              <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                ou
                <span className="h-px flex-1 bg-border" />
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogle}
                disabled={loading}
              >
                Continuar com Google
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </main>
  );
}
