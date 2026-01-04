import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/landing/Navbar'

const ExcursionSelection = ({ onSelect, onAdminBack }) => {
  const [excursions, setExcursions] = useState([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('excursoes').select('*').order('horario_partida', { ascending: true })
      const exList = data || []
      const exIds = exList.map(r => r.id)
      let busByExc = {}
      let availByExc = {}
      if (exIds.length) {
        const { data: buses } = await supabase
          .from('onibus')
          .select('id,excursao_id,total_assentos')
          .in('excursao_id', exIds)
        const busIds = (buses || []).map(b => b.id)
        ;(buses || []).forEach(b => {
          busByExc[b.excursao_id] = (busByExc[b.excursao_id] || []).concat(b)
        })
        if (busIds.length) {
          const { data: seats } = await supabase
            .from('assentos_onibus')
            .select('onibus_id,status')
            .in('onibus_id', busIds)
          const byBus = {}
          ;(seats || []).forEach(s => {
            byBus[s.onibus_id] = (byBus[s.onibus_id] || []).concat(s)
          })
          exIds.forEach(exId => {
            const busesForExc = busByExc[exId] || []
            if (busesForExc.length) {
              let count = 0
              busesForExc.forEach(b => {
                const ss = byBus[b.id] || []
                if (ss.length) {
                  count += ss.filter(s => s.status !== 'ocupado').length
                } else {
                  count += Number(b.total_assentos) || 0
                }
              })
              availByExc[exId] = count
            }
          })
        }
      }
      const mapped = exList.map((row) => ({
        id: row.id,
        name: row.nome,
        description: row.descricao,
        destination: row.destino,
        date: row.horario_partida,
        duration: row.duracao,
        price: Number(row.preco),
        availableSeats: availByExc[row.id] ?? null,
        image: row.imagem_url || ''
      }))
      setExcursions(mapped)
    }
    load()
  }, []);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {onAdminBack && <Navbar adminBackAction={onAdminBack} disableDesktopButtons disableMobileMenu />}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-white mb-4">
            Bem-vindo à <span className="text-[#ECAE62]">IanqTour</span>
          </h1>
          <p className="text-xl text-white/80">Escolha sua aventura perfeita</p>
        </motion.div>

        {excursions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-12 text-center"
          >
            <p className="text-white text-xl">Nenhuma excursão disponível ainda.</p>
            <p className="text-white/70 mt-2">Por favor, contate o administrador para adicionar excursões.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {excursions.map((excursion, index) => (
              <motion.div
                key={excursion.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl overflow-hidden hover:scale-105 transition-transform duration-300 shadow-xl"
              >
                <div className="h-40 sm:h-48 overflow-hidden">
                  <img
                    src={excursion.image}
                    alt={excursion.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-bold text-white mb-2">{excursion.name}</h3>
                  <p className="text-white/70 mb-4 line-clamp-2">{excursion.description}</p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-white/80">
                      <MapPin className="h-4 w-4 mr-2 text-[#ECAE62]" />
                      <span className="text-sm">{excursion.destination}</span>
                    </div>
                    <div className="flex items-center text-white/80">
                      <Calendar className="h-4 w-4 mr-2 text-[#ECAE62]" />
                      <span className="text-sm">{new Date(excursion.date).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span>
                    </div>
                    <div className="flex items-center text-white/80">
                      <Clock className="h-4 w-4 mr-2 text-[#ECAE62]" />
                      <span className="text-sm">{excursion.duration}</span>
                    </div>
                    {excursion.availableSeats != null && (
                      <div className="flex items-center text-white/80">
                        <Users className="h-4 w-4 mr-2 text-[#ECAE62]" />
                        <span className="text-sm">{excursion.availableSeats} assentos disponíveis</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-2xl font-bold text-[#ECAE62]">R${excursion.price}</span>
                    <Button
                      onClick={() => onSelect(excursion)}
                      className="w-full sm:w-auto bg-[#ECAE62] hover:bg-[#FFD27A] text-[#0B1420]"
                    >
                      Selecionar Passeio
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExcursionSelection;
