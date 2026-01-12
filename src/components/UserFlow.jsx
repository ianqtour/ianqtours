import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ExcursionSelection from '@/components/user/ExcursionSelection';
import BusSelection from '@/components/user/BusSelection';
import SeatSelection from '@/components/user/SeatSelection';
import PassengerRegistration from '@/components/user/PassengerRegistration';
import BookingConfirmation from '@/components/user/BookingConfirmation';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/components/ui/use-toast'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const UserFlow = ({ onAdminClick, initialExcursion }) => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [step, setStep] = useState(1);
  const [selectedExcursion, setSelectedExcursion] = useState(null);
  const [selectedBus, setSelectedBus] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [passengers, setPassengers] = useState([]);
  const [bookingId, setBookingId] = useState(null);
  const [pendingLinks, setPendingLinks] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [cpfOpen, setCpfOpen] = useState(false)
  const [cpfValue, setCpfValue] = useState('')
  const [prefillCpf, setPrefillCpf] = useState('')
  const [confirmedPassenger, setConfirmedPassenger] = useState(null)
  const [cpfChecking, setCpfChecking] = useState(false)

  useEffect(() => {
    if (initialExcursion) {
      setSelectedExcursion(initialExcursion)
      setStep(2)
    }
  }, [initialExcursion])

  useEffect(() => {
    if (step === 3 || step === 4) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }
  }, [step])

  useEffect(() => {
    if (cpfOpen || confirmOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [cpfOpen, confirmOpen])

  const dataUrlToBlob = () => null

  const toIsoBirth = (s) => {
    if (!s) return null
    const parts = String(s).split('/')
    if (parts.length !== 3) return null
    const [dd, mm, yyyy] = parts
    const d = dd.padStart(2, '0')
    const m = mm.padStart(2, '0')
    return `${yyyy}-${m}-${d}`
  }

  const formatDateOnly = (s) => {
    if (!s) return ''
    return new Date(s).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  }

  const handleExcursionSelect = (excursion) => {
    setSelectedExcursion(excursion);
    setStep(2);
  };

  const handleBusSelect = (bus) => {
    setSelectedBus(bus);
    setStep(3);
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  };

  const handleSeatsSelect = (seats) => {
    setSelectedSeats(seats);
    setCpfValue('')
    setPrefillCpf('')
    setCpfOpen(true)
  };

  const handlePassengersSubmit = async (passengersData) => {
    setPassengers(passengersData);
    const inserted = []
    for (const p of passengersData) {
      let pax
      const attempt = await supabase
        .from('passageiros')
        .insert({
          nome: p.name,
          cpf: String(p.cpf || '').replace(/\D/g, ''),
          data_nascimento: toIsoBirth(p.birthDate) || null,
          telefone: p.phone,
        })
        .select('id')
        .single()
      if (attempt.error || !attempt.data?.id) {
        toast({ title: 'Erro ao salvar passageiro', description: 'Verifique os dados e tente novamente.', variant: 'destructive' })
        return
      }
      pax = attempt.data
      // Foto removida do fluxo
      inserted.push({ seatNumber: p.seatNumber, passageiro_id: pax.id })
    }
    setPendingLinks(inserted)
    setConfirmOpen(true)
  };

  const confirmReservation = async () => {
    let duplicate = false
    const { data: resForExc } = await supabase
      .from('reservas')
      .select('id')
      .eq('excursao_id', selectedExcursion.id)
    const resIds = (resForExc || []).map(r => r.id)
    if (resIds.length > 0) {
      for (const it of pendingLinks || []) {
        const { count } = await supabase
          .from('passageiros_reserva')
          .select('id', { count: 'exact', head: true })
          .eq('passageiro_id', it.passageiro_id)
          .in('reserva_id', resIds)
        if ((count || 0) > 0) {
          duplicate = true
          break
        }
      }
    }
    if (duplicate) {
      toast({ title: 'CPF já possui reserva', description: 'Um ou mais passageiros já reservaram nesta excursão.', variant: 'destructive' })
      return
    }
    const bookingRes = await supabase
      .from('reservas')
      .insert({
        excursao_id: selectedExcursion.id,
        onibus_id: selectedBus.id,
        status: 'confirmada',
      })
      .select('id')
      .single()
    if (bookingRes.error || !bookingRes.data?.id) {
      toast({ title: 'Erro ao criar reserva', description: 'Tente novamente em alguns instantes.', variant: 'destructive' })
      return
    }
    const bookingIdCreated = bookingRes.data.id
    for (const it of pendingLinks || []) {
      const seatNum = Number(it.seatNumber)
      if (!it.passageiro_id || !bookingIdCreated || Number.isNaN(seatNum)) {
        toast({ title: 'Dados inválidos para vínculo', description: 'Verifique passageiro, assento e reserva.', variant: 'destructive' })
        return
      }
      const linkRes = await supabase.from('passageiros_reserva').insert({
        reserva_id: bookingIdCreated,
        numero_assento: seatNum,
        passageiro_id: it.passageiro_id,
        presente: false,
      }).select('id').single()
      if (linkRes.error) {
        const msg = linkRes.error.message || 'Falha ao criar vínculo'
        toast({ title: 'Erro ao vincular passageiro à reserva', description: msg, variant: 'destructive' })
        return
      }
    }
    // Geração e salvamento de ingresso removidos
    setBookingId(bookingIdCreated)
    setConfirmOpen(false)
    setConfirmedPassenger(null)
    setStep(5)
  }

  const cancelReservation = () => {
    setConfirmOpen(false)
    setConfirmedPassenger(null)
    setStep(3)
  }

  const formatCpf = (v) => {
    const digits = String(v).replace(/\D/g, '').slice(0, 11)
    const p1 = digits.slice(0, 3)
    const p2 = digits.slice(3, 6)
    const p3 = digits.slice(6, 9)
    const p4 = digits.slice(9, 11)
    let out = ''
    if (p1) out = p1
    if (p2) out = `${out}.${p2}`
    if (p3) out = `${out}.${p3}`
    if (p4) out = `${out}-${p4}`
    return out
  }
  const validateCpf = (v) => {
    const cpf = String(v).replace(/\D/g, '')
    if (cpf.length !== 11 || /(\d)\1{10}/.test(cpf)) return false
    let sum = 0
    for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i)
    let d1 = (sum * 10) % 11; if (d1 === 10) d1 = 0
    if (d1 !== parseInt(cpf[9])) return false
    sum = 0
    for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i)
    let d2 = (sum * 10) % 11; if (d2 === 10) d2 = 0
    return d2 === parseInt(cpf[10])
  }
  const handleCpfChange = (e) => setCpfValue(formatCpf(e.target.value))
  const handleCpfCancel = () => { setCpfOpen(false); setCpfValue(''); setPrefillCpf('') }
  const handleCpfConfirm = async () => {
    const valid = validateCpf(cpfValue)
    if (!valid) {
      toast({ title: 'CPF inválido', description: 'Digite um CPF válido.', variant: 'destructive' })
      return
    }
    setCpfChecking(true)
    const digits = cpfValue.replace(/\D/g, '')
    const { data: found } = await supabase
      .from('passageiros')
      .select('id,nome')
      .eq('cpf', digits)
      .maybeSingle()
    setCpfChecking(false)
    setCpfOpen(false)
    if (found && found.id) {
      let already = false
      const { data: resForExc } = await supabase
        .from('reservas')
        .select('id')
        .eq('excursao_id', selectedExcursion?.id)
      const resIds = (resForExc || []).map(r => r.id)
      if (resIds.length > 0) {
        const { count } = await supabase
          .from('passageiros_reserva')
          .select('id', { count: 'exact', head: true })
          .eq('passageiro_id', found.id)
          .in('reserva_id', resIds)
        already = (count || 0) > 0
      }
      if (already) {
        toast({ title: 'CPF já possui reserva', description: 'Este passageiro já reservou nesta excursão.', variant: 'destructive' })
        return
      }
      setConfirmedPassenger(found)
      setPendingLinks([{ seatNumber: Number(selectedSeats[0]), passageiro_id: found.id }])
      setConfirmOpen(true)
    } else {
      setPrefillCpf(cpfValue)
      setStep(4)
    }
  }

  const handleReset = () => {
    setSelectedBus(null);
    setSelectedSeats([]);
    setPassengers([]);
    setBookingId(null);
    setCpfValue('')
    setPrefillCpf('')
    setConfirmedPassenger(null)
    setCpfOpen(false)
    setStep(2);
  };

  return (
    <div className="min-h-screen relative">

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="excursion"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
          >
            <ExcursionSelection onSelect={handleExcursionSelect} onAdminBack={onAdminClick} />
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="bus"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
          >
            <BusSelection
              excursion={selectedExcursion}
              onSelect={handleBusSelect}
              onBack={() => navigate('/excursoes')}
            />
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="seats"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
          >
            <SeatSelection
              bus={selectedBus}
              excursion={selectedExcursion}
              onSelect={handleSeatsSelect}
              onBack={() => setStep(2)}
            />
          </motion.div>
        )}

        {step === 4 && (
          <motion.div
            key="registration"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
          >
            <PassengerRegistration
              seats={selectedSeats}
              initialCpf={prefillCpf}
              onSubmit={handlePassengersSubmit}
              onBack={() => { setPrefillCpf(''); setCpfValue(''); setStep(3) }}
            />
          </motion.div>
        )}

        {step === 5 && (
          <motion.div
            key="confirmation"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
          >
            <BookingConfirmation
              bookingId={bookingId}
              excursion={selectedExcursion}
              bus={selectedBus}
              seats={selectedSeats}
              passengers={passengers}
              onReset={handleReset}
            />
          </motion.div>
        )}
      </AnimatePresence>
      {cpfOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl w-full max-w-md p-6">
            <h3 className="text-2xl font-bold text-white mb-3">Informe seu CPF</h3>
            <div className="space-y-2 mb-4">
              <Label className="text-white">CPF</Label>
              <Input value={cpfValue} onChange={handleCpfChange} placeholder="000.000.000-00" className={`bg-white/10 border ${cpfValue.replace(/\D/g,'').length===11 && !validateCpf(cpfValue)?'border-red-500':'border-white/20'} text-white placeholder:text-white/50`} />
              {cpfValue.replace(/\D/g,'').length===11 && !validateCpf(cpfValue) && (
                <p className="text-red-400 text-xs">CPF inválido</p>
              )}
            </div>
              <div className="flex gap-3">
                <Button onClick={handleCpfCancel} className="flex-1 bg-transparent border border-white/30 text-white hover:bg-white/10">Cancelar</Button>
                <Button onClick={handleCpfConfirm} disabled={cpfChecking} className="flex-1 bg-[#ECAE62] hover:bg-[#8C641C] text-[#0B1420] disabled:opacity-50">
                  {cpfChecking ? 'Verificando...' : 'Continuar'}
                </Button>
              </div>
          </div>
        </div>
      )}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl w-full max-w-lg p-6">
            <h3 className="text-2xl font-bold text-white mb-3">Confirmar Reserva</h3>
            <div className="space-y-2 text-white/85 mb-4">
              {confirmedPassenger?.nome && (
                <div className="text-white font-semibold">Bem-vindo, {confirmedPassenger.nome}!</div>
              )}
              <div>Destino: <span className="font-semibold">{selectedExcursion?.destination}</span></div>
              <div>Data: <span className="font-semibold">{formatDateOnly(selectedExcursion?.date)}</span></div>
              <div>Ônibus: <span className="font-semibold">{selectedBus?.identification || selectedBus?.type || selectedBus?.name}</span></div>
              <div>Assento: <span className="font-semibold">{selectedSeats.join(', ')}</span></div>
            </div>
            <div className="flex gap-3">
              <Button onClick={cancelReservation} className="flex-1 bg-transparent border border-white/30 text-white hover:bg-white/10">Cancelar</Button>
              <Button onClick={confirmReservation} className="flex-1 bg-[#ECAE62] hover:bg-[#8C641C] text-[#0B1420]">Confirmar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserFlow;
