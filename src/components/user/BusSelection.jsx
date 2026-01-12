import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Bus, Users, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase'

const BusSelection = ({ excursion, onSelect, onBack }) => {
  const [buses, setBuses] = useState([]);

  const formatDateTime = (s) => {
    if (!s) return ''
    const d = new Date(s)
    const dateStr = d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    const timeStr = d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false })
    const hourNum = Number(new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }).format(d))
    const period = hourNum < 12 ? 'da manhã' : hourNum < 18 ? 'da tarde' : 'da noite'
    return `${dateStr} - Saída às ${timeStr} ${period}`
  }

  useEffect(() => {
    const load = async () => {
      const { data: busesData } = await supabase
        .from('onibus')
        .select('*')
        .eq('excursao_id', excursion.id)

      const busList = (busesData || []).map((row) => ({
        id: row.id,
        name: row.nome,
        type: row.tipo,
        identification: row.identificacao,
        excursionId: row.excursao_id,
        totalSeats: Number(row.total_assentos),
        seats: [],
      }))

      const ids = busList.map(b => b.id)
      let seatsByBus = {}
      let occupantByBusSeat = {}
      if (ids.length > 0) {
        const { data: seatsData } = await supabase
          .from('assentos_onibus')
          .select('onibus_id, numero_assento, status')
          .in('onibus_id', ids)
        seatsByBus = (seatsData || []).reduce((acc, s) => {
          const arr = acc[s.onibus_id] || []
          arr.push({ number: s.numero_assento, status: s.status === 'ocupado' ? 'occupied' : 'available' })
          acc[s.onibus_id] = arr
          return acc
        }, {})

        const { data: resData } = await supabase
          .from('reservas')
          .select('id,onibus_id')
          .in('onibus_id', ids)
        const reservaToBus = new Map((resData || []).map(r => [r.id, r.onibus_id]))
        const resIds = (resData || []).map(r => r.id)
        let paxRes = []
        if (resIds.length > 0) {
          const { data: paxResData } = await supabase
            .from('passageiros_reserva')
            .select('reserva_id,numero_assento,passageiro_id')
            .in('reserva_id', resIds)
          paxRes = paxResData || []
        }
        const paxIds = Array.from(new Set((paxRes || []).map(p => p.passageiro_id).filter(Boolean)))
        let passengers = []
        if (paxIds.length > 0) {
          const { data: passengersData } = await supabase
            .from('passageiros')
            .select('id,nome,telefone,data_nascimento')
            .in('id', paxIds)
          passengers = passengersData || []
        }
        const infoById = new Map(passengers.map(p => [String(p.id), {
          name: String(p.nome || '').toUpperCase(),
          phone: p.telefone || '',
          birthDate: p.data_nascimento || ''
        }]))
        occupantByBusSeat = (paxRes || []).reduce((acc, pr) => {
          const busId = reservaToBus.get(pr.reserva_id)
          if (!busId) return acc
          const seatNum = Number(pr.numero_assento)
          const info = infoById.get(String(pr.passageiro_id)) || { name: '', phone: '', birthDate: '' }
          const map = acc[busId] || {}
          map[seatNum] = info
          acc[busId] = map
          return acc
        }, {})
      }

      const enriched = busList.map(b => ({
        ...b,
        seats: (seatsByBus[b.id] || []).map(s => {
          const occ = occupantByBusSeat[b.id]?.[Number(s.number)] || null
          return {
            ...s,
            status: occ ? 'occupied' : s.status,
            occupant: occ
          }
        })
      }))
      setBuses(enriched)
    }
    load()
  }, [excursion.id]);

  const getAvailableSeats = (bus) => {
    return bus.seats.filter(seat => seat.status === 'available').length;
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <Button
          onClick={onBack}
          variant="ghost"
          className="mb-6 text-white hover:bg-white/10"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Excursões
        </Button>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 md:p-6 mb-8"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">{excursion.name}</h2>
          <div className="flex items-center text-white/70">
            <Calendar className="h-4 w-4 mr-2" />
            <span>{formatDateTime(excursion.date)}</span>
          </div>
        </motion.div>

        <h3 className="text-2xl font-bold text-white mb-6">Selecione Seu Ônibus</h3>

        {buses.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 md:p-12 text-center"
          >
            <p className="text-white text-xl">Nenhum ônibus disponível para esta excursão.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {buses.map((bus, index) => (
              <motion.div
                key={bus.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 md:p-6 hover:scale-105 transition-transform duration-300"
              >
                <div className="flex items-center mb-4">
                  <div className="bg-[#ECAE62] p-3 rounded-full mr-4">
                    <Bus className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white">{bus.name}</h4>
                    <p className="text-white/70 text-sm">{bus.type}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center justify-between text-white/80">
                    <span className="flex items-center">
                      <Users className="h-4 w-4 mr-2 text-[#ECAE62]" />
                      Total de Assentos
                    </span>
                    <span className="font-semibold">{bus.seats.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-white/80">
                    <span className="flex items-center">
                      <Users className="h-4 w-4 mr-2 text-green-400" />
                      Disponíveis
                    </span>
                    <span className="font-semibold text-green-400">{getAvailableSeats(bus)}</span>
                  </div>
                </div>

                <Button
                  onClick={() => onSelect(bus)}
                  disabled={getAvailableSeats(bus) === 0}
                  className="w-full bg-[#ECAE62] hover:bg-[#8C641C] text-white disabled:opacity-50"
                >
                  {getAvailableSeats(bus) === 0 ? 'Esgotado' : 'Selecionar Ônibus'}
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BusSelection;
