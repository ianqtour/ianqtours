import React, { useEffect, useState } from 'react'
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { buildWhatsAppUrl } from '@/lib/whatsapp'
import { MapPin, CalendarDays, Clock, Users, ArrowRight, Tag, CreditCard, CheckCircle } from 'lucide-react'

  const ExcursionDetails = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [excursion, setExcursion] = useState(null)
    const [descExpanded, setDescExpanded] = useState(false)
    const [availableSeats, setAvailableSeats] = useState(null)
    const [isAdmin, setIsAdmin] = useState(false)

    useEffect(() => {
      const checkAdmin = async () => {
        const { data } = await supabase.auth.getSession()
        if (data.session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.session.user.id)
            .single()
          setIsAdmin(profile?.role === 'admin')
        }
      }
      checkAdmin()
    }, [])

    useEffect(() => {
      const load = async () => {
        setLoading(true)
        const idNum = Number(id)
        let data = null
      const tryString = await supabase
        .from('excursoes')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      data = tryString.data || null
      if (!data && !Number.isNaN(idNum)) {
        const tryNumber = await supabase
          .from('excursoes')
          .select('*')
          .eq('id', idNum)
          .maybeSingle()
        data = tryNumber.data || null
      }
      setExcursion(data)
      if (data) {
        const { data: buses } = await supabase
          .from('onibus')
          .select('id,total_assentos')
          .eq('excursao_id', data.id)
        const ids = (buses || []).map(b => b.id)
        if (ids.length) {
          const { data: seats } = await supabase
            .from('assentos_onibus')
            .select('onibus_id,status')
            .in('onibus_id', ids)
          if (seats && seats.length) {
            const avail = seats.filter(s => s.status !== 'ocupado').length
            setAvailableSeats(avail)
          } else {
            const total = (buses || []).reduce((acc, b) => acc + (Number(b.total_assentos) || 0), 0)
            setAvailableSeats(total)
          }
        } else {
          setAvailableSeats(null)
        }
      } else {
        setAvailableSeats(null)
      }
        setLoading(false)
      }
      load()
    }, [id])

  const formatDate = (s) => {
    if (!s) return ''
    return new Date(s).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  }

  const formatPrice = (value) => {
    if (value == null) return ''
    return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const toUserFlowExcursion = (row) => ({
    id: row.id,
    name: row.nome,
    description: row.descricao,
    destination: row.destino,
    date: row.horario_partida,
    duration: row.duracao,
    price: Number(row.preco),
    availableSeats: Number(availableSeats ?? 0),
    image: row.imagem_url || ''
  })

  const handleReserve = () => {
    if (!excursion) return
    const mapped = toUserFlowExcursion(excursion)
    const dateStr = formatDate(mapped.date)
    const priceStr = formatPrice(mapped.price)
    const text =
      `Olá!\n\n` +
      `Quero reservar minha vaga:\n` +
      `• *Excursão:* ${mapped.name}\n` +
      `• *Destino:* ${mapped.destination}\n` +
      `• *Data:* ${dateStr}\n` +
      `• *Preço:* ${priceStr}\n\n` +
      `Pode me confirmar a disponibilidade e os próximos passos?`
    const waUrl = buildWhatsAppUrl(text)
    window.open(waUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="w-full overflow-x-hidden text-white">
      <Navbar />
      <section className="pt-24 pb-12 px-4">
        <div className="container mx-auto">
          {loading ? (
            <div className="text-center py-24">Carregando detalhes...</div>
          ) : !excursion ? (
            <div className="text-center py-24">Excursão não encontrada.</div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-lg"
            >
              <div className="relative h-56 sm:h-80 md:h-96">
                <img src={excursion.imagem_url || 'https://images.unsplash.com/photo-1632178151697-fd971baa906f'} alt={excursion.nome} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold">{excursion.nome}</h1>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-white/85">
                    {excursion.destino && (
                      <span className="flex items-center"><MapPin className="h-4 w-4 mr-1 text-[#ECAE62]" /> {excursion.destino}</span>
                    )}
                    {excursion.horario_partida && (
                      <span className="flex items-center"><CalendarDays className="h-4 w-4 mr-1 text-[#ECAE62]" /> {formatDate(excursion.horario_partida)}</span>
                    )}
                    {excursion.duracao && (
                      <span className="flex items-center"><Clock className="h-4 w-4 mr-1 text-[#ECAE62]" /> {excursion.duracao}</span>
                    )}
                    {availableSeats != null && (
                      <span className="flex items-center"><Users className="h-4 w-4 mr-1 text-[#ECAE62]" /> {availableSeats} vagas</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8">
                {excursion.descricao && (
                  <>
                    <p className="text-white/85 text-lg mb-2 whitespace-pre-line">
                      {descExpanded
                        ? excursion.descricao
                        : (excursion.descricao.length > 200
                            ? excursion.descricao.slice(0, 200) + '...'
                            : excursion.descricao)}
                    </p>
                    {excursion.descricao.length > 200 && (
                      <div className="mb-6">
                        <button
                          type="button"
                          className="text-[#ECAE62] underline text-sm"
                          onClick={() => setDescExpanded(!descExpanded)}
                        >
                          {descExpanded ? 'Ver menos' : 'Ver mais'}
                        </button>
                      </div>
                    )}
                  </>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                    <h2 className="text-xl font-bold mb-4">Informações</h2>
                    <div className="space-y-3 text-white/85">
                      <div className="flex items-start gap-3">
                        <Tag className="h-5 w-5 text-[#ECAE62]" />
                        <div className="flex-1">
                          <div className="text-xs uppercase tracking-wide text-white/60">Preço</div>
                          <div className="text-base font-semibold text-[#ECAE62]">{formatPrice(excursion.preco)}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CreditCard className="h-5 w-5 text-[#ECAE62]" />
                        <div className="flex-1">
                          <div className="text-xs uppercase tracking-wide text-white/60">Forma de pagamento</div>
                          <div className="text-sm whitespace-pre-line text-white/85">{excursion.forma_pagamento || '-'}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Clock className="h-5 w-5 text-[#ECAE62]" />
                        <div className="flex-1">
                          <div className="text-xs uppercase tracking-wide text-white/60">Duração</div>
                          <div className="text-sm">{excursion.duracao || '-'}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-[#ECAE62]" />
                        <div className="flex-1">
                          <div className="text-xs uppercase tracking-wide text-white/60">Destino</div>
                          <div className="text-sm">{excursion.destino || '-'}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Users className="h-5 w-5 text-[#ECAE62]" />
                        <div className="flex-1">
                          <div className="text-xs uppercase tracking-wide text-white/60">Assentos disponíveis</div>
                          <div className="text-sm">{availableSeats != null ? availableSeats : '-'}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                    <h2 className="text-xl font-bold mb-4">O que estará incluso?</h2>
                    {(() => {
                      const inclusoes = String(excursion.incluso || '')
                        .split(/\r?\n/)
                        .map((s) => s.trim())
                        .filter(Boolean)
                      return inclusoes.length ? (
                        <ul className="space-y-2">
                          {inclusoes.map((item, idx) => (
                            <li key={idx} className="grid grid-cols-[20px_1fr] sm:grid-cols-[24px_1fr] gap-3 items-start">
                              <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-[#ECAE62]" />
                              <span className="text-white/85 text-sm leading-5 break-words">{item}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-white/60">-</div>
                      )
                    })()}
                  </div>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <RouterLink to="/" className="text-white/80 hidden sm:inline">Voltar</RouterLink>
                  {(() => {
                    const isExpired = excursion.horario_partida ? new Date(excursion.horario_partida) < new Date() : false;
                    const hasSeats = availableSeats === null || availableSeats > 0;
                    
                    if (isAdmin || (hasSeats && !isExpired)) {
                      return (
                        <motion.div
                          animate={{ scale: [1, 1.02, 1] }}
                          transition={{ repeat: Infinity, duration: 2.4 }}
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full sm:w-auto"
                        >
                          <Button onClick={handleReserve} className="w-full sm:w-auto bg-gradient-to-r from-[#ECAE62] to-[#FFD27A] text-[#0B1420] font-semibold py-3 shadow-lg ring-2 ring-[#ECAE62]/40 hover:brightness-105">
                            Reservar agora <ArrowRight className="ml-2 h-5 w-5" />
                          </Button>
                        </motion.div>
                      );
                    }
                    
                    return (
                      <div className="text-red-500 font-bold uppercase tracking-wider bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/20">
                        {isExpired ? 'Excursão Finalizada' : 'Vagas Esgotadas'}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </section>
      <Footer />
    </div>
  )
}

export default ExcursionDetails
