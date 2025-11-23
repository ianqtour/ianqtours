import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Lock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase'

const AdminLogin = ({ onLogin, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast({
        title: "Falha no Login",
        description: "E-mail ou senha inválidos",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Login bem-sucedido",
      description: "Bem-vindo ao Painel de Administração da IanqTour",
    });
    onLogin(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-2xl">
          

          <div className="flex items-center justify-center mb-8">
            <div className="bg-[#ECAE62] p-4 rounded-full">
              <Lock className="h-8 w-8 text-white" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-white text-center mb-2">Login do Administrador</h1>
          <p className="text-white/70 text-center mb-8">Insira suas credenciais para acessar o painel de administração</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                placeholder="Digite seu e-mail"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                placeholder="Digite a senha"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-[#ECAE62] hover:bg-[#8C641C] text-white font-semibold"
            >
              Entrar
            </Button>
          </form>

          <div className="mt-6 p-4 bg-white/5 rounded-lg">
            <p className="text-white/60 text-sm text-center">
              Use suas credenciais cadastradas para acessar.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;