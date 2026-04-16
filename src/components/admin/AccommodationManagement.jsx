import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import {
  Plus, Trash2, Edit, ArrowLeft, BedDouble, Users, UserPlus, UserMinus,
  DoorOpen, Hotel, CheckCircle, Loader2, X, Search, FileText, Send
} from 'lucide-react';

const AccommodationManagement = () => {
  const { toast } = useToast();

  // --- State ---
  const [excursions, setExcursions] = useState([]);
  const [selectedExcursionId, setSelectedExcursionId] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [passengers, setPassengers] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(false);

  // Room form
  const [roomFormOpen, setRoomFormOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [roomName, setRoomName] = useState('');
  const [roomCapacity, setRoomCapacity] = useState('');
  const [savingRoom, setSavingRoom] = useState(false);

  // Delete room
  const [deleteRoomId, setDeleteRoomId] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Allocate passenger
  const [allocateRoomId, setAllocateRoomId] = useState(null);
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [passengerSearch, setPassengerSearch] = useState('');

  // Remove allocation
  const [removeAllocation, setRemoveAllocation] = useState(null);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  
  // Send report
  const [sendingReport, setSendingReport] = useState(false);

  // --- Load excursions with hospedagem ---
  useEffect(() => {
    loadExcursions();
  }, []);

  const loadExcursions = async () => {
    const { data } = await supabase
      .from('excursoes')
      .select('id, nome, destino, horario_partida, hospedagem, status')
      .eq('hospedagem', true)
      .in('status', ['active', 'completed'])
      .order('horario_partida', { ascending: false });
    setExcursions(data || []);
  };

  // --- Load rooms & passengers when excursion selected ---
  useEffect(() => {
    if (selectedExcursionId) {
      loadRoomsAndPassengers();
    } else {
      setRooms([]);
      setPassengers([]);
      setAllocations([]);
    }
  }, [selectedExcursionId]);

  const loadRoomsAndPassengers = async () => {
    if (!selectedExcursionId) return;
    setLoading(true);
    try {
      // Load rooms for excursion
      const { data: roomData } = await supabase
        .from('hospedagem_quartos')
        .select('*')
        .eq('excursao_id', selectedExcursionId)
        .order('nome', { ascending: true });
      setRooms(roomData || []);

      // Load allocations
      const roomIds = (roomData || []).map(r => r.id);
      let allocs = [];
      if (roomIds.length > 0) {
        const { data: allocData } = await supabase
          .from('hospedagem_alocacoes')
          .select('*')
          .in('quarto_id', roomIds);
        allocs = allocData || [];
      }
      setAllocations(allocs);

      // Load passengers of this excursion (from reservas + passageiros_reserva)
      const { data: resData } = await supabase
        .from('reservas')
        .select('id')
        .eq('excursao_id', selectedExcursionId)
        .neq('status', 'cancelada');

      const resIds = (resData || []).map(r => r.id);
      let paxList = [];
      if (resIds.length > 0) {
        // Fetch in chunks of 50
        const CHUNK = 50;
        let paxRes = [];
        for (let i = 0; i < resIds.length; i += CHUNK) {
          const chunk = resIds.slice(i, i + CHUNK);
          const { data: prData } = await supabase
            .from('passageiros_reserva')
            .select('passageiro_id')
            .in('reserva_id', chunk);
          paxRes = paxRes.concat(prData || []);
        }

        const paxIds = [...new Set(paxRes.map(p => p.passageiro_id).filter(Boolean))];
        if (paxIds.length > 0) {
          let allPax = [];
          for (let i = 0; i < paxIds.length; i += CHUNK) {
            const chunk = paxIds.slice(i, i + CHUNK);
            const { data: pData } = await supabase
              .from('passageiros')
              .select('id, nome, telefone')
              .in('id', chunk);
            allPax = allPax.concat(pData || []);
          }
          paxList = allPax;
        }
      }
      setPassengers(paxList);
    } catch (err) {
      console.error('Error loading rooms/passengers:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- Room CRUD ---
  const openNewRoomForm = () => {
    setEditingRoom(null);
    setRoomName('');
    setRoomCapacity('');
    setRoomFormOpen(true);
  };

  const openEditRoomForm = (room) => {
    setEditingRoom(room);
    setRoomName(room.nome);
    setRoomCapacity(String(room.capacidade));
    setRoomFormOpen(true);
  };

  const handleSaveRoom = async () => {
    if (!roomName.trim()) {
      toast({ title: 'Nome obrigatório', description: 'Informe o nome/número do quarto.', variant: 'destructive' });
      return;
    }
    const cap = parseInt(roomCapacity, 10);
    if (!cap || cap < 1) {
      toast({ title: 'Capacidade inválida', description: 'Informe a capacidade (mínimo 1).', variant: 'destructive' });
      return;
    }

    // Check if reducing capacity below current occupancy
    if (editingRoom) {
      const currentOccupancy = allocations.filter(a => a.quarto_id === editingRoom.id).length;
      if (cap < currentOccupancy) {
        toast({
          title: 'Capacidade inválida',
          description: `Já existem ${currentOccupancy} passageiros neste quarto. Remova passageiros antes de reduzir a capacidade.`,
          variant: 'destructive'
        });
        return;
      }
    }

    setSavingRoom(true);
    try {
      if (editingRoom) {
        const { error } = await supabase
          .from('hospedagem_quartos')
          .update({ nome: roomName.trim(), capacidade: cap })
          .eq('id', editingRoom.id);
        if (error) throw error;
        toast({ title: 'Quarto atualizado', description: `"${roomName}" foi atualizado.` });
      } else {
        const { error } = await supabase
          .from('hospedagem_quartos')
          .insert({ excursao_id: selectedExcursionId, nome: roomName.trim(), capacidade: cap });
        if (error) throw error;
        toast({ title: 'Quarto criado', description: `"${roomName}" foi adicionado.` });
      }
      setRoomFormOpen(false);
      await loadRoomsAndPassengers();
    } catch (err) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSavingRoom(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!deleteRoomId) return;
    try {
      // Delete allocations first
      await supabase.from('hospedagem_alocacoes').delete().eq('quarto_id', deleteRoomId);
      await supabase.from('hospedagem_quartos').delete().eq('id', deleteRoomId);
      toast({ title: 'Quarto removido', description: 'O quarto e suas alocações foram removidos.' });
      await loadRoomsAndPassengers();
    } catch (err) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setDeleteConfirmOpen(false);
      setDeleteRoomId(null);
    }
  };

  // --- Allocation ---
  const openAllocateModal = (roomId) => {
    setAllocateRoomId(roomId);
    setPassengerSearch('');
    setAllocateOpen(true);
  };

  const allocatedPassengerIds = useMemo(() => {
    return new Set(allocations.map(a => a.passageiro_id));
  }, [allocations]);

  const unallocatedPassengers = useMemo(() => {
    return passengers.filter(p => !allocatedPassengerIds.has(p.id));
  }, [passengers, allocatedPassengerIds]);

  const normalizeText = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const filteredUnallocated = useMemo(() => {
    if (!passengerSearch.trim()) return unallocatedPassengers;
    const q = normalizeText(passengerSearch);
    return unallocatedPassengers.filter(p => normalizeText(p.nome).includes(q));
  }, [unallocatedPassengers, passengerSearch]);

  const handleAllocatePassenger = async (passengerId) => {
    if (!allocateRoomId) return;
    const room = rooms.find(r => r.id === allocateRoomId);
    const roomAllocs = allocations.filter(a => a.quarto_id === allocateRoomId);
    if (room && roomAllocs.length >= room.capacidade) {
      toast({ title: 'Quarto cheio', description: 'Este quarto já está na capacidade máxima.', variant: 'destructive' });
      return;
    }
    try {
      const { error } = await supabase
        .from('hospedagem_alocacoes')
        .insert({ quarto_id: allocateRoomId, passageiro_id: passengerId });
      if (error) throw error;
      toast({ title: 'Passageiro alocado', description: 'Alocação realizada com sucesso.' });
      await loadRoomsAndPassengers();
    } catch (err) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const handleRemoveAllocation = async () => {
    if (!removeAllocation) return;
    try {
      const { error } = await supabase
        .from('hospedagem_alocacoes')
        .delete()
        .eq('id', removeAllocation.id);
      if (error) throw error;
      toast({ title: 'Passageiro removido', description: 'A alocação foi removida.' });
      await loadRoomsAndPassengers();
    } catch (err) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setRemoveConfirmOpen(false);
      setRemoveAllocation(null);
    }
  };

  // --- Webhook ---
  const handleSendReport = async () => {
    if (!selectedExcursionId) return;
    
    setSendingReport(true);
    try {
      const response = await fetch('https://n8n-n8n.j6kpgx.easypanel.host/webhook/hospedagem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          excursao_id: selectedExcursionId,
          nome_excursao: selectedExcursion?.nome,
          data_envio: new Date().toISOString()
        })
      });

      if (response.ok) {
        toast({
          title: 'Relatório enviado!',
          description: 'O relatório de hospedagem foi enviado com sucesso para processamento.'
        });
      } else {
        throw new Error('Falha ao enviar relatório para o webhook');
      }
    } catch (err) {
      console.error('Error sending report:', err);
      toast({
        title: 'Erro no envio',
        description: 'Não foi possível enviar o relatório. Verifique a conexão.',
        variant: 'destructive'
      });
    } finally {
      setSendingReport(false);
    }
  };

  // --- Helpers ---
  const getPassengerName = (id) => {
    const p = passengers.find(p => p.id === id);
    return p ? (p.nome || '').toUpperCase() : 'Desconhecido';
  };

  const getPassengerPhone = (id) => {
    const p = passengers.find(p => p.id === id);
    return p ? p.telefone || '' : '';
  };

  const selectedExcursion = excursions.find(e => e.id === selectedExcursionId);

  // --- Summary stats ---
  const totalRooms = rooms.length;
  const totalCapacity = rooms.reduce((sum, r) => sum + r.capacidade, 0);
  const totalOccupied = allocations.length;
  const totalAvailable = totalCapacity - totalOccupied;

  // --- Render ---
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Hotel className="h-6 w-6 text-[#ECAE62]" />
          Hospedagem
        </h2>
      </div>

      {/* Excursion Selector */}
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <Label className="text-white mb-2 block text-sm">Selecione a Excursão</Label>
        <Select
          value={selectedExcursionId ? String(selectedExcursionId) : ''}
          onValueChange={(v) => setSelectedExcursionId(v)}
        >
          <SelectTrigger className="bg-white/10 border-white/20 text-white max-w-lg">
            <SelectValue placeholder="Escolha uma excursão com hospedagem..." />
          </SelectTrigger>
          <SelectContent className="bg-[#0F172A] border-white/20 text-white">
            {excursions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-white/50">Nenhuma excursão com hospedagem.</div>
            ) : (
              excursions.map(e => (
                <SelectItem key={e.id} value={String(e.id)}>
                  {e.nome} — {e.destino}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#ECAE62]" />
        </div>
      )}

      {selectedExcursionId && !loading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-[#ECAE62]/20 to-[#ECAE62]/5 rounded-xl p-4 border border-[#ECAE62]/30">
              <div className="flex items-center gap-2 mb-1">
                <DoorOpen className="h-4 w-4 text-[#ECAE62]" />
                <span className="text-xs font-medium text-[#ECAE62]">Quartos</span>
              </div>
              <p className="text-2xl font-bold text-white">{totalRooms}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-xl p-4 border border-blue-500/30">
              <div className="flex items-center gap-2 mb-1">
                <BedDouble className="h-4 w-4 text-blue-400" />
                <span className="text-xs font-medium text-blue-400">Vagas Totais</span>
              </div>
              <p className="text-2xl font-bold text-white">{totalCapacity}</p>
            </div>
            <div className="bg-gradient-to-br from-green-500/20 to-green-500/5 rounded-xl p-4 border border-green-500/30">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-green-400" />
                <span className="text-xs font-medium text-green-400">Ocupadas</span>
              </div>
              <p className="text-2xl font-bold text-white">{totalOccupied}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 rounded-xl p-4 border border-purple-500/30">
              <div className="flex items-center gap-2 mb-1">
                <BedDouble className="h-4 w-4 text-purple-400" />
                <span className="text-xs font-medium text-purple-400">Disponíveis</span>
              </div>
              <p className="text-2xl font-bold text-white">{totalAvailable}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              onClick={handleSendReport}
              disabled={sendingReport}
              variant="outline"
              className="border-[#ECAE62]/50 text-[#ECAE62] hover:bg-[#ECAE62]/10"
            >
              {sendingReport ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-2 h-4 w-4" />
              )}
              Enviar Relatório
            </Button>

            <Button
              onClick={openNewRoomForm}
              className="bg-[#ECAE62] hover:bg-[#8C641C] text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Quarto
            </Button>
          </div>

          {/* Room Blocks */}
          {rooms.length === 0 ? (
            <div className="bg-white/5 rounded-xl p-12 text-center border border-white/10">
              <BedDouble className="h-12 w-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/50">Nenhum quarto cadastrado para esta excursão.</p>
              <p className="text-white/30 text-sm mt-1">Clique em "Adicionar Quarto" para começar.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {rooms.map((room) => {
                  const roomAllocs = allocations.filter(a => a.quarto_id === room.id);
                  const occupied = roomAllocs.length;
                  const available = room.capacidade - occupied;
                  const isFull = available <= 0;
                  const occupancyPercent = room.capacidade > 0 ? (occupied / room.capacidade) * 100 : 0;

                  return (
                    <motion.div
                      key={room.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`bg-white/5 rounded-xl border overflow-hidden ${
                        isFull ? 'border-green-500/40' : 'border-white/10'
                      }`}
                    >
                      {/* Room Header */}
                      <div className={`px-4 py-3 flex items-center justify-between ${
                        isFull
                          ? 'bg-green-500/10'
                          : 'bg-white/5'
                      }`}>
                        <div className="flex items-center gap-2">
                          <DoorOpen className={`h-5 w-5 ${isFull ? 'text-green-400' : 'text-[#ECAE62]'}`} />
                          <h3 className="text-lg font-bold text-white">{room.nome}</h3>
                          {isFull && (
                            <span className="text-[10px] font-bold bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30">
                              LOTADO
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10"
                            onClick={() => openEditRoomForm(room)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
                            onClick={() => { setDeleteRoomId(room.id); setDeleteConfirmOpen(true); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Occupancy Bar */}
                      <div className="px-4 pt-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-white/60">{occupied}/{room.capacidade} vagas</span>
                          <span className={`font-medium ${available > 0 ? 'text-purple-400' : 'text-green-400'}`}>
                            {available > 0 ? `${available} disponíve${available > 1 ? 'is' : 'l'}` : 'Completo'}
                          </span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${occupancyPercent}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            className={`h-full rounded-full ${
                              isFull
                                ? 'bg-gradient-to-r from-green-500 to-green-400'
                                : 'bg-gradient-to-r from-[#ECAE62] to-[#d4993d]'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Passengers List */}
                      <div className="p-4 space-y-2">
                        {roomAllocs.length === 0 ? (
                          <p className="text-white/30 text-sm text-center py-2">Nenhum passageiro alocado</p>
                        ) : (
                          roomAllocs.map((alloc) => (
                            <div
                              key={alloc.id}
                              className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 group"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="h-7 w-7 rounded-full bg-[#ECAE62]/20 flex items-center justify-center flex-shrink-0">
                                  <Users className="h-3.5 w-3.5 text-[#ECAE62]" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-white text-sm font-medium truncate">
                                    {getPassengerName(alloc.passageiro_id)}
                                  </p>
                                  {getPassengerPhone(alloc.passageiro_id) && (
                                    <p className="text-white/40 text-[11px] truncate">
                                      {getPassengerPhone(alloc.passageiro_id)}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-red-400/40 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => { setRemoveAllocation(alloc); setRemoveConfirmOpen(true); }}
                              >
                                <UserMinus className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))
                        )}

                        {/* Add passenger button */}
                        {!isFull && (
                          <Button
                            variant="ghost"
                            className="w-full border border-dashed border-white/20 text-white/50 hover:text-white hover:bg-white/5 hover:border-[#ECAE62]/50 mt-1"
                            onClick={() => openAllocateModal(room.id)}
                          >
                            <UserPlus className="mr-2 h-4 w-4" />
                            Adicionar Passageiro
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          {/* Unallocated passengers summary */}
          {unallocatedPassengers.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-yellow-400" />
                <h3 className="text-white font-semibold">
                  Passageiros sem quarto ({unallocatedPassengers.length})
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {unallocatedPassengers.map(p => (
                  <span
                    key={p.id}
                    className="bg-yellow-500/10 text-yellow-300 text-xs px-2.5 py-1 rounded-full border border-yellow-500/20"
                  >
                    {(p.nome || '').toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ======= MODALS ======= */}

      {/* Room Create/Edit Modal */}
      <Dialog open={roomFormOpen} onOpenChange={setRoomFormOpen}>
        <DialogContent className="bg-[#0F172A] text-white border-white/20 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRoom ? 'Editar Quarto' : 'Novo Quarto'}</DialogTitle>
            <DialogDescription className="text-white/60">
              {editingRoom
                ? 'Altere as informações do quarto.'
                : 'Informe o nome/número e a capacidade de vagas.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-white">Nome / Número do Quarto</Label>
              <Input
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                placeholder="Ex: Quarto 101, Suite A..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Capacidade (vagas)</Label>
              <Input
                type="number"
                min="1"
                value={roomCapacity}
                onChange={(e) => setRoomCapacity(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                placeholder="Ex: 2, 3, 4..."
              />
            </div>
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button
              onClick={() => setRoomFormOpen(false)}
              className="flex-1 bg-white text-[#0F172A] hover:bg-gray-100"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveRoom}
              disabled={savingRoom}
              className="flex-1 bg-[#ECAE62] hover:bg-[#8C641C] text-white"
            >
              {savingRoom ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingRoom ? 'Atualizar' : 'Criar Quarto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Room Confirmation */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="bg-[#0F172A] text-white border-white/20 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Quarto</DialogTitle>
            <DialogDescription className="text-white/60">
              Tem certeza? Todos os passageiros alocados neste quarto serão desvinculados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2">
            <Button
              onClick={() => setDeleteConfirmOpen(false)}
              className="flex-1 bg-white text-[#0F172A] hover:bg-gray-100"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDeleteRoom}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Allocate Passenger Modal */}
      <Dialog open={allocateOpen} onOpenChange={setAllocateOpen}>
        <DialogContent className="bg-[#0F172A] text-white border-white/20 sm:max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-[#ECAE62]" />
              Alocar Passageiro
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Selecione um passageiro para adicionar ao quarto.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input
              value={passengerSearch}
              onChange={(e) => setPassengerSearch(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 pl-9"
              placeholder="Buscar por nome..."
            />
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 max-h-[300px] pr-1">
            {filteredUnallocated.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-8 w-8 text-white/20 mx-auto mb-2" />
                <p className="text-white/40 text-sm">
                  {unallocatedPassengers.length === 0
                    ? 'Todos os passageiros já estão alocados!'
                    : 'Nenhum resultado encontrado.'}
                </p>
              </div>
            ) : (
              filteredUnallocated.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleAllocatePassenger(p.id)}
                  className="w-full flex items-center gap-3 bg-white/5 hover:bg-[#ECAE62]/10 border border-white/10 hover:border-[#ECAE62]/40 rounded-lg px-3 py-2.5 transition-all text-left group"
                >
                  <div className="h-8 w-8 rounded-full bg-[#ECAE62]/20 flex items-center justify-center flex-shrink-0 group-hover:bg-[#ECAE62]/30">
                    <Users className="h-4 w-4 text-[#ECAE62]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-medium truncate">{(p.nome || '').toUpperCase()}</p>
                    {p.telefone && (
                      <p className="text-white/40 text-[11px]">{p.telefone}</p>
                    )}
                  </div>
                  <Plus className="h-4 w-4 text-[#ECAE62] opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Allocation Confirmation */}
      <Dialog open={removeConfirmOpen} onOpenChange={setRemoveConfirmOpen}>
        <DialogContent className="bg-[#0F172A] text-white border-white/20 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover do Quarto</DialogTitle>
            <DialogDescription className="text-white/60">
              Deseja remover <span className="text-white font-medium">{removeAllocation ? getPassengerName(removeAllocation.passageiro_id) : ''}</span> deste quarto?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2">
            <Button
              onClick={() => setRemoveConfirmOpen(false)}
              className="flex-1 bg-white text-[#0F172A] hover:bg-gray-100"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRemoveAllocation}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccommodationManagement;
