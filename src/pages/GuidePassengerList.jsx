import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, MapPin, Calendar, Bus, CheckCircle, X, Phone, User, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

const GuidePassengerList = () => {
  const { busId } = useParams();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [bus, setBus] = useState(null);
  const [excursion, setExcursion] = useState(null);
  const [passengers, setPassengers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'present', 'pending'
  const [updatingId, setUpdatingId] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedPassenger, setSelectedPassenger] = useState(null);

  useEffect(() => {
    if (busId) {
      fetchData();
    }
  }, [busId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Bus Info
      const { data: busData, error: busError } = await supabase
        .from('onibus')
        .select('*')
        .eq('id', busId)
        .single();
      
      if (busError) throw busError;
      setBus(busData);

      // 2. Fetch Excursion Info
      if (busData.excursao_id) {
        const { data: excData, error: excError } = await supabase
          .from('excursoes')
          .select('*')
          .eq('id', busData.excursao_id)
          .single();
        
        if (excError) throw excError;
        setExcursion(excData);
      }

      // 3. Fetch Reservations for this bus
      const { data: reservations, error: resError } = await supabase
        .from('reservas')
        .select('id')
        .eq('onibus_id', busId)
        .neq('status', 'cancelada');

      if (resError) throw resError;

      const reservationIds = reservations.map(r => r.id);

      if (reservationIds.length > 0) {
        // 4. Fetch Passenger Reservations (Seat & Presence)
        const { data: paxResData, error: paxResError } = await supabase
          .from('passageiros_reserva')
          .select('*')
          .in('reserva_id', reservationIds)
          .neq('is_guide', true);

        if (paxResError) throw paxResError;

        // 5. Fetch Passenger Details
        const passengerIds = paxResData.map(p => p.passageiro_id);
        const { data: paxData, error: paxError } = await supabase
          .from('passageiros')
          .select('*')
          .in('id', passengerIds);

        if (paxError) throw paxError;

        // 6. Merge Data
        const mergedPassengers = paxResData.map(pr => {
          const details = paxData.find(p => p.id === pr.passageiro_id);
          return {
            ...pr, // contains id (pax_res id), seat number, presence
            details: details || {}, // contains name, phone, parada
            seatNumber: Number(pr.numero_assento)
          };
        }).sort((a, b) => a.seatNumber - b.seatNumber);

        setPassengers(mergedPassengers);
      } else {
        setPassengers([]);
      }

    } catch (error) {
      console.error('Error fetching guide data:', error);
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar os dados da viagem.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleClick = (passenger) => {
    setSelectedPassenger(passenger);
    setConfirmModalOpen(true);
  };

  const confirmTogglePresence = async () => {
    if (!selectedPassenger) return;

    const paxResId = selectedPassenger.id;
    const currentStatus = selectedPassenger.presente;

    setUpdatingId(paxResId);
    setConfirmModalOpen(false); // Close modal immediately

    try {
      const newStatus = !currentStatus;
      const { error } = await supabase
        .from('passageiros_reserva')
        .update({ presente: newStatus })
        .eq('id', paxResId);

      if (error) throw error;

      // Update local state
      setPassengers(prev => 
        prev.map(p => p.id === paxResId ? { ...p, presente: newStatus } : p)
      );

      toast({
        title: newStatus ? 'Presença Confirmada' : 'Presença Cancelada',
        description: 'Status atualizado com sucesso.',
        duration: 2000,
        className: newStatus ? 'bg-green-500 text-white border-none' : 'bg-red-500 text-white border-none'
      });

    } catch (error) {
      console.error('Error toggling presence:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar presença.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingId(null);
      setSelectedPassenger(null);
    }
  };

  const openWhatsApp = (passenger) => {
    const { telefone, nome, parada } = passenger.details || {};
    if (!telefone) {
      toast({ title: 'Telefone não disponível', variant: 'destructive' });
      return;
    }
    const cleanPhone = telefone.replace(/\D/g, '');
    const firstName = nome ? getFirstName(nome) : 'Passageiro';
    
    const busName = bus?.nome || 'nosso ônibus';
    
    const message = `Olá, *${firstName}*!%0A%0AO ${busName} da excursão *${excursion?.nome}* já chegou e está te esperando na parada *${parada || 'combinada'}*.%0A%0AEstamos prontos para partir!`;
    
    window.open(`https://wa.me/55${cleanPhone}?text=${message}`, '_blank');
};

  const formatParada = (parada) => {
    if (!parada) return 'SEM PARADA DEFINIDA';
    return String(parada).toUpperCase().replace(/_/g, ' ');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFirstName = (fullName) => {
    if (!fullName) return 'Passageiro';
    return fullName.split(' ')[0];
  };

  const getFullName = (fullName) => {
    if (!fullName) return 'Passageiro sem nome';
    return fullName;
  }

  // Filter and Group Logic
  const filteredPassengers = passengers.filter(p => {
    const searchLower = searchTerm.toLowerCase();
    const name = p.details.nome?.toLowerCase() || '';
    const seat = String(p.seatNumber);
    const matchesSearch = name.includes(searchLower) || seat.includes(searchLower);

    if (!matchesSearch) return false;

    if (filterStatus === 'present') return p.presente;
    if (filterStatus === 'pending') return !p.presente;
    
    return true;
  });

  const groupedPassengers = filteredPassengers.reduce((acc, p) => {
    const parada = p.details.parada || 'SEM PARADA DEFINIDA';
    if (!acc[parada]) acc[parada] = [];
    acc[parada].push(p);
    return acc;
  }, {});

  // Sort groups alphabetically, but put "SEM PARADA" last
  const sortedGroups = Object.keys(groupedPassengers).sort((a, b) => {
    if (a === 'SEM PARADA DEFINIDA') return 1;
    if (b === 'SEM PARADA DEFINIDA') return -1;
    return a.localeCompare(b);
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-[#ECAE62] animate-spin" />
          <p className="text-white/70">Carregando lista de passageiros...</p>
        </div>
      </div>
    );
  }

  if (!bus) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-4">
        <h1 className="text-white text-xl font-bold mb-4">Ônibus não encontrado</h1>
        <Link to="/">
          <Button className="bg-[#ECAE62] text-black">Voltar ao Início</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] pb-20">
      {/* Header */}
      <div className="bg-[#0F172A] sticky top-0 z-10 border-b border-white/10 shadow-lg">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex justify-center mb-4">
            <img 
              src="https://ujowugielrmzvmwqenhb.supabase.co/storage/v1/object/public/excursoes/logo-ianq.png" 
              alt="IanqTour" 
              className="h-10 w-auto" 
            />
          </div>
          
          <div className="space-y-2 text-center">
            <h1 className="text-lg font-bold text-white leading-tight">
              {excursion?.nome}
            </h1>
            <div className="flex flex-wrap justify-center gap-3 text-xs text-white/70">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-[#ECAE62]" />
                {formatDate(excursion?.horario_partida)}
              </div>
              <div className="flex items-center gap-1">
                <Bus className="h-3 w-3 text-[#ECAE62]" />
                {bus.identificacao || bus.nome}
              </div>
            </div>
            {/* Totalizer */}
            <div className="flex justify-center mt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10 text-xs">
                <span className="text-white/60">Pendentes:</span>
                <span className="text-[#ECAE62] font-bold">
                  {passengers.filter(p => !p.presente).length}
                </span>
                <span className="text-white/40">/</span>
                <span className="text-white font-bold">{passengers.length}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 h-4 w-4" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar passageiro ou poltrona..."
                className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/50 w-full rounded-full focus:ring-[#ECAE62]"
              />
            </div>

            <div className="flex gap-2 justify-center">
              <Button 
                size="sm"
                onClick={() => setFilterStatus('all')}
                className={`flex-1 rounded-full text-xs h-8 ${filterStatus === 'all' ? 'bg-[#ECAE62] text-black hover:bg-[#ECAE62]/90' : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10'}`}
              >
                Todos
              </Button>
              <Button 
                size="sm"
                onClick={() => setFilterStatus('pending')}
                className={`flex-1 rounded-full text-xs h-8 ${filterStatus === 'pending' ? 'bg-[#ECAE62] text-black hover:bg-[#ECAE62]/90' : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10'}`}
              >
                Pendentes
              </Button>
              <Button 
                size="sm"
                onClick={() => setFilterStatus('present')}
                className={`flex-1 rounded-full text-xs h-8 ${filterStatus === 'present' ? 'bg-[#ECAE62] text-black hover:bg-[#ECAE62]/90' : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10'}`}
              >
                Presentes
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 py-6 space-y-8">
        {filteredPassengers.length === 0 ? (
          <div className="text-center py-10 text-white/50">
            <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum passageiro encontrado.</p>
          </div>
        ) : (
          sortedGroups.map(parada => (
            <div key={parada} className="space-y-3">
              <div className="flex items-center gap-2 px-2">
                <MapPin className="h-4 w-4 text-[#ECAE62]" />
                <h2 className="text-[#ECAE62] font-bold text-sm tracking-wider uppercase">
                  {formatParada(parada)}
                </h2>
                <span className="text-white/40 text-xs ml-auto">
                  {groupedPassengers[parada].length} passageiros
                </span>
              </div>

              <div className="space-y-3">
                {groupedPassengers[parada].map((p, idx) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`
                      relative overflow-hidden rounded-xl border p-4 transition-all
                      ${p.presente 
                        ? 'bg-green-500/10 border-green-500/30' 
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                      }
                    `}
                  >
                    <div className="flex flex-col gap-3">
                      {/* Name Header - Full Width */}
                      <div className="w-full border-b border-white/10 pb-2 mb-1 flex justify-center">
                        <h3 className={`font-bold text-sm leading-tight break-words text-center ${p.presente ? 'text-green-400' : 'text-white'}`}>
                          {getFullName(p.details.nome)}
                        </h3>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        {/* Left Side: Seat & Phone */}
                        <div className="flex items-center gap-3">
                          {/* Seat Number */}
                          <div className={`
                            flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl
                            ${p.presente 
                              ? 'bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.5)]' 
                              : 'bg-[#ECAE62]/10 text-[#ECAE62] border border-[#ECAE62]/30'
                            }
                          `}>
                            {p.seatNumber}
                          </div>

                          {/* Phone Info */}
                          {p.details.telefone && (
                            <div className="flex flex-col">
                              <span className="text-white/40 text-[10px] uppercase tracking-wider">Telefone</span>
                              <div className="flex items-center gap-1.5 text-white/80 text-sm font-medium">
                                <Phone className="h-3 w-3 text-[#ECAE62]" />
                                <span>{p.details.telefone}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right Side: Actions */}
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-10 w-10 rounded-full bg-white/5 hover:bg-[#25D366]/20 text-white hover:text-[#25D366] transition-colors border border-white/10"
                            onClick={() => openWhatsApp(p)}
                          >
                            <Phone className="h-5 w-5" />
                          </Button>
                          
                          <Button
                            size="icon"
                            onClick={() => handleToggleClick(p)}
                            disabled={updatingId === p.id}
                            className={`
                              h-10 w-10 rounded-full transition-all
                              ${p.presente 
                                ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20' 
                                : 'bg-white/10 hover:bg-white/20 text-white/50 hover:text-white border border-white/10'
                              }
                            `}
                          >
                            {updatingId === p.id ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : p.presente ? (
                              <CheckCircle className="h-5 w-5" />
                            ) : (
                              <CheckCircle className="h-5 w-5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="bg-[#0F172A] border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {selectedPassenger?.presente ? 'Cancelar Presença?' : 'Confirmar Presença?'}
            </DialogTitle>
            <DialogDescription className="text-white/70">
              {selectedPassenger?.presente 
                ? `Deseja remover a confirmação de presença de ${getFullName(selectedPassenger?.details?.nome)}?`
                : `Deseja confirmar a presença de ${getFullName(selectedPassenger?.details?.nome)}?`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setConfirmModalOpen(false)}
              className="flex-1 border-white/20 text-black hover:bg-white/90"
            >
              Cancelar
            </Button>
            <Button 
              onClick={confirmTogglePresence}
              className={`flex-1 ${selectedPassenger?.presente ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white border-none`}
            >
              {selectedPassenger?.presente ? 'Remover' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GuidePassengerList;
