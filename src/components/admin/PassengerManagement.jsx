import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Search, Pencil, Phone, Calendar, User, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';

const PassengerManagement = () => {
  const [passengers, setPassengers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [currentPassenger, setCurrentPassenger] = useState(null);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [cpfError, setCpfError] = useState(false);
  const itemsPerPage = 15;
  const { toast } = useToast();

  // Campos do formulário de edição
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    data_nascimento: ''
  });

  useEffect(() => {
    fetchPassengers();
  }, []);

  const fetchPassengers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('passageiros')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      setPassengers(data || []);
    } catch (error) {
      console.error('Erro ao buscar passageiros:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a lista de passageiros.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const validateCPF = (cpf) => {
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf === '') return false;
    // Elimina CPFs invalidos conhecidos
    if (cpf.length !== 11 ||
      cpf === "00000000000" ||
      cpf === "11111111111" ||
      cpf === "22222222222" ||
      cpf === "33333333333" ||
      cpf === "44444444444" ||
      cpf === "55555555555" ||
      cpf === "66666666666" ||
      cpf === "77777777777" ||
      cpf === "88888888888" ||
      cpf === "99999999999")
      return false;
    // Valida 1o digito
    let add = 0;
    for (let i = 0; i < 9; i++)
      add += parseInt(cpf.charAt(i)) * (10 - i);
    let rev = 11 - (add % 11);
    if (rev === 10 || rev === 11)
      rev = 0;
    if (rev !== parseInt(cpf.charAt(9)))
      return false;
    // Valida 2o digito
    add = 0;
    for (let i = 0; i < 10; i++)
      add += parseInt(cpf.charAt(i)) * (11 - i);
    rev = 11 - (add % 11);
    if (rev === 10 || rev === 11)
      rev = 0;
    if (rev !== parseInt(cpf.charAt(10)))
      return false;
    return true;
  };

  const maskCPF = (value) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const maskPhone = (value) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d)(\d{4})(\d{4})/, '$1 $2-$3')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const handleEdit = (passenger) => {
    setCurrentPassenger(passenger);
    setFormData({
      nome: (passenger.nome || '').toUpperCase(),
      cpf: maskCPF(passenger.cpf || ''),
      telefone: maskPhone(passenger.telefone || ''),
      data_nascimento: passenger.data_nascimento || ''
    });
    // Validar CPF inicial ao abrir
    if (passenger.cpf) {
      setCpfError(!validateCPF(passenger.cpf));
    } else {
      setCpfError(false);
    }
    setEditOpen(true);
  };

  const handleNameChange = (e) => {
    const value = e.target.value.toUpperCase();
    setFormData(prev => ({ ...prev, nome: value }));
  };

  const handleCpfChange = (e) => {
    const value = maskCPF(e.target.value);
    setFormData(prev => ({ ...prev, cpf: value }));
    
    if (value.length >= 14) { // Tamanho completo com máscara
        setCpfError(!validateCPF(value));
    } else {
        setCpfError(false); // Limpa erro enquanto digita ou se estiver vazio
    }
  };

  const handlePhoneChange = (e) => {
    const value = maskPhone(e.target.value);
    setFormData(prev => ({ ...prev, telefone: value }));
  };

  const handleSave = async () => {
    if (!currentPassenger) return;
    
    // Validar CPF antes de salvar
    if (formData.cpf && !validateCPF(formData.cpf)) {
        setCpfError(true);
        toast({
            title: 'CPF Inválido',
            description: 'Por favor, corrija o CPF antes de salvar.',
            variant: 'destructive',
        });
        return;
    }

    setSaving(true);

    try {
      const cleanCPF = formData.cpf.replace(/\D/g, '');
      const cleanPhone = formData.telefone; // Manter formatação se desejar ou limpar

      const { error } = await supabase
        .from('passageiros')
        .update({
          nome: formData.nome,
          cpf: cleanCPF,
          telefone: cleanPhone,
          data_nascimento: formData.data_nascimento || null
        })
        .eq('id', currentPassenger.id);

      if (error) throw error;

      setPassengers(passengers.map(p => 
        p.id === currentPassenger.id 
          ? { 
              ...p, 
              nome: formData.nome,
              cpf: cleanCPF,
              telefone: cleanPhone,
              data_nascimento: formData.data_nascimento 
            } 
          : p
      ));

      setEditOpen(false);
      toast({
        title: 'Sucesso',
        description: 'Dados do passageiro atualizados.',
      });
    } catch (error) {
      console.error('Erro ao atualizar passageiro:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar os dados.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredPassengers = passengers.filter(p => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (p.nome && p.nome.toLowerCase().includes(searchLower)) ||
      (p.cpf && p.cpf.includes(searchTerm)) ||
      (p.telefone && p.telefone.includes(searchTerm))
    );
  });

  // Paginação
  const totalPages = Math.ceil(filteredPassengers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPassengers = filteredPassengers.slice(startIndex, startIndex + itemsPerPage);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  useEffect(() => {
    setCurrentPage(1); // Resetar para página 1 quando a busca muda
  }, [searchTerm]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    } catch (e) {
        return dateStr;
    }
  };

  const formatCPFDisplay = (cpf) => {
    if (!cpf) return 'Não informado';
    const cleanCPF = cpf.replace(/\D/g, '');
    return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users className="h-6 w-6 text-[#ECAE62]" />
          Gerenciamento de Passageiros
        </h2>
        <div className="text-white/70">
          Total: <span className="text-white font-bold">{filteredPassengers.length}</span>
        </div>
      </div>

      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 h-4 w-4" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, CPF ou telefone..."
            className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 w-full md:w-96"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12 text-white/50">
            Carregando passageiros...
          </div>
        ) : filteredPassengers.length === 0 ? (
          <div className="col-span-full text-center py-12 text-white/50 bg-white/5 rounded-xl border border-white/10">
            Nenhum passageiro encontrado.
          </div>
        ) : (
          paginatedPassengers.map((passenger, index) => (
            <motion.div
              key={passenger.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white/5 rounded-xl p-5 border border-white/10 hover:border-[#ECAE62]/50 transition-colors group"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3 w-full">
                    <div className="h-10 w-10 rounded-full bg-[#ECAE62]/20 flex items-center justify-center text-[#ECAE62] flex-shrink-0">
                        <User className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-white text-base leading-tight truncate" title={passenger.nome}>
                          {passenger.nome}
                        </h3>
                    </div>
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-white/70">
                  <div className="w-6 flex justify-center mr-2">
                    <span className="text-[#ECAE62] font-bold text-xs">CPF</span>
                  </div>
                  <span>{formatCPFDisplay(passenger.cpf)}</span>
                </div>
                <div className="flex items-center text-sm text-white/70">
                  <div className="w-6 flex justify-center mr-2">
                    <Phone className="h-4 w-4 text-[#ECAE62]" />
                  </div>
                  <span>{passenger.telefone || 'Não informado'}</span>
                </div>
                <div className="flex items-center text-sm text-white/70">
                  <div className="w-6 flex justify-center mr-2">
                    <Calendar className="h-4 w-4 text-[#ECAE62]" />
                  </div>
                  <span>{formatDate(passenger.data_nascimento)}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-white/10">
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
                    onClick={() => handleEdit(passenger)}
                >
                  <Pencil className="h-3 w-3 mr-2" />
                  Editar
                </Button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Controles de Paginação */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="border-white/20 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-white/70 text-sm">
            Página <span className="text-white font-bold">{currentPage}</span> de <span className="text-white font-bold">{totalPages}</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="border-white/20 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 disabled:opacity-50"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Modal de Edição */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[#0F172A] border-white/20 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Passageiro</DialogTitle>
            <DialogDescription className="text-white/70">
              Atualize as informações do passageiro abaixo.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">Nome Completo</label>
              <Input
                value={formData.nome}
                onChange={handleNameChange}
                className="bg-white/10 border-white/20 text-white uppercase"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">CPF</label>
                <div className="relative">
                    <Input
                        value={formData.cpf}
                        onChange={handleCpfChange}
                        className={`bg-white/10 border-white/20 text-white ${cpfError ? 'border-red-500 focus:ring-red-500' : ''}`}
                        maxLength={14}
                    />
                    {cpfError && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500">
                            <AlertCircle className="h-4 w-4" />
                        </div>
                    )}
                </div>
                {cpfError && <p className="text-xs text-red-400 mt-1">CPF inválido</p>}
                </div>
                <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">Telefone</label>
                <Input
                    value={formData.telefone}
                    onChange={handlePhoneChange}
                    className="bg-white/10 border-white/20 text-white"
                    maxLength={16} // (11) 9 1234-5678
                />
                </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">Data de Nascimento</label>
              <Input
                type="date"
                value={formData.data_nascimento}
                onChange={(e) => setFormData({...formData, data_nascimento: e.target.value})}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} className="bg-transparent border-white/20 text-white hover:bg-white/10">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || cpfError} className="bg-[#ECAE62] text-[#0B1420] hover:bg-[#d49a55] disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PassengerManagement;
