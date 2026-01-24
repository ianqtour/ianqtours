import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, MapPin, Bus, Users, Trash2, Eye, Armchair, X, CheckCircle, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const ReservationManagement = ({ allowCancel = true }) => {
  const [bookings, setBookings] = useState([]);
  const [excursions, setExcursions] = useState([]);
  const [buses, setBuses] = useState([]);
  const [selectedExcursionId, setSelectedExcursionId] = useState(null);
  const [selectedBusId, setSelectedBusId] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [presenceFilter, setPresenceFilter] = useState('all'); // 'all', 'present', 'absent'
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [expandedPhoto, setExpandedPhoto] = useState(null);
  const [confirmPresenceOpen, setConfirmPresenceOpen] = useState(false);
  const [presencePassengerId, setPresencePassengerId] = useState(null);
  const [presenceStatus, setPresenceStatus] = useState(null);
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [editPassenger, setEditPassenger] = useState(null);
  const [editBooking, setEditBooking] = useState(null);
  const [editBusId, setEditBusId] = useState(null);
  const [editSeatNumber, setEditSeatNumber] = useState('');
  const [seatOptions, setSeatOptions] = useState([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const normalizeText = (s) => (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    const dd = String(date.getDate()).padStart(2, '0')
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const yyyy = date.getFullYear()
    let hours = date.getHours()
    const ampm = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12
    if (hours === 0) hours = 12
    const hh = String(hours).padStart(2, '0')
    const min = String(date.getMinutes()).padStart(2, '0')
    const sec = String(date.getSeconds()).padStart(2, '0')
    return `${dd}/${mm}/${yyyy} ${hh}:${min}:${sec} ${ampm}`
  }

  const formatBirthDate = (dateStr) => {
    if (!dateStr) return ''
    const s = String(dateStr)
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (m) return `${m[3]}/${m[2]}/${m[1]}`
    const first10 = s.slice(0, 10)
    const mIso = first10.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (mIso) return `${mIso[3]}/${mIso[2]}/${mIso[1]}`
    const mBr = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (mBr) return s
    return s
  }

  const fetchPassengersByIds = async (ids) => {
    const CHUNK = 50
    const unique = Array.from(new Set(ids.map((x) => String(x)).filter(Boolean)))
    let result = []
    for (let i = 0; i < unique.length; i += CHUNK) {
      const chunk = unique.slice(i, i + CHUNK)
      const { data, error } = await supabase
        .from('passageiros')
        .select('id, nome, telefone, foto_url, data_nascimento')
        .in('id', chunk)
      if (error) {
        
      }
      result = result.concat(data || [])
    }
    return result
  }

  useEffect(() => {
    loadExcursionsAndBuses();
  }, []);

  useEffect(() => {
    loadBookings();
  }, [selectedExcursionId, selectedBusId]);

  const loadExcursionsAndBuses = async () => {
    const { data: exData } = await supabase.from('excursoes').select('id, nome')
    const { data: busData } = await supabase.from('onibus').select('id, nome, identificacao, excursao_id')
    setExcursions((exData || []).map(e => ({ id: e.id, name: e.nome })))
    setBuses((busData || []).map(b => ({ id: b.id, name: b.nome, identification: b.identificacao || '', excursionId: b.excursao_id })))
  };

  const loadBookings = async () => {
    let query = supabase
      .from('reservas')
      .select('id, excursao_id, onibus_id, status, criado_em')
      .neq('status', 'cancelada')
      .order('criado_em', { ascending: false })

    if (selectedExcursionId) {
      query = query.eq('excursao_id', selectedExcursionId)
    }
    if (selectedBusId) {
      query = query.eq('onibus_id', selectedBusId)
    }

    const { data: resData, error } = await query
    if (!resData || error) {
      setBookings([])
      return
    }

    const reservationIds = (resData || []).map(r => r.id)
    let paxRes = []
    if (reservationIds.length > 0) {
      const { data: paxResData } = await supabase
        .from('passageiros_reserva')
        .select('id, reserva_id, numero_assento, passageiro_id, presente')
        .in('reserva_id', reservationIds)
      paxRes = paxResData || []
    }

    const passengerIds = Array.from(new Set((paxRes || []).map(p => p.passageiro_id).filter(Boolean)))
    let passengers = []
    if (passengerIds.length > 0) {
      passengers = await fetchPassengersByIds(passengerIds)
    }

    const passengerByIdMap = new Map()
    passengers.forEach((p) => {
      passengerByIdMap.set(String(p.id), {
        id: String(p.id),
        nome: (p.nome || '').toUpperCase(),
        email: p.email || '',
        telefone: p.telefone || '',
        foto_url: p.foto_url || '',
        data_nascimento: p.data_nascimento || '',
      })
    })

    const paxByReserva = (paxRes || []).reduce((acc, p) => {
      const arr = acc[p.reserva_id] || []
      const ref = passengerByIdMap.get(String(p.passageiro_id)) || {}
      arr.push({
        id: p.id,
        seatNumber: Number(p.numero_assento),
        name: ref.nome || '',
        email: ref.email || '',
        phone: ref.telefone || '',
        photo: ref.foto_url || '',
        birthDate: ref.data_nascimento || '',
        presente: (() => {
          const val = p.presente
          if (val === true || val === 'true' || val === 1) return true
          if (val === false || val === 'false' || val === 0) return false
          return null
        })(),
      })
      acc[p.reserva_id] = arr
      return acc
    }, {})

    const bookingsList = (resData || []).map(r => {
      const list = (paxByReserva[r.id] || []).sort((a, b) => Number(a.seatNumber) - Number(b.seatNumber))
      return {
        id: r.id,
        excursionId: r.excursao_id,
        busId: r.onibus_id,
        passengers: list,
        seats: list.map(p => p.seatNumber),
        date: r.criado_em,
        status: r.status === 'confirmada' ? 'confirmed' : r.status === 'cancelada' ? 'canceled' : 'canceled',
      }
    })

    const sortedBySeat = bookingsList.sort((a, b) => {
      const aMin = a.seats.length ? Math.min(...a.seats.map(Number)) : Infinity
      const bMin = b.seats.length ? Math.min(...b.seats.map(Number)) : Infinity
      return aMin - bMin
    })

    // Debug: verificar valores de presente
    console.log('Bookings loaded:', sortedBySeat.map(b => ({
      id: b.id,
      passengers: b.passengers.map(p => ({ name: p.name, presente: p.presente, presenteType: typeof p.presente }))
    })))

    // Não aplicar filtro de presença aqui, será aplicado na renderização
    setBookings(sortedBySeat)
  };

  const getExcursionName = (excursionId) => {
    const excursion = excursions.find(e => e.id === excursionId);
    return excursion ? excursion.name : 'Desconhecida';
  };

  const getBusName = (busId) => {
    const bus = buses.find(b => b.id === busId);
    return bus ? bus.name : 'Desconhecido';
  };

  const getBusIdentification = (busId) => {
    const bus = buses.find(b => b.id === busId)
    return bus ? (bus.identification || bus.name || 'Desconhecido') : 'Desconhecido'
  };

  const loadSeatOptions = async (busId, keepSeatNumber = null) => {
    if (!busId) {
      setSeatOptions([]);
      return;
    }
    const { data: seatsData } = await supabase
      .from('assentos_onibus')
      .select('numero_assento, status')
      .eq('onibus_id', busId);
    const { data: resOnBus } = await supabase
      .from('reservas')
      .select('id')
      .eq('onibus_id', busId);
    const resIds = (resOnBus || []).map(r => r.id);
    let occupied = [];
    if (resIds.length > 0) {
      const { data: paxOnBus } = await supabase
        .from('passageiros_reserva')
        .select('numero_assento')
        .in('reserva_id', resIds);
      occupied = (paxOnBus || []).map(p => Number(p.numero_assento));
    }
    const seats = (seatsData || [])
      .map(s => {
        const n = Number(s.numero_assento);
        const isOccupied = s.status === 'ocupado' || occupied.includes(n);
        return { number: n, occupied: isOccupied };
      })
      .sort((a, b) => a.number - b.number);
    setSeatOptions(seats);
  };

  const openEditModal = (booking, passenger) => {
    setEditBooking(booking);
    setEditPassenger(passenger);
    const initialBus = booking.busId ? String(booking.busId) : '';
    setEditBusId(initialBus);
    setEditSeatNumber(String(passenger.seatNumber || ''));
    setEditOpen(true);
    loadSeatOptions(booking.busId, passenger.seatNumber);
  };

  const handleChangeEditBus = async (busId) => {
    setEditBusId(busId);
    setEditSeatNumber('');
    await loadSeatOptions(busId);
  };

  const handleSaveEdit = async () => {
    if (!editOpen || !editPassenger || !editBooking) return;
    if (!editBusId || !editSeatNumber) {
      toast({ title: 'Campos obrigatórios', description: 'Selecione ônibus e poltrona.' });
      return;
    }
    setSavingEdit(true);
    try {
      const currentBusId = String(editBooking.busId || '').trim();
      const newBusId = String(editBusId || '').trim();
      const busChanged = newBusId !== currentBusId;
      const oldSeat = parseInt(editPassenger.seatNumber, 10);
      const newSeat = parseInt(editSeatNumber, 10);
      if (!newBusId || Number.isNaN(oldSeat) || Number.isNaN(newSeat)) {
        toast({ title: 'Dados inválidos', description: 'Ônibus ou poltrona inválidos.' });
        setSavingEdit(false);
        return;
      }
      if (!busChanged) {
        await supabase
          .from('passageiros_reserva')
          .update({ numero_assento: newSeat })
          .eq('id', editPassenger.id);
        await supabase
          .from('assentos_onibus')
          .update({ status: 'disponivel' })
          .eq('onibus_id', currentBusId)
          .eq('numero_assento', oldSeat);
        await supabase
          .from('assentos_onibus')
          .update({ status: 'ocupado' })
          .eq('onibus_id', newBusId)
          .eq('numero_assento', newSeat);
      } else {
        const { data: originalRes } = await supabase
          .from('reservas')
          .select('status, excursao_id, onibus_id')
          .eq('id', editBooking.id)
          .single();
        const sourceBusId = String(originalRes?.onibus_id || currentBusId || '').trim();
        if (!sourceBusId) {
          toast({ title: 'Dados inválidos', description: 'Ônibus de origem inválido.' });
          setSavingEdit(false);
          return;
        }
        const { data: newRes, error: insertErr } = await supabase
          .from('reservas')
          .insert({
            excursao_id: originalRes?.excursao_id || editBooking.excursionId,
            onibus_id: newBusId,
            status: originalRes?.status || 'confirmada',
          })
          .select('id')
          .single();
        if (insertErr || !newRes?.id) {
          throw new Error('Falha ao criar nova reserva para mover passageiro.');
        }
        await supabase
          .from('passageiros_reserva')
          .update({
            reserva_id: newRes.id,
            numero_assento: newSeat,
          })
          .eq('id', editPassenger.id);
        await supabase
          .from('assentos_onibus')
          .update({ status: 'disponivel' })
          .eq('onibus_id', sourceBusId)
          .eq('numero_assento', oldSeat);
        await supabase
          .from('assentos_onibus')
          .update({ status: 'ocupado' })
          .eq('onibus_id', newBusId)
          .eq('numero_assento', newSeat);
      }
      await loadBookings();
      setEditOpen(false);
      setEditPassenger(null);
      setEditBooking(null);
      setEditBusId(null);
      setEditSeatNumber('');
      toast({ title: 'Atualizado', description: 'Poltrona e status dos assentos atualizados.' });
    } catch (e) {
      toast({ title: 'Erro ao atualizar', description: 'Tente novamente.' });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteBooking = async (bookingId) => {
    // Buscar os assentos relacionados à reserva
    const { data: passengerReservations } = await supabase
      .from('passageiros_reserva')
      .select('numero_assento, reserva_id')
      .eq('reserva_id', bookingId)

    if (passengerReservations && passengerReservations.length > 0) {
      // Buscar o ônibus da reserva
      const { data: reservation } = await supabase
        .from('reservas')
        .select('onibus_id')
        .eq('id', bookingId)
        .single()

      if (reservation && reservation.onibus_id) {
        const seatNumbers = passengerReservations.map(pr => pr.numero_assento)
        
        // Atualizar o status dos assentos para disponível
        for (const seatNum of seatNumbers) {
          await supabase
            .from('assentos_onibus')
            .update({ status: 'disponivel' })
            .eq('onibus_id', reservation.onibus_id)
            .eq('numero_assento', seatNum)
        }
      }
    }

    // Atualizar o status da reserva para cancelada ao invés de deletar
    await supabase
      .from('reservas')
      .update({ status: 'cancelada' })
      .eq('id', bookingId)

    await loadBookings()
    toast({
      title: "Reserva Cancelada",
      description: "A reserva foi cancelada e os assentos foram liberados.",
    });
  };

  const requestDeleteBooking = (bookingId) => {
    setConfirmDeleteId(bookingId)
    setConfirmOpen(true)
  };

  const handleConfirmDeleteBooking = async () => {
    if (!confirmDeleteId) return
    await handleDeleteBooking(confirmDeleteId)
    setConfirmOpen(false)
    setConfirmDeleteId(null)
    setSelectedBooking(null) // Fechar modal de detalhes se estiver aberto
  };

  const handleRemovePassenger = async (bookingId, passengerIndex) => {
    const booking = bookings.find(b => b.id === bookingId)
    if (!booking) return
    const passenger = booking.passengers[passengerIndex]
    if (!passenger) return
    await supabase.from('passageiros_reserva').delete().eq('id', passenger.id)
    await loadBookings()
    toast({
      title: "Passageiro Removido",
      description: "O passageiro foi removido e seu assento foi liberado.",
    })
  };

  const handleOpenPresenceModal = (passengerId, currentStatus) => {
    setPresencePassengerId(passengerId)
    setPresenceStatus(currentStatus)
    setConfirmPresenceOpen(true)
  };

  const handleConfirmPresence = async (status) => {
    if (!presencePassengerId) return
    
    await supabase
      .from('passageiros_reserva')
      .update({ presente: status })
      .eq('id', presencePassengerId)
    
    await loadBookings()
    
    // Atualizar o booking selecionado se estiver aberto
    if (selectedBooking) {
      const updatedBooking = bookings.find(b => b.id === selectedBooking.id)
      if (updatedBooking) {
        setSelectedBooking(updatedBooking)
      }
    }
    
    setConfirmPresenceOpen(false)
    setPresencePassengerId(null)
    setPresenceStatus(null)
    setSelectedBooking(null)
    toast({
      title: "Presença Confirmada",
      description: `Presença marcada como ${status ? 'presente' : 'ausente'}.`,
    })
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, presenceFilter, selectedExcursionId, selectedBusId]);

  const getFilteredBookings = () => {
    let filtered = bookings;
    
    if (searchText) {
      filtered = filtered.filter(b =>
        b.passengers.some(p =>
          normalizeText(p.name).includes(normalizeText(searchText)) ||
          String(p.seatNumber).includes(searchText)
        )
      )
    }
    
    if (presenceFilter === 'present') {
      filtered = filtered.filter(b => b.passengers.length > 0 && b.passengers.some(p => p.presente === true || p.presente === 'true'))
    } else if (presenceFilter === 'absent') {
      filtered = filtered.filter(b => b.passengers.length > 0 && b.passengers.some(p => p.presente === false || p.presente === 'false'))
    }
    
    return filtered;
  };

  const filteredBookings = getFilteredBookings();
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBookings = filteredBookings.slice(startIndex, startIndex + itemsPerPage);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="space-y-3 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h2 className="text-xl sm:text-2xl font-bold text-white">Reservas</h2>
        <div className="text-sm sm:text-base text-white/70">Total: <span className="text-white font-bold">{filteredBookings.length}</span></div>
      </div>

      <div className="bg-white/5 rounded-xl p-3 md:p-4 border border-white/10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div>
            <Select value={selectedExcursionId || ''} onValueChange={(v) => { setSelectedExcursionId(v); setSelectedBusId(null); }}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Filtrar por excursão" />
              </SelectTrigger>
              <SelectContent>
                {excursions.map(e => (
                  <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select value={selectedBusId || ''} onValueChange={setSelectedBusId} disabled={!selectedExcursionId}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Filtrar por ônibus" />
              </SelectTrigger>
              <SelectContent>
                {buses.filter(b => String(b.excursionId) === String(selectedExcursionId)).map(b => (
                  <SelectItem key={b.id} value={String(b.id)}>{b.identification || b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select value={presenceFilter} onValueChange={setPresenceFilter}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Filtrar por presença" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="present">Presentes</SelectItem>
                <SelectItem value="absent">Ausentes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Buscar por nome ou poltrona"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 text-sm"
            />
          </div>
        </div>
      </div>

      {filteredBookings.length === 0 ? (
        <div className="bg-white/5 rounded-xl p-6 md:p-12 text-center">
          <p className="text-white/70 text-sm sm:text-base">Nenhuma reserva encontrada.</p>
        </div>
      ) : (
        <div className="space-y-3 md:space-y-4">
          {paginatedBookings.map((booking, index) => (
            <motion.div
              key={booking.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white/5 rounded-xl p-3 md:p-6 border border-white/10 relative"
            >
              <div className="md:hidden flex justify-center mb-2">
                <span className={`inline-block px-4 py-1 rounded-full font-semibold text-xs ${booking.passengers[0]?.presente === true ? 'bg-green-500/80 text-white border border-green-600' : 'bg-yellow-400/80 text-[#0F172A] border border-yellow-600'}`}>
                  {booking.passengers[0]?.presente === true ? 'Presença confirmada' : 'Aguardando confirmação'}
                </span>
              </div>
              <div className="flex flex-col gap-3 md:gap-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="hidden md:block text-lg md:text-xl font-bold text-white">
                    Reserva #{booking.id} - {booking.passengers[0]?.presente === true ? 'Presença confirmada' : 'Aguardando confirmação'}
                  </h3>
                    </div>
                <div className="space-y-1.5 md:space-y-1">
                  <div className="flex items-center text-white/70 text-xs sm:text-sm">
                    <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 text-[#ECAE62] flex-shrink-0" />
                    <span className="truncate">{getExcursionName(booking.excursionId)}</span>
                    </div>
                  <div className="flex items-center text-white/70 text-xs sm:text-sm">
                    <Bus className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 text-[#ECAE62] flex-shrink-0" />
                    <span className="truncate">{getBusIdentification(booking.busId)}</span>
                    </div>
                  <div className="flex items-center text-white/70 text-xs sm:text-sm">
                    <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 text-[#ECAE62] flex-shrink-0" />
                    <span className="truncate">{booking.passengers[0]?.name || 'Sem nome'}</span>
                    </div>
                  <div className="flex items-center text-white/70 text-xs sm:text-sm">
                    <Armchair className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 text-[#ECAE62] flex-shrink-0" />
                    <span>Assento: {booking.seats.join(', ')}</span>
                    </div>
                  <div className="flex items-center text-white/70 text-xs sm:text-sm">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 text-[#ECAE62] flex-shrink-0" />
                    <span className="truncate">{formatDate(booking.date)}</span>
                  </div>
                </div>
                <div className="flex justify-center items-center gap-2 sm:gap-3 pt-2 border-t border-white/10">
                  <Button
                    onClick={() => setSelectedBooking(booking)}
                    size="sm"
                    className={`${booking.passengers[0]?.presente === true ? 'bg-[#ECAE62] hover:bg-[#8C641C] text-[#0B1420]' : 'bg-green-500 hover:bg-green-600 text-white'} text-sm sm:text-sm px-4 sm:px-6 py-2 sm:py-2`}
                  >
                    {booking.passengers[0]?.presente === true ? (
                      <Eye className="h-4 w-4 sm:h-4 sm:w-4 sm:mr-2" />
                    ) : (
                      <CheckCircle className="h-4 w-4 sm:h-4 sm:w-4 sm:mr-2" />
                    )}
                    <span className="hidden sm:inline">{booking.passengers[0]?.presente === true ? 'Ver detalhes' : 'Confirmar Presença'}</span>
                    <span className="sm:hidden">{booking.passengers[0]?.presente === true ? 'Detalhes' : 'Presença'}</span>
                  </Button>
                  <Button
                    onClick={() => openEditModal(booking, booking.passengers[0])}
                    size="sm"
                    className="bg-blue-500 hover:bg-blue-600 text-white text-sm sm:text-sm px-4 sm:px-6 py-2 sm:py-2"
                  >
                    <Pencil className="h-4 w-4 sm:h-4 sm:w-4 sm:mr-2" />
                    <span>Editar</span>
                  </Button>
                  {allowCancel && (
                    <Button
                      onClick={() => requestDeleteBooking(booking.id)}
                      size="sm"
                      className="bg-white text-red-600 border border-red-600 hover:bg-red-50 text-sm sm:text-sm px-4 sm:px-6 py-2 sm:py-2"
                    >
                      <Trash2 className="h-4 w-4 sm:h-4 sm:w-4 sm:mr-2" />
                      <span>Cancelar</span>
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

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

      <Dialog open={selectedBooking !== null} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent className="bg-[#0F172A] border-white/20 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl md:text-2xl text-center">Detalhes da Reserva</DialogTitle>
          </DialogHeader>
          {selectedBooking && selectedBooking.passengers.length > 0 && (
            <div className="space-y-4 md:space-y-6">
              {/* Informações do Passageiro Principal (sem foto) */}
              <div className="flex flex-col items-center text-center space-y-3 pb-4 border-b border-white/10">
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">
                    {selectedBooking.passengers[0].name}
                  </h3>
                  {selectedBooking.passengers[0].phone && (
                    <div className="flex items-center justify-center gap-2 text-white/70 text-sm sm:text-base">
                      <span>{selectedBooking.passengers[0].phone}</span>
                    </div>
                  )}
                  {selectedBooking.passengers[0].birthDate && (
                    <div className="flex items-center justify-center gap-2 text-white/60 text-xs sm:text-sm mt-1">
                      <span>Nascimento: {formatBirthDate(selectedBooking.passengers[0].birthDate)}</span>
                    </div>
                  )}
                  {selectedBooking.passengers[0].email && (
                    <p className="text-white/60 text-xs sm:text-sm mt-1">{selectedBooking.passengers[0].email}</p>
                  )}
                  {selectedBooking.passengers[0].presente !== null && (
                    <div className={`mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${
                      selectedBooking.passengers[0].presente 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {selectedBooking.passengers[0].presente ? '✓ Presente' : '✗ Ausente'}
                    </div>
                  )}
                </div>
              </div>

              {/* Informações da Reserva */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div className="bg-white/5 rounded-lg p-3 md:p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-[#ECAE62]" />
                    <h4 className="font-semibold text-sm text-white/70">Excursão</h4>
                  </div>
                  <p className="text-white font-medium text-sm sm:text-base">{getExcursionName(selectedBooking.excursionId)}</p>
                </div>

                <div className="bg-white/5 rounded-lg p-3 md:p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Bus className="h-4 w-4 text-[#ECAE62]" />
                    <h4 className="font-semibold text-sm text-white/70">Ônibus</h4>
                  </div>
                  <p className="text-white font-medium text-sm sm:text-base">{getBusIdentification(selectedBooking.busId)}</p>
                </div>

                <div className="bg-white/5 rounded-lg p-3 md:p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Armchair className="h-4 w-4 text-[#ECAE62]" />
                    <h4 className="font-semibold text-sm text-white/70">
                      {selectedBooking.seats.length === 1 ? 'Assento' : 'Assentos'}
                    </h4>
                  </div>
                  <p className="text-white font-medium text-sm sm:text-base">{selectedBooking.seats.join(', ')}</p>
                </div>
              </div>

              {/* Outros Passageiros (sem fotos) */}
              {selectedBooking.passengers.length > 1 && (
              <div>
                  <h4 className="font-semibold mb-3 md:mb-4 text-sm sm:text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#ECAE62]" />
                    Outros Passageiros ({selectedBooking.passengers.length - 1})
                  </h4>
                  <div className="space-y-2 md:space-y-3">
                    {selectedBooking.passengers.slice(1).map((passenger, index) => (
                      <div key={index + 1} className="bg-white/5 rounded-lg p-3 md:p-4 border border-white/10 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm sm:text-base text-white truncate">{passenger.name}</p>
                            {passenger.phone && <p className="text-xs sm:text-sm text-white/70">{passenger.phone}</p>}
                            {passenger.birthDate && (
                              <p className="text-xs sm:text-sm text-white/60">Nascimento: {formatBirthDate(passenger.birthDate)}</p>
                            )}
                            <p className="text-xs sm:text-sm text-[#ECAE62] mt-1">Assento {passenger.seatNumber}</p>
                            {passenger.presente !== null && (
                              <p className={`text-xs sm:text-sm mt-1 ${passenger.presente ? 'text-green-400' : 'text-red-400'}`}>
                                {passenger.presente ? '✓ Presente' : '✗ Ausente'}
                              </p>
                            )}
                          </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleOpenPresenceModal(passenger.id, passenger.presente)}
                              variant="outline"
                              size="sm"
                              className="border-blue-500/20 text-blue-400 hover:bg-blue-500/10 flex-shrink-0"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                        <Button
                              onClick={() => handleRemovePassenger(selectedBooking.id, index + 1)}
                          variant="outline"
                          size="sm"
                              className="border-red-500/20 text-red-400 hover:bg-red-500/10 flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                          </div>
                      </div>
                    ))}
                    </div>
                  </div>
                )}

              {/* Botão de Confirmar Presença do Passageiro Principal */}
              <div className="flex justify-center pt-4 border-t border-white/10">
                <Button
                  onClick={() => handleOpenPresenceModal(selectedBooking.passengers[0]?.id, selectedBooking.passengers[0]?.presente)}
                  className="bg-green-500 hover:bg-green-600 text-white px-6"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmar Presença
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Presença */}
      <Dialog open={confirmPresenceOpen} onOpenChange={setConfirmPresenceOpen}>
        <DialogContent className="bg-[#0F172A] text-white">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Confirmar Presença</DialogTitle>
            <DialogDescription className="text-white/80 text-sm mb-2">
              Marque a presença do passageiro:
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            <Button
              onClick={() => handleConfirmPresence(true)}
              className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Presente
            </Button>
            <Button
              onClick={() => handleConfirmPresence(false)}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold py-3"
            >
              <X className="h-4 w-4 mr-2" />
              Ausente
            </Button>
          </div>
          <DialogFooter className="mt-2">
            <Button onClick={() => setConfirmPresenceOpen(false)} className="flex-1 bg-white text-[#0F172A] hover:bg-gray-100">
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={allowCancel && confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-[#0F172A] text-white">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Confirmar cancelamento</DialogTitle>
            <DialogDescription className="text-white/80 text-sm">
              Ao cancelar, o status da reserva será alterado para "cancelada" e os assentos serão liberados. Tem certeza que deseja cancelar esta reserva?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 sm:gap-2">
            <Button onClick={() => setConfirmOpen(false)} className="flex-1 bg-white text-[#0F172A] hover:bg-gray-100 text-sm sm:text-base">Não cancelar</Button>
            <Button onClick={handleConfirmDeleteBooking} className="flex-1 bg-red-600 text-white hover:bg-red-700 text-sm sm:text-base">Confirmar cancelamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[#0F172A] border-white/20 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg text-center">Editar Passageiro</DialogTitle>
            <DialogDescription className="text-white/80 text-sm text-center">
              Altere o ônibus e a poltrona para este passageiro.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="text-white/70 text-xs">Passageiro</p>
              <p className="text-white font-semibold">{editPassenger?.name}</p>
            </div>
            <div>
              <p className="text-white/70 text-xs mb-1">Ônibus</p>
              <Select value={editBusId || ''} onValueChange={handleChangeEditBus}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Selecione o ônibus" />
                </SelectTrigger>
                <SelectContent>
                  {buses
                    .filter(b => String(b.excursionId) === String(editBooking?.excursionId))
                    .map(b => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.identification || b.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-white/70 text-xs mb-1">Poltrona</p>
              <Select value={editSeatNumber || ''} onValueChange={setEditSeatNumber}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Selecione a poltrona" />
                </SelectTrigger>
                <SelectContent className="max-h-64 overflow-y-auto p-0">
                  {seatOptions.map((s) => (
                    <SelectItem
                      key={s.number}
                      value={String(s.number)}
                      disabled={s.occupied && String(s.number) !== String(editPassenger?.seatNumber)}
                    >
                      {`Poltrona ${String(s.number).padStart(2, '0')}${s.occupied ? ' (Ocupada)' : ''}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex gap-2 pt-2">
            <Button onClick={() => setEditOpen(false)} className="flex-1 bg-white text-[#0F172A] hover:bg-gray-100">Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReservationManagement;
