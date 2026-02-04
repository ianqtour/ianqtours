import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Edit, Bus, MessageCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase'

const BusManagement = () => {
  const [buses, setBuses] = useState([]);
  const [excursions, setExcursions] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    identification: '',
    excursionId: '',
    totalSeats: ''
  });
  const { toast } = useToast();
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    loadBuses();
    loadExcursions();
  }, []);

  const loadBuses = async () => {
    const { data: busRows } = await supabase.from('onibus').select('*')
    const mapped = (busRows || []).map((row) => ({
      id: row.id,
      name: row.nome,
      identification: row.identificacao || '',
      excursionId: row.excursao_id,
      totalSeats: Number(row.total_assentos),
      seats: [],
    }))
    const ids = mapped.map(b => b.id)
    if (ids.length > 0) {
      const { data: seatsData } = await supabase
        .from('assentos_onibus')
        .select('onibus_id, numero_assento, status')
        .in('onibus_id', ids)
      const seatsByBus = (seatsData || []).reduce((acc, s) => {
        const arr = acc[s.onibus_id] || []
        arr.push({ number: s.numero_assento, status: s.status === 'ocupado' ? 'occupied' : 'available' })
        acc[s.onibus_id] = arr
        return acc
      }, {})
      setBuses(mapped.map(b => ({ ...b, seats: seatsByBus[b.id] || [] })))
    } else {
      setBuses(mapped)
    }
  };

  const loadExcursions = async () => {
    const { data } = await supabase.from('excursoes').select('id, nome')
    setExcursions((data || []).map(e => ({ id: e.id, name: e.nome })))
  };

  const saveBuses = (data) => {
    setBuses(data);
  };

  const generateSeats = (totalSeats) => {
    return Array.from({ length: totalSeats }, (_, i) => ({ number: i + 1, status: 'available' }))
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      await supabase.from('onibus').update({
        nome: formData.name,
        identificacao: formData.identification,
        excursao_id: formData.excursionId,
        total_assentos: parseInt(formData.totalSeats),
      }).eq('id', editingId)
      await loadBuses()
      toast({
        title: "Ônibus Atualizado",
        description: "O ônibus foi atualizado com sucesso.",
      });
      setEditingId(null);
    } else {
      await supabase.from('onibus').insert({
        nome: formData.name,
        identificacao: formData.identification,
        excursao_id: formData.excursionId,
        total_assentos: parseInt(formData.totalSeats),
      })
      await loadBuses()
      toast({
        title: "Ônibus Criado",
        description: "Novo ônibus foi criado com sucesso.",
      });
    }

    setFormData({
      name: '',
      identification: '',
      excursionId: '',
      totalSeats: ''
    });
    setIsAdding(false);
  };

  const handleEdit = (bus) => {
    setFormData({
      name: bus.name,
      identification: bus.identification,
      excursionId: bus.excursionId,
      totalSeats: bus.totalSeats.toString()
    });
    setEditingId(bus.id);
    setIsAdding(true);
  };

  const requestDelete = (id) => {
    setConfirmDeleteId(id)
    setConfirmOpen(true)
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return
    await supabase.from('onibus').delete().eq('id', confirmDeleteId)
    await loadBuses()
    toast({
      title: "Ônibus Excluído",
      description: "O ônibus foi removido.",
    });
    setConfirmOpen(false)
    setConfirmDeleteId(null)
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      name: '',
      identification: '',
      excursionId: '',
      totalSeats: ''
    });
  };

  const getExcursionName = (excursionId) => {
    const excursion = excursions.find(e => e.id === excursionId);
    return excursion ? excursion.name : 'Desconhecida';
  };

  const getAvailableSeats = (bus) => {
    return (bus.seats || []).filter(seat => seat.status === 'available').length;
  };

  const getOccupiedSeats = (bus) => {
    return (bus.seats || []).filter(seat => seat.status === 'occupied').length;
  };

  const handleSendWhatsapp = async (busId) => {
    try {
      const response = await fetch('https://n8n-n8n.j6kpgx.easypanel.host/webhook/resumo_assentos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bus_id: busId }),
      });

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Solicitação enviada para o WhatsApp.",
          className: "bg-green-500 text-white border-none"
        });
      } else {
        throw new Error('Falha ao enviar');
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro",
        description: "Erro ao enviar solicitação.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {!isAdding ? (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">Ônibus</h2>
            <Button
              onClick={() => setIsAdding(true)}
              className="bg-[#ECAE62] hover:bg-[#8C641C] text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Ônibus
            </Button>
          </div>

          {buses.length === 0 ? (
            <div className="bg-white/5 rounded-xl p-12 text-center">
              <p className="text-white/70">Nenhum ônibus ainda. Crie o seu primeiro!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {buses.map((bus, index) => (
                <motion.div
                  key={bus.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white/5 rounded-xl p-4 border border-white/10"
                >
                  <div className="flex items-center mb-3">
                    <div className="bg-[#ECAE62] p-2 rounded-lg mr-3">
                      <Bus className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{bus.name}</h3>
                      <p className="text-white/60 text-sm">{bus.identification}</p>
                    </div>
                  </div>
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/70">Excursão:</span>
                      <span className="text-white">{getExcursionName(bus.excursionId)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/70">Total de Assentos:</span>
                      <span className="text-white">{bus.totalSeats}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/70">Disponíveis:</span>
                      <span className="text-green-400">{getAvailableSeats(bus)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleEdit(bus)}
                      size="sm"
                      className="flex-1 bg-[#ECAE62] hover:bg-[#8C641C] text-white"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      onClick={() => requestDelete(bus.id)}
                      size="sm"
                      className="flex-1 bg-white text-red-600 border border-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </Button>
                  </div>
                  <Button
                    onClick={() => handleSendWhatsapp(bus.id)}
                    size="sm"
                    className="w-full bg-green-600 hover:bg-green-700 text-white mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={getOccupiedSeats(bus) === 0}
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Enviar Whatsapp
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 rounded-xl p-6"
        >
          <h2 className="text-2xl font-bold text-white mb-6">
            {editingId ? 'Editar Ônibus' : 'Adicionar Novo Ônibus'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white">Nome do Ônibus</Label>
                <Select
                  value={formData.name}
                  onValueChange={(value) => setFormData({ ...formData, name: value })}
                  required
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Micro-ônibus">Micro-ônibus</SelectItem>
                    <SelectItem value="Ônibus">Ônibus</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="identification" className="text-white">Identificação</Label>
                <Input
                  id="identification"
                  value={formData.identification}
                  onChange={(e) => setFormData({ ...formData, identification: e.target.value })}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  placeholder="Ônibus 01"
                  required
                />
              </div>



              <div className="space-y-2">
                <Label htmlFor="excursion" className="text-white">Excursão</Label>
                <Select
                  value={formData.excursionId}
                  onValueChange={(value) => setFormData({ ...formData, excursionId: value })}
                  required
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Selecione a excursão" />
                  </SelectTrigger>
                  <SelectContent>
                    {excursions.map(excursion => (
                      <SelectItem key={excursion.id} value={excursion.id}>
                        {excursion.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="seats" className="text-white">Total de Assentos</Label>
                <Select
                  value={formData.totalSeats}
                  onValueChange={(value) => setFormData({ ...formData, totalSeats: value })}
                  required
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Selecione o total" />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.name === 'Micro-ônibus' ? (
                      <SelectItem value="30">30</SelectItem>
                    ) : (
                      <>
                        <SelectItem value="46">46</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="60">60</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                className="flex-1 bg-[#ECAE62] hover:bg-[#8C641C] text-white"
              >
                {editingId ? 'Atualizar Ônibus' : 'Criar Ônibus'}
              </Button>
              <Button
                type="button"
                onClick={handleCancel}
                className="flex-1 bg-white text-[#0F172A] hover:bg-gray-100"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </motion.div>
      )}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-[#0F172A] text-white">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Confirmar exclusão</DialogTitle>
            <DialogDescription className="text-white/80 text-sm">
              Essa ação não pode ser desfeita. Tem certeza que deseja excluir este ônibus?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 sm:gap-2">
            <Button onClick={() => setConfirmOpen(false)} className="flex-1 bg-white text-[#0F172A] hover:bg-gray-100 text-sm sm:text-base">Cancelar</Button>
            <Button onClick={handleDelete} className="flex-1 bg-red-600 text-white hover:bg-red-700 text-sm sm:text-base">Confirmar exclusão</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusManagement;