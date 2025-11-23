import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import { supabase } from '@/lib/supabase'
import { CalendarDays, MapPin, Ticket } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

const MeusIngressos = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [cpf, setCpf] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])
  const [passenger, setPassenger] = useState(null)

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
    const c = String(v).replace(/\D/g, '')
    if (c.length !== 11 || /(\d)\1{10}/.test(c)) return false
    let sum = 0
    for (let i = 0; i < 9; i++) sum += parseInt(c[i]) * (10 - i)
    let d1 = (sum * 10) % 11; if (d1 === 10) d1 = 0
    if (d1 !== parseInt(c[9])) return false
    sum = 0
    for (let i = 0; i < 10; i++) sum += parseInt(c[i]) * (11 - i)
    let d2 = (sum * 10) % 11; if (d2 === 10) d2 = 0
    return d2 === parseInt(c[10])
  }

  const handleCpfChange = (e) => setCpf(formatCpf(e.target.value))

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })

  const handleSearch = async () => {
    const valid = validateCpf(cpf)
    if (!valid) {
      toast({ title: 'CPF inválido', description: 'Digite um CPF válido.', variant: 'destructive' })
      return
    }
    setLoading(true)
    setResults([])
    setPassenger(null)
    const digits = cpf.replace(/\D/g, '')
    const { data: pax } = await supabase
      .from('passageiros')
      .select('id,nome')
      .eq('cpf', digits)
      .maybeSingle()
    if (!pax?.id) {
      setLoading(false)
      setResults([])
      toast({ title: 'Nenhum ingresso encontrado', description: 'Não encontramos reservas para este CPF.' })
      return
    }
    setPassenger(pax)
    const { data: links } = await supabase
      .from('passageiros_reserva')
      .select('reserva_id, numero_assento')
      .eq('passageiro_id', pax.id)
    const reservaIds = (links || []).map(l => l.reserva_id).filter(Boolean)
    if (reservaIds.length === 0) {
      setLoading(false)
      setResults([])
      return
    }
    const { data: reservas } = await supabase
      .from('reservas')
      .select('id, excursao_id, status, criado_em, ingresso_url')
      .in('id', reservaIds)
    const excursaoIds = Array.from(new Set((reservas || []).map(r => r.excursao_id).filter(Boolean)))
    let excursaoById = {}
    if (excursaoIds.length > 0) {
      const { data: exData } = await supabase
        .from('excursoes')
        .select('id, nome, destino, imagem_url, horario_partida, preco')
        .in('id', excursaoIds)
      excursaoById = (exData || []).reduce((acc, e) => { acc[e.id] = e; return acc }, {})
    }
    const seatByReserva = (links || []).reduce((acc, l) => { acc[l.reserva_id] = l.numero_assento; return acc }, {})
    const ticketUrlByReserva = {}
    const items = (reservas || []).map(r => {
      const ex = excursaoById[r.excursao_id] || {}
      return {
        reservaId: r.id,
        status: r.status,
        seat: seatByReserva[r.id],
        ticketUrl: ticketUrlByReserva[r.id] || r.ingresso_url,
        excursion: {
          id: ex.id,
          name: ex.nome,
          destination: ex.destino,
          image: ex.imagem_url,
          date: ex.horario_partida,
          price: ex.preco,
        },
        createdAt: r.criado_em,
      }
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    setResults(items)
    setLoading(false)
  }

  return (
    <div className="w-full min-h-screen bg-[#0B1420] bg-gradient-to-br from-[#0B1420] via-[#0E1E2E] to-[#0B1420] text-white">
      <Navbar />
      <section className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h1 className="text-3xl font-bold mb-2">Meus ingressos</h1>
            <p className="text-white/70 mb-6">Consulte suas reservas informando seu CPF.</p>
            <div className="space-y-2 mb-4">
              <Label className="text-white">CPF</Label>
              <Input value={cpf} onChange={handleCpfChange} placeholder="000.000.000-00" className={`bg-white/10 border ${cpf.replace(/\D/g,'').length===11 && !validateCpf(cpf)?'border-red-500':'border-white/20'} text-white placeholder:text-white/50`} />
              {cpf.replace(/\D/g,'').length===11 && !validateCpf(cpf) && (
                <p className="text-red-400 text-xs">CPF inválido</p>
              )}
            </div>
            <div className="flex gap-3">
              <Button onClick={handleSearch} disabled={loading} className="flex-1 bg-[#ECAE62] hover:bg-[#8C641C] text-[#0B1420] disabled:opacity-50">{loading ? 'Consultando...' : 'Consultar'}</Button>
            </div>
          </div>

          {passenger && (
            <div className="mt-6 text-white/80">Passageiro: <span className="text-white font-semibold">{passenger.nome}</span></div>
          )}

          {results.length > 0 ? (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {results.map((item) => (
                <div key={item.reservaId} className="group relative bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-lg">
                  <div className="relative h-40">
                    <img className="w-full h-full object-cover" alt={item.excursion.name} src={item.excursion.image || 'https://images.unsplash.com/photo-1632178151697-fd971baa906f'} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-xl font-bold text-white mb-1 line-clamp-2">{item.excursion.name}</h3>
                    <p className="text-white/70 mb-2 flex items-center"><MapPin className="h-4 w-4 mr-2 text-[#ECAE62]" /> {item.excursion.destination}</p>
                    <p className="text-white/70 mb-2 flex items-center"><CalendarDays className="h-4 w-4 mr-2 text-[#ECAE62]"/> {item.excursion.date ? formatDate(item.excursion.date) : '-'}</p>
                    <p className="text-white/70 mb-4 flex items-center"><Ticket className="h-4 w-4 mr-2 text-[#ECAE62]"/> Assento {item.seat}</p>
                    <div className="flex flex-col md:flex-row gap-3">
                      <Button
                        variant="ghost"
                        onClick={() => { if (item.ticketUrl) window.open(item.ticketUrl, '_blank') }}
                        disabled={!item.ticketUrl}
                        className="w-full md:flex-1 bg-transparent border border-white/30 text-white hover:bg-white/10"
                      >
                        Baixar ingresso
                      </Button>
                      {item.excursion.id && (
                        <Button onClick={() => navigate(`/excursoes/${item.excursion.id}`)} className="w-full md:flex-1 bg-gradient-to-r from-[#ECAE62] to-[#FFD27A] text-[#0B1420] font-semibold py-3 ring-2 ring-[#ECAE62]/40 hover:brightness-105">Ver excursão</Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 bg-white/5 rounded-xl p-8 text-center text-white/70">Nenhuma reserva encontrada</div>
          )}
        </div>
      </section>
      <Footer />
    </div>
  )
}

export default MeusIngressos