import React from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const { login } = useAuth();
  const loginMutation = useLogin();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate({ data }, {
      onSuccess: (res) => {
        login(res.accessToken, res.refreshToken);
        toast.success("Login efetuado com sucesso");
      },
      onError: (err: any) => {
        toast.error(err?.message || "Falha ao entrar");
      }
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded bg-primary flex items-center justify-center text-primary-foreground mb-2 shadow-lg shadow-primary/20">
            <ShieldAlert size={24} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Entrar no CamWatch</h1>
          <p className="text-sm text-muted-foreground">Informe suas credenciais para acessar a central de monitoramento</p>
        </div>

        <div className="bg-card border border-border p-6 rounded-lg shadow-xl shadow-black/50">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="operador@empresa.com"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
              {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Entrar
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Não tem uma conta?{" "}
          <Link href="/register">
            <span className="text-primary hover:underline cursor-pointer">Cadastrar empresa</span>
          </Link>
        </p>
      </div>
    </div>
  );
}
