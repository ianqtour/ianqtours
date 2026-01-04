import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { Calendar, MapPin, Users, Armchair, BadgeDollarSign, CheckCircle, AlertTriangle, RotateCcw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const FinanceManagement = () => {
  const [bookings, setBookings] = useState([])
  const [excursions, setExcursions] = useState([])
  const [selectedExcursionId, setSelectedExcursionId] = useState(null)
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [openPlanFor, setOpenPlanFor] = useState(null)
  const [openViewPlan, setOpenViewPlan] = useState(null)
  const [currentPlan, setCurrentPlan] = useState(null)
  const [currentInstallments, setCurrentInstallments] = useState([])
  const [entrada, setEntrada] = useState('')
  const [valorParcela, setValorParcela] = useState('')
  const [qtdParcelas, setQtdParcelas] = useState('1')
  const [primeiroPagamento, setPrimeiroPagamento] = useState('')
  const [loading, setLoading] = useState(false)
  const [tablesMissing, setTablesMissing] = useState(false)
  const { toast } = useToast()

  const normalizeText = (s) => (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const plain = String(dateStr)
    const m = plain.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (m) {
      const yyyy = m[1]
      const mm = m[2]
      const dd = m[3]
      return `${dd}/${mm}/${yyyy}`
    }
    const date = new Date(plain)
    return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  }

  useEffect(() => {
    loadExcursions()
  }, [])

  useEffect(() => {
    loadBookings()
  }, [selectedExcursionId])

  const loadExcursions = async () => {
    const { data: exData } = await supabase.from('excursoes').select('id, nome, preco')
    setExcursions((exData || []).map(e => ({ id: e.id, name: e.nome, price: Number(e.preco || 0) })))
  }

  const loadBookings = async () => {
    let query = supabase
      .from('reservas')
      .select('id, excursao_id, onibus_id, status, criado_em')
      .neq('status', 'cancelada')
      .order('criado_em', { ascending: false })

    if (selectedExcursionId) {
      query = query.eq('excursao_id', selectedExcursionId)
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
      const { data: paxDetails } = await supabase
        .from('passageiros')
        .select('id, nome, telefone')
        .in('id', passengerIds)
      passengers = paxDetails || []
    }

    let plansSet = new Set()
    const planByKey = new Map()
    const planIds = []
    if (reservationIds.length > 0 && passengerIds.length > 0) {
      const { data: plans, error: planErr } = await supabase
        .from('finance_payment_plans')
        .select('id, reserva_id, passageiro_id')
        .in('reserva_id', reservationIds)
        .in('passageiro_id', passengerIds)
      if (!planErr && Array.isArray(plans)) {
        for (const it of plans) {
          plansSet.add(`${String(it.reserva_id)}:${String(it.passageiro_id)}`)
          const key = `${String(it.reserva_id)}:${String(it.passageiro_id)}`
          planByKey.set(key, it.id)
          planIds.push(it.id)
        }
      }
    }

    let planStatsById = new Map()
    if (planIds.length > 0) {
      const { data: insts } = await supabase
        .from('finance_installments')
        .select('plano_id, valor, status')
        .in('plano_id', planIds)
      const acc = new Map()
      for (const it of insts || []) {
        const pid = String(it.plano_id)
        const g = acc.get(pid) || { total: 0, paid: 0, overdue: 0, hasOverdue: false }
        const val = Number(it.valor || 0)
        g.total += val
        if (String(it.status) === 'pago') g.paid += val
        if (String(it.status) === 'atrasado') { g.hasOverdue = true; g.overdue += val }
        acc.set(pid, g)
      }
      for (const [pid, g] of acc.entries()) {
        const pct = g.total > 0 ? Math.round((g.paid / g.total) * 100) : 0
        planStatsById.set(pid, { pct, hasOverdue: !!g.hasOverdue, totalAmount: g.total, paidAmount: g.paid, overdueAmount: g.overdue })
      }
    }

    const passengerByIdMap = new Map()
    passengers.forEach((p) => {
      passengerByIdMap.set(String(p.id), {
        id: String(p.id),
        nome: (p.nome || '').toUpperCase(),
        telefone: p.telefone || '',
      })
    })

    const paxByReserva = (paxRes || []).reduce((acc, p) => {
      const arr = acc[p.reserva_id] || []
      const ref = passengerByIdMap.get(String(p.passageiro_id)) || {}
      const key = `${String(p.reserva_id)}:${String(p.passageiro_id)}`
      const planId = planByKey.get(key)
      const stats = planId ? planStatsById.get(String(planId)) || { pct: 0, hasOverdue: false, totalAmount: 0, paidAmount: 0, overdueAmount: 0 } : { pct: 0, hasOverdue: false, totalAmount: 0, paidAmount: 0, overdueAmount: 0 }
      arr.push({
        id: p.id,
        seatNumber: Number(p.numero_assento),
        name: ref.nome || '',
        phone: ref.telefone || '',
        passageiroId: String(p.passageiro_id),
        hasPlan: plansSet.has(`${String(p.reserva_id)}:${String(p.passageiro_id)}`),
        progressPercent: stats.pct,
        hasOverdue: !!stats.hasOverdue,
        totalAmount: stats.totalAmount,
        paidAmount: stats.paidAmount,
        overdueAmount: stats.overdueAmount,
      })
      acc[p.reserva_id] = arr
      return acc
    }, {})

    const bookingsList = (resData || []).map(r => {
      const list = (paxByReserva[r.id] || []).sort((a, b) => Number(a.seatNumber) - Number(b.seatNumber))
      return {
        id: r.id,
        excursionId: r.excursao_id,
        passengers: list,
        seats: list.map(p => p.seatNumber),
        date: r.criado_em,
        status: r.status,
      }
    })

    setBookings(bookingsList)
  }

  const monthAddSameDay = (dateStr, addMonths) => {
    const plain = String(dateStr)
    let yyyy, mm, dd
    const m = plain.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (m) {
      yyyy = Number(m[1])
      mm = Number(m[2])
      dd = Number(m[3])
    } else {
      const d = new Date(plain)
      yyyy = d.getFullYear()
      mm = d.getMonth() + 1
      dd = d.getDate()
    }
    const monthIndex = mm - 1
    const targetMonthIndex = monthIndex + addMonths
    const year = yyyy + Math.floor(targetMonthIndex / 12)
    const month = ((targetMonthIndex % 12) + 12) % 12
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate()
    const safeDay = Math.min(dd, lastDayOfMonth)
    const res = new Date(year, month, safeDay)
    return `${res.getFullYear()}-${String(res.getMonth() + 1).padStart(2, '0')}-${String(res.getDate()).padStart(2, '0')}`
  }

  const handleOpenPlan = (booking, passenger) => {
    setOpenPlanFor({ booking, passenger })
    setEntrada('')
    setValorParcela('')
    setQtdParcelas('1')
    setPrimeiroPagamento('')
  }

  const handleOpenViewPlan = async (booking, passenger) => {
    try {
      setTablesMissing(false)
      const { data: plan, error: planErr } = await supabase
        .from('finance_payment_plans')
        .select('*')
        .eq('reserva_id', booking.id)
        .eq('passageiro_id', passenger.passageiroId)
        .maybeSingle()
      if (planErr) {
        if ((planErr.message || '').includes('relation')) setTablesMissing(true)
        throw planErr
      }
      if (!plan) {
        toast({ title: 'Nenhum plano encontrado', description: 'Crie um plano para este passageiro.', variant: 'destructive' })
        return
      }
      const { data: inst, error: instErr } = await supabase
        .from('finance_installments')
        .select('*')
        .eq('plano_id', plan.id)
        .order('numero', { ascending: true })
      if (instErr) {
        if ((instErr.message || '').includes('relation')) setTablesMissing(true)
        throw instErr
      }
      setCurrentPlan(plan)
      setCurrentInstallments(inst || [])
      setOpenViewPlan({ booking, passenger })
    } catch (err) {
      toast({ title: 'Erro ao carregar plano', description: tablesMissing ? 'Aplique a migração SQL do financeiro.' : (err.message || 'Erro inesperado'), variant: 'destructive' })
    }
  }

  const markInstallmentPaid = async (inst) => {
    try {
      const now = new Date()
      const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}Z`
      const { error } = await supabase
        .from('finance_installments')
        .update({ status: 'pago', pago_em: iso, metodo: inst.__method || null })
        .eq('id', inst.id)
      if (error) throw error
      const updated = currentInstallments.map(i => i.id === inst.id ? { ...i, status: 'pago', pago_em: iso } : i)
      setCurrentInstallments(updated)
      const total = updated.reduce((acc, i) => acc + Number(i.valor || 0), 0)
      const paid = updated.filter(i => String(i.status) === 'pago').reduce((acc, i) => acc + Number(i.valor || 0), 0)
      const pct = total > 0 ? Math.round((paid / total) * 100) : 0
      const hasOverdue = updated.some(i => String(i.status) === 'atrasado')
      if (openViewPlan && currentPlan) {
        const bid = openViewPlan.booking.id
        const pid = openViewPlan.passenger.passageiroId
        setBookings(prev => prev.map(b => {
          if (b.id !== bid) return b
          return {
            ...b,
            passengers: b.passengers.map(p => p.passageiroId === String(pid) ? { ...p, progressPercent: pct, hasOverdue } : p)
          }
        }))
      }
      toast({ title: 'Parcela paga', description: `Parcela #${inst.numero} marcada como paga.` })
    } catch (err) {
      toast({ title: 'Erro ao marcar como paga', description: err.message || 'Falha inesperada', variant: 'destructive' })
    }
  }

  const markInstallmentPending = async (inst) => {
    try {
      const { error } = await supabase
        .from('finance_installments')
        .update({ status: 'pendente', pago_em: null })
        .eq('id', inst.id)
      if (error) throw error
      const updated = currentInstallments.map(i => i.id === inst.id ? { ...i, status: 'pendente', pago_em: null } : i)
      setCurrentInstallments(updated)
      const total = updated.reduce((acc, i) => acc + Number(i.valor || 0), 0)
      const paid = updated.filter(i => String(i.status) === 'pago').reduce((acc, i) => acc + Number(i.valor || 0), 0)
      const pct = total > 0 ? Math.round((paid / total) * 100) : 0
      const hasOverdue = updated.some(i => String(i.status) === 'atrasado')
      if (openViewPlan && currentPlan) {
        const bid = openViewPlan.booking.id
        const pid = openViewPlan.passenger.passageiroId
        setBookings(prev => prev.map(b => {
          if (b.id !== bid) return b
          return {
            ...b,
            passengers: b.passengers.map(p => p.passageiroId === String(pid) ? { ...p, progressPercent: pct, hasOverdue } : p)
          }
        }))
      }
      toast({ title: 'Parcela revertida', description: `Parcela #${inst.numero} voltou para pendente.` })
    } catch (err) {
      toast({ title: 'Erro ao reverter parcela', description: err.message || 'Falha inesperada', variant: 'destructive' })
    }
  }

  const [payMethodOpen, setPayMethodOpen] = useState(false)
  const [payMethodInst, setPayMethodInst] = useState(null)
  const [payMethod, setPayMethod] = useState('')
  const [payMethodSaving, setPayMethodSaving] = useState(false)

  const openPayMethod = (inst) => {
    setPayMethodInst(inst)
    setPayMethod('')
    setPayMethodOpen(true)
  }

  const confirmPayMethod = async () => {
    if (!payMethodInst) return
    if (!payMethod) {
      toast({ title: 'Selecione a forma de pagamento', description: 'Escolha Pix, Dinheiro ou Cartão.', variant: 'destructive' })
      return
    }
    try {
      setPayMethodSaving(true)
      const payload = { ...payMethodInst, __method: payMethod }
      await markInstallmentPaid(payload)
      setPayMethodOpen(false)
      setPayMethodInst(null)
      setPayMethod('')
    } catch (e) {
    } finally {
      setPayMethodSaving(false)
    }
  }

  const tryInsertPlan = async (payload) => {
    const { data, error } = await supabase
      .from('finance_payment_plans')
      .insert(payload)
      .select()
      .single()
    if (error) {
      if ((error.message || '').includes('relation') || (error.details || '').includes('does not exist')) {
        setTablesMissing(true)
      }
      throw error
    }
    return data
  }

  const tryInsertInstallments = async (rows) => {
    const { error } = await supabase
      .from('finance_installments')
      .insert(rows)
    if (error) {
      if ((error.message || '').includes('relation') || (error.details || '').includes('does not exist')) {
        setTablesMissing(true)
      }
      throw error
    }
  }

  const handleCreatePlan = async () => {
    if (!openPlanFor) return
    const booking = openPlanFor.booking
    const passenger = openPlanFor.passenger
    const entradaNum = Number(String(entrada).replace(',', '.')) || 0
    const parcelaNum = Number(String(valorParcela).replace(',', '.')) || 0
    const parcelasTot = Math.max(1, Number(qtdParcelas))
    if (!primeiroPagamento) {
      toast({ title: 'Data do primeiro pagamento obrigatória', description: 'Informe a data', variant: 'destructive' })
      return
    }
    if (parcelaNum <= 0) {
      toast({ title: 'Valor da parcela inválido', description: 'Informe um valor maior que zero', variant: 'destructive' })
      return
    }
    setLoading(true)
    setTablesMissing(false)
    try {
      const planPayload = {
        reserva_id: booking.id,
        passageiro_id: passenger.passageiroId,
        excursao_id: booking.excursionId,
        entrada_valor: entradaNum,
        parcela_valor: parcelaNum,
        parcelas_total: parcelasTot,
        primeiro_pagamento_data: primeiroPagamento,
        status: 'ativo',
      }
      const plan = await tryInsertPlan(planPayload)
      const rows = []
      if (entradaNum > 0) {
        const today = new Date()
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
        rows.push({
          plano_id: plan.id,
          numero: 0,
          vencimento: todayStr,
          valor: entradaNum,
          status: 'pendente',
        })
      }
      for (let i = 1; i <= parcelasTot; i++) {
        const due = i === 1 ? primeiroPagamento : monthAddSameDay(primeiroPagamento, i - 1)
        rows.push({
          plano_id: plan.id,
          numero: i,
          vencimento: due,
          valor: parcelaNum,
          status: 'pendente',
        })
      }
      await tryInsertInstallments(rows)
      toast({
        title: 'Plano criado',
        description: `Entrada R$ ${entradaNum.toFixed(2)} + ${parcelasTot}× R$ ${parcelaNum.toFixed(2)} a partir de ${formatDate(primeiroPagamento)}.`,
      })
      setOpenPlanFor(null)
      await loadBookings()
    } catch (err) {
      toast({
        title: 'Erro ao criar plano',
        description: tablesMissing
          ? 'Tabelas de financeiro não encontradas. Aplique a migração SQL sugerida no projeto.'
          : (err.message || 'Falha inesperada'),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const getExcursionName = (excursionId) => {
    const e = excursions.find(x => x.id === excursionId)
    return e ? e.name : 'Desconhecida'
  }
  const getExcursionPrice = (excursionId) => {
    const e = excursions.find(x => x.id === excursionId)
    return e ? Number(e.price || 0) : 0
  }

  return (
    <div className="space-y-3 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h2 className="text-xl sm:text-2xl font-bold text-white">Financeiro</h2>
        <div className="text-sm sm:text-base text-white/70">Gerencie planos e parcelas</div>
      </div>

      <div className="bg-white/5 rounded-xl p-3 md:p-4 border border-white/10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4">
          <div>
            <Select value={selectedExcursionId || ''} onValueChange={(v) => setSelectedExcursionId(v)}>
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="in_days">Em dias</SelectItem>
                <SelectItem value="overdue">Inadimplentes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Buscar por nome ou poltrona"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
        {
          (() => {
            let totalPassengers = 0
            let totalAmount = 0
            let totalPaid = 0
            let totalOverdue = 0
            const passesBooking = (b) => {
              if (searchText) {
                const matchesSearch = b.passengers.some(p =>
                  normalizeText(p.name).includes(normalizeText(searchText)) ||
                  String(p.seatNumber).includes(searchText)
                )
                if (!matchesSearch) return false
              }
              return true
            }
            bookings.forEach((b) => {
              if (!passesBooking(b)) return
              const pf = b.passengers.filter((p) => {
                if (statusFilter === 'overdue') return p.hasOverdue === true
                if (statusFilter === 'in_days') return p.hasOverdue === false
                return true
              })
              totalPassengers += pf.length
              pf.forEach(p => {
                totalAmount += Number(p.totalAmount || 0)
                totalPaid += Number(p.paidAmount || 0)
                totalOverdue += Number(p.overdueAmount || 0)
              })
            })
            const fmt = (n) => (Number(n || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
            const pct = (part, whole) => {
              const w = Number(whole || 0)
              const p = Number(part || 0)
              if (w <= 0) return '0%'
              return `${Math.round((p / w) * 100)}%`
            }
            return (
              <>
                <div className="bg-white/5 rounded-xl p-3 md:p-4 border border-white/10">
                  <p className="text-white/70 text-xs sm:text-sm">Total de Passageiros</p>
                  <p className="text-white text-lg sm:text-xl font-bold">{totalPassengers}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 md:p-4 border border-white/10">
                  <p className="text-white/70 text-xs sm:text-sm">Valor Total</p>
                  <p className="text-white text-lg sm:text-xl font-bold">{fmt(totalAmount)}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 md:p-4 border border-white/10">
                  <p className="text-white/70 text-xs sm:text-sm">Valor Total Pago</p>
                  <div className="flex items-baseline justify-between">
                    <p className="text-white text-lg sm:text-xl font-bold">{fmt(totalPaid)}</p>
                    <p className="text-white/80 text-sm sm:text-base font-semibold">{pct(totalPaid, totalAmount)}</p>
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl p-3 md:p-4 border border-white/10">
                  <p className="text-white/70 text-xs sm:text-sm">Valor Inadimplente</p>
                  <div className="flex items-baseline justify-between">
                    <p className="text-white text-lg sm:text-xl font-bold">{fmt(totalOverdue)}</p>
                    <p className="text-white/80 text-sm sm:text-base font-semibold">{pct(totalOverdue, totalAmount)}</p>
                  </div>
                </div>
              </>
            )
          })()
        }
      </div>

      {bookings.length === 0 ? (
        <div className="bg-white/5 rounded-xl p-6 md:p-12 text-center">
          <p className="text-white/70 text-sm sm:text-base">Nenhuma reserva encontrada.</p>
        </div>
      ) : (
        <div className="space-y-3 md:space-y-4">
          {bookings
            .filter(b => {
              if (searchText) {
                const matchesSearch = b.passengers.some(p =>
                  normalizeText(p.name).includes(normalizeText(searchText)) ||
                  String(p.seatNumber).includes(searchText)
                )
                if (!matchesSearch) return false
              }
              return true
            })
            .map((booking, index) => {
              const passengersFiltered = booking.passengers.filter((p) => {
                if (statusFilter === 'overdue') return p.hasOverdue === true
                if (statusFilter === 'in_days') return p.hasOverdue === false
                return true
              })
              if (passengersFiltered.length === 0) return null
              return (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-2xl"
                >
                  <div className="flex flex-col gap-3 md:gap-4">
                    <div className="space-y-2 md:space-y-3">
                      {passengersFiltered.map((p, idx) => (
                        <div key={idx} className="flex flex-col gap-3 bg-white/5 rounded-xl p-3 md:p-4 border border-white/10">
                          <div className="flex items-center gap-3 w-full">
                            <div className="flex flex-col items-center text-center w-full">
                              <p className="font-semibold text-sm sm:text-base text-white mb-2 sm:mb-2.5">{p.name}</p>
                              <div className={`mb-2 sm:mb-2.5 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold ${p.hasOverdue ? 'bg-red-500/80 text-white border border-red-600' : 'bg-green-500/80 text-white border border-green-600'}`}>
                                {p.hasOverdue ? 'Inadimplente' : 'Em dias'}
                              </div>
                              <p className="text-white/80 text-xs sm:text-sm mb-2 sm:mb-3">
                                {getExcursionName(booking.excursionId)} • Assento {p.seatNumber} • {formatDate(booking.date)}
                              </p>
                              <div className="mt-2.5 sm:mt-3 w-full">
                                <div className="relative w-full bg-gray-600/50 rounded-full h-3 sm:h-4 overflow-hidden">
                                  <div
                                    className="bg-[#ECAE62] h-full"
                                    style={{ width: `${Math.max(0, Math.min(100, Number(p.progressPercent || 0)))}%` }}
                                  />
                                  <span className="absolute inset-0 flex items-center justify-center text-white text-[10px] sm:text-xs font-semibold">
                                    {Math.round(Number(p.progressPercent || 0))}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-row justify-center gap-2 w-full">
                            {!p.hasPlan && (
                              <Button
                                onClick={() => handleOpenPlan(booking, p)}
                                size="sm"
                                className="bg-[#ECAE62] hover:bg-[#8C641C] text-[#0B1420] sm:px-6"
                              >
                                <BadgeDollarSign className="h-4 w-4 mr-2" />
                                Inserir Pagamento
                              </Button>
                            )}
                            {p.hasPlan && (
                              <Button
                                onClick={() => handleOpenViewPlan(booking, p)}
                                size="sm"
                                className="bg-transparent border border-white/30 text-white hover:bg-white/10 sm:px-6"
                              >
                                Ver Plano
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )
            })}
        </div>
      )}

      <Dialog open={!!openPlanFor} onOpenChange={() => setOpenPlanFor(null)}>
        <DialogContent className="bg-[#0F172A] border-white/20 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Criar Plano de Pagamento</DialogTitle>
            <DialogDescription className="text-white/80 text-sm">
              Defina entrada, parcelas, quantidade e a data do primeiro pagamento.
            </DialogDescription>
            {openPlanFor && (
              <div className="mt-2">
                <span className="inline-block text-xs sm:text-sm text-[#0B1420] bg-[#ECAE62] rounded-full px-3 py-1 font-semibold border border-[#8C641C]">
                  Total da excursão: R$ {getExcursionPrice(openPlanFor.booking.excursionId).toFixed(2)}
                </span>
              </div>
            )}
          </DialogHeader>
          {openPlanFor && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-white/80 mb-1">Valor da entrada (R$)</label>
                <Input
                  value={entrada}
                  onChange={(e) => setEntrada(e.target.value)}
                  placeholder="Ex.: 25,00"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-white/80 mb-1">Valor da parcela (R$)</label>
                <Input
                  value={valorParcela}
                  onChange={(e) => setValorParcela(e.target.value)}
                  placeholder="Ex.: 100,00"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-white/80 mb-1">Quantidade de parcelas</label>
                <Input
                  value={qtdParcelas}
                  onChange={(e) => setQtdParcelas(e.target.value)}
                  placeholder="Ex.: 3"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-white/80 mb-1">Data do primeiro pagamento</label>
                <Input
                  type="date"
                  value={primeiroPagamento}
                  onChange={(e) => setPrimeiroPagamento(e.target.value)}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              {tablesMissing && (
                <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 p-3 rounded-lg">
                  <AlertTriangle className="h-4 w-4 mt-0.5" />
                  <p className="text-sm">
                    Tabelas de financeiro não existem no banco. Aplique o arquivo SQL em supabase/migrations/finance.sql e tente novamente.
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="mt-2">
            <Button
              onClick={handleCreatePlan}
              disabled={loading}
              className="bg-[#ECAE62] hover:bg-[#8C641C] text-[#0B1420]"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {loading ? 'Salvando...' : 'Salvar Plano'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!openViewPlan} onOpenChange={() => setOpenViewPlan(null)}>
        <DialogContent className="bg-[#0F172A] border-white/20 text-white w-full max-w-md sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Plano de Pagamento</DialogTitle>
            <DialogDescription className="text-white/80 text-sm">
              Visualize e atualize o status das parcelas.
            </DialogDescription>
          </DialogHeader>
          {currentPlan ? (
            <div className="space-y-3 flex-1">
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <p className="text-sm">
                  Entrada: <span className="font-semibold">R$ {Number(currentPlan.entrada_valor || 0).toFixed(2)}</span> •
                  Parcela: <span className="font-semibold">R$ {Number(currentPlan.parcela_valor || 0).toFixed(2)}</span> •
                  Quantidade: <span className="font-semibold">{currentPlan.parcelas_total}</span> •
                  Primeiro pagamento: <span className="font-semibold">{formatDate(currentPlan.primeiro_pagamento_data)}</span>
                </p>
              </div>
              <div className="space-y-2 max-h-[330px] overflow-y-auto sm:max-h-none sm:overflow-visible pr-1">
                {currentInstallments.length === 0 ? (
                  <p className="text-white/70 text-sm">Nenhuma parcela encontrada.</p>
                ) : (
                  currentInstallments.map((inst) => (
                    <div key={inst.id} className="flex items-center justify-between bg-white/5 rounded-lg p-3 border border-white/10 min-h-[96px]">
                      <div className="text-sm">
                        <p className="font-semibold text-white">Parcela #{inst.numero}</p>
                        <p className="text-white/80">Vencimento: {formatDate(inst.vencimento)}</p>
                        <p className="text-[#ECAE62]">Valor: R$ {Number(inst.valor).toFixed(2)}</p>
                        <p className={`text-xs mt-1 ${inst.status === 'pago' ? 'text-green-400' : inst.status === 'atrasado' ? 'text-red-400' : 'text-white/70'}`}>
                          Status: {String(inst.status).toUpperCase()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {inst.status !== 'pago' && (
                          <Button
                            onClick={() => openPayMethod(inst)}
                            size="sm"
                            className="bg-green-500 hover:bg-green-600 text-white"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Marcar Pago
                          </Button>
                        )}
                        {inst.status === 'pago' && (
                          <Button
                            onClick={() => markInstallmentPending(inst)}
                            size="sm"
                            className="bg-white text-[#0B1420] border border-white/20 hover:bg-white/90"
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            <span className="sm:hidden">Reverter</span>
                            <span className="hidden sm:inline">Reverter para Pendente</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-white/70">Carregando plano...</p>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={payMethodOpen} onOpenChange={setPayMethodOpen}>
        <DialogContent className="bg-[#0F172A] border-white/20 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Forma de Pagamento</DialogTitle>
            <DialogDescription className="text-white/80 text-sm">
              Selecione como o pagamento foi realizado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={payMethod} onValueChange={setPayMethod}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Escolha uma opção" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">Pix</SelectItem>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                <SelectItem value="cartao">Cartão</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="mt-2 flex flex-row gap-2 sm:gap-2">
            <Button onClick={() => setPayMethodOpen(false)} className="flex-1 bg-transparent border border-white/30 text-white hover:bg-white/10">
              Cancelar
            </Button>
            <Button onClick={confirmPayMethod} disabled={payMethodSaving} className="flex-1 bg-green-500 hover:bg-green-600 text-white">
              {payMethodSaving ? 'Salvando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default FinanceManagement
