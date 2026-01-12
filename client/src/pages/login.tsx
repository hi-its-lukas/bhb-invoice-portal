import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Receipt, Lock, User } from "lucide-react";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [registerData, setRegisterData] = useState({ username: "", password: "", displayName: "" });

  const loginMutation = useMutation({
    mutationFn: (data: { username: string; password: string }) =>
      apiRequest("POST", "/api/auth/login", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Erfolgreich angemeldet",
        description: "Willkommen zurück!",
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Anmeldung fehlgeschlagen",
        description: error.message || "Bitte überprüfen Sie Ihre Zugangsdaten.",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: { username: string; password: string; displayName?: string }) =>
      apiRequest("POST", "/api/auth/register", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Konto erstellt",
        description: "Ihr Konto wurde erfolgreich angelegt.",
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Registrierung fehlgeschlagen",
        description: error.message || "Bitte versuchen Sie es erneut.",
        variant: "destructive",
      });
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginData);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate(registerData);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Receipt className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">BHB Debitorenportal</CardTitle>
          <CardDescription>
            Rechnungs- und Mahnwesen für BuchhaltungsButler
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login" data-testid="tab-login">Anmelden</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">Registrieren</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-username">Benutzername</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-username"
                      type="text"
                      placeholder="Ihr Benutzername"
                      className="pl-10"
                      value={loginData.username}
                      onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                      data-testid="input-login-username"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Passwort</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Ihr Passwort"
                      className="pl-10"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      data-testid="input-login-password"
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loginMutation.isPending}
                  data-testid="button-login"
                >
                  {loginMutation.isPending ? "Anmelden..." : "Anmelden"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4" autoComplete="off">
                <div className="space-y-2">
                  <Label htmlFor="register-username">Benutzername</Label>
                  <Input
                    id="register-username"
                    type="text"
                    autoComplete="username"
                    placeholder="Wählen Sie einen Benutzernamen"
                    value={registerData.username}
                    onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                    data-testid="input-register-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">Passwort</Label>
                  <Input
                    id="register-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Mind. 6 Zeichen"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    data-testid="input-register-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-displayname">Anzeigename (optional)</Label>
                  <Input
                    id="register-displayname"
                    type="text"
                    autoComplete="name"
                    placeholder="Ihr Name (z.B. Max Mustermann)"
                    value={registerData.displayName}
                    onChange={(e) => setRegisterData({ ...registerData, displayName: e.target.value })}
                    data-testid="input-register-displayname"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={registerMutation.isPending}
                  data-testid="button-register"
                >
                  {registerMutation.isPending ? "Registrieren..." : "Konto erstellen"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Der erste registrierte Benutzer wird automatisch Administrator.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
