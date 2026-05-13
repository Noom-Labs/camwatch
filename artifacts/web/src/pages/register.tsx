import React from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";

const registerSchema = z.object({
  tenantName: z.string().min(2, "Nome da empresa é obrigatório"),
  name: z.string().min(2, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "A senha deve ter no mínimo 8 caracteres"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const { login } = useAuth();
  const registerMutation = useRegister();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { tenantName: "", name: "", email: "", password: "" },
  });

  const onSubmit = (data: RegisterFormValues) => {
    registerMutation.mutate({ data }, {
      onSuccess: (res) => {
        login(res.accessToken, res.refreshToken);
        toast.success("Conta criada com sucesso");
      },
      onError: (err: any) => {
        toast.error(err?.message || "Falha ao cadastrar");
      }
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded bg-primary flex items-center justify-center text-primary-foreground mb-2 shadow-lg shadow-primary/20">
            <ShieldAlert size={24} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Criar conta no CamWatch</h1>
          <p className="text-sm text-muted-foreground">Configure um novo workspace para sua organização</p>
        </div>

        <div className="bg-card border border-border p-6 rounded-lg shadow-xl shadow-black/50">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tenantName">Nome da empresa / organização</Label>
              <Input
                id="tenantName"
                placeholder="Acme Segurança"
                {...form.register("tenantName")}
              />
              {form.formState.errors.tenantName && (
                <p className="text-sm text-destructive">{form.formState.errors.tenantName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Seu nome</Label>
              <Input
                id="name"
                placeholder="João Silva"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail corporativo</Label>
              <Input
                id="email"
                type="email"
                placeholder="joao@empresa.com"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
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

            <Button type="submit" className="w-full mt-6" disabled={registerMutation.isPending}>
              {registerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar workspace
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Já tem uma conta?{" "}
          <Link href="/login">
            <span className="text-primary hover:underline cursor-pointer">Entrar</span>
          </Link>
        </p>
      </div>
    </div>
  );
}
