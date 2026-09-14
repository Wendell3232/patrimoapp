import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

import { ThemeToggle } from "@/components/app/ThemeToggle";
import { Button } from "@/components/ui/button";

type LegalLayoutProps = {
  title: string;
  updatedAt: string;
  children: ReactNode;
};

export function LegalLayout({ title, updatedAt, children }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3 font-display text-lg font-semibold">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              P
            </span>
            Patrimo
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm" variant="outline">
              <Link to="/auth">Entrar</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-10 sm:px-6 sm:py-14">
        <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Última atualização: {updatedAt}</p>
        <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground [&_li]:ml-4 [&_li]:list-disc [&_strong]:text-foreground [&_ul]:mt-2 [&_ul]:space-y-1.5">
          {children}
        </div>
        <nav className="mt-12 flex flex-wrap gap-4 border-t border-border pt-6 text-sm">
          <Link to="/termos" className="text-primary hover:underline">
            Termos de Uso
          </Link>
          <Link to="/privacidade" className="text-primary hover:underline">
            Política de Privacidade e LGPD
          </Link>
          <Link to="/" className="text-muted-foreground hover:underline">
            Voltar ao início
          </Link>
        </nav>
      </main>
    </div>
  );
}
