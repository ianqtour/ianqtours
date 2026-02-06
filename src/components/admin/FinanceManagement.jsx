import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Calendar, MapPin, Users, Armchair, BadgeDollarSign, CheckCircle, AlertTriangle, RotateCcw, Pencil, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
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
  const [buses, setBuses] = useState([])
  const [selectedBusId, setSelectedBusId] = useState(null)
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 12
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

  const getStatusFromDate = (dateStr, currentStatus) => {
    if (currentStatus === 'pago') return 'pago'
    if (!dateStr) return 'pendente'
    // Usa o fuso de São Paulo para consistência com o cron job do banco
    const today = new Date(new Date().toLocaleDateString('en-US', { timeZone: 'America/Sao_Paulo' }))
    const [y, m, d] = dateStr.split('-').map(Number)
    const dueDate = new Date(y, m - 1, d)
    return dueDate < today ? 'atrasado' : 'pendente'
  }

  useEffect(() => {
    loadExcursions()
  }, [])

  useEffect(() => {
    loadBuses()
  }, [selectedExcursionId])

  useEffect(() => {
    loadBookings()
  }, [selectedExcursionId, selectedBusId])

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedExcursionId, selectedBusId, statusFilter, searchText])

  const goToPage = (page) => {
    setCurrentPage(page)
  }

  const loadExcursions = async () => {
    const { data: exData } = await supabase.from('excursoes').select('id, nome, preco')
    setExcursions((exData || []).map(e => ({ id: e.id, name: e.nome, price: Number(e.preco || 0) })))
  }

  const loadBuses = async () => {
    if (!selectedExcursionId) {
      setBuses([])
      setSelectedBusId(null)
      return
    }
    const { data: busData } = await supabase
      .from('onibus')
      .select('id, identificacao')
      .eq('excursao_id', selectedExcursionId)
    setBuses(busData || [])
  }

  const loadBookings = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('reservas')
        .select(`
          id, excursao_id, onibus_id, status, criado_em,
          passageiros_reserva (
            id, numero_assento, passageiro_id, presente,
            passageiros (id, nome, telefone)
          )
        `)
        .neq('status', 'cancelada')
        .order('criado_em', { ascending: false })
        .limit(200)

      if (selectedExcursionId) {
        query = query.eq('excursao_id', selectedExcursionId)
      }

      if (selectedBusId) {
        query = query.eq('onibus_id', selectedBusId)
      }

      const { data: resData, error: resError } = await query
      if (resError) throw resError

      const reservationIds = (resData || []).map(r => r.id)
      const passengerIds = (resData || []).flatMap(res => (res.passageiros_reserva || []).map(p => p.passageiro_id))
      
      const plansMap = new Map()
      if (reservationIds.length > 0) {
        let plansQuery = supabase
          .from('finance_payment_plans')
          .select(`
            *,
            finance_installments (*)
          `)

        if (selectedExcursionId) {
          // Se tiver excursão selecionada, busca todos os planos dela para esses passageiros
          // Isso resolve casos onde o passageiro foi movido de reserva/ônibus
          plansQuery = plansQuery
            .eq('excursao_id', selectedExcursionId)
            .in('passageiro_id', passengerIds)
        } else {
          // Fallback para busca por reserva
          plansQuery = plansQuery.in('reserva_id', reservationIds)
        }

        const { data: allPlans, error: plansError } = await plansQuery
        
        if (plansError) throw plansError

        if (allPlans) {
          allPlans.forEach(plan => {
            // Tenta mapear tanto pela reserva quanto pela combinação excursão+passageiro
            const keyByRes = `${plan.reserva_id}:${plan.passageiro_id}`
            const keyByExc = `${plan.excursao_id}:${plan.passageiro_id}`
            
            const planData = {
              id: plan.id,
              hasPlan: true,
              pct: 0, // calculado abaixo
              hasOverdue: false,
              totalAmount: 0,
              paidAmount: 0,
              overdueAmount: 0
            }

            const insts = plan.finance_installments || []
            planData.totalAmount = insts.reduce((acc, i) => acc + Number(i.valor || 0), 0)
            planData.paidAmount = insts.filter(i => String(i.status) === 'pago').reduce((acc, i) => acc + Number(i.valor || 0), 0)
            planData.overdueAmount = insts.filter(i => String(i.status) === 'atrasado').reduce((acc, i) => acc + Number(i.valor || 0), 0)
            planData.hasOverdue = insts.some(i => String(i.status) === 'atrasado')
            planData.pct = planData.totalAmount > 0 ? Math.round((planData.paidAmount / planData.totalAmount) * 100) : 0
            
            plansMap.set(keyByRes, planData)
            plansMap.set(keyByExc, planData)
          })
        }
      }

      const bookingsList = (resData || []).map(res => {
        const passengers = (res.passageiros_reserva || []).map(paxRes => {
          const paxArr = paxRes.passageiros
          const ref = Array.isArray(paxArr) ? paxArr[0] : (paxArr || {})
          
          const keyByRes = `${res.id}:${paxRes.passageiro_id}`
          const keyByExc = `${res.excursao_id}:${paxRes.passageiro_id}`
          
          const plan = plansMap.get(keyByRes) || plansMap.get(keyByExc) || {
            hasPlan: false,
            pct: 0,
            hasOverdue: false,
            totalAmount: 0,
            paidAmount: 0,
            overdueAmount: 0
          }

          return {
            id: paxRes.id,
            seatNumber: Number(paxRes.numero_assento),
            name: (ref.nome || '').toUpperCase(),
            phone: ref.telefone || '',
            passageiroId: String(paxRes.passageiro_id),
            hasPlan: plan.hasPlan,
            progressPercent: plan.pct,
            hasOverdue: plan.hasOverdue,
            totalAmount: plan.totalAmount,
            paidAmount: plan.paidAmount,
            overdueAmount: plan.overdueAmount
          }
        }).sort((a, b) => a.seatNumber - b.seatNumber)

        return {
          id: res.id,
          excursionId: res.excursao_id,
          busId: res.onibus_id,
          passengers,
          seats: passengers.map(p => p.seatNumber),
          date: res.criado_em,
          status: res.status,
        }
      })

      setBookings(bookingsList)
    } catch (err) {
      console.error('Erro ao carregar dados financeiros:', err)
      if (err.message && err.message.includes('relation')) {
        setTablesMissing(true)
      }
      toast({ title: 'Erro ao carregar dados', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
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
      // Tenta buscar por reserva_id primeiro
      let { data: plan, error: planErr } = await supabase
        .from('finance_payment_plans')
        .select('*')
        .eq('reserva_id', booking.id)
        .eq('passageiro_id', passenger.passageiroId)
        .maybeSingle()
      
      if (planErr) {
        if ((planErr.message || '').includes('relation')) setTablesMissing(true)
        throw planErr
      }

      // Se não encontrou, tenta buscar por excursao_id + passageiro_id (caso tenha sido movido)
      if (!plan) {
        const { data: altPlan, error: altErr } = await supabase
          .from('finance_payment_plans')
          .select('*')
          .eq('excursao_id', booking.excursionId)
          .eq('passageiro_id', passenger.passageiroId)
          .maybeSingle()
        
        if (altErr) throw altErr
        plan = altPlan
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
      if (openViewPlan && currentPlan) {
        const booking = openViewPlan.booking
        const passenger = openViewPlan.passenger
        const busLabel = await getBusLabelById(booking.busId)
        const pendentes = updated
          .filter(i => String(i.status) !== 'pago')
          .map(i => ({
            numero: i.numero,
            valor: Number(i.valor || 0),
            vencimento: i.vencimento,
            status: String(i.status),
          }))
        const body = {
          nome: passenger.name,
          telefone: passenger.phone,
          excursao: getExcursionName(booking.excursionId),
          data: booking.date,
          onibus: busLabel,
          assento: Number(passenger.seatNumber),
          parcela_numero: inst.numero,
          parcela_valor: Number(inst.valor || 0),
          parcela_vencimento: inst.vencimento,
          parcelas_pendentes: pendentes,
        }
        try {
          await fetch(PAYMENT_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        } catch (e) {
          toast({ title: 'Aviso: falha ao notificar webhook', description: 'Pagamento marcado, mas notificação externa falhou.', variant: 'default' })
        }
      }
      toast({ title: 'Parcela paga', description: `Parcela #${inst.numero} marcada como paga.` })
    } catch (err) {
      toast({ title: 'Erro ao marcar como paga', description: err.message || 'Falha inesperada', variant: 'destructive' })
    }
  }

  const markInstallmentPending = async (inst) => {
    try {
      const newStatus = getStatusFromDate(inst.vencimento)
      const { error } = await supabase
        .from('finance_installments')
        .update({ status: newStatus, pago_em: null })
        .eq('id', inst.id)
      if (error) throw error
      const updated = currentInstallments.map(i => i.id === inst.id ? { ...i, status: newStatus, pago_em: null } : i)
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

  const [editingInstallment, setEditingInstallment] = useState(null)
  const [editDate, setEditDate] = useState('')
  const [editValue, setEditValue] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  const [isAddingInstallment, setIsAddingInstallment] = useState(false)
  const [newInstValue, setNewInstValue] = useState('')
  const [newInstDate, setNewInstDate] = useState('')
  const [isSavingNewInst, setIsSavingNewInst] = useState(false)

  const handleOpenEdit = (inst) => {
    setEditingInstallment(inst)
    setEditDate(inst.vencimento)
    setEditValue(inst.valor)
  }

  const handleSaveEdit = async () => {
    if (!editingInstallment) return
    setIsSavingEdit(true)
    try {
      const val = Number(editValue)
      const newStatus = getStatusFromDate(editDate, editingInstallment.status)
      
      const { error } = await supabase
        .from('finance_installments')
        .update({ vencimento: editDate, valor: val, status: newStatus })
        .eq('id', editingInstallment.id)

      if (error) throw error

      const updated = currentInstallments.map(i => i.id === editingInstallment.id ? { ...i, vencimento: editDate, valor: val, status: newStatus } : i)
      setCurrentInstallments(updated)

      // Update booking stats
      const total = updated.reduce((acc, i) => acc + Number(i.valor || 0), 0)
      const paid = updated.filter(i => String(i.status) === 'pago').reduce((acc, i) => acc + Number(i.valor || 0), 0)
      const overdue = updated.filter(i => String(i.status) === 'atrasado').reduce((acc, i) => acc + Number(i.valor || 0), 0)
      const pct = total > 0 ? Math.round((paid / total) * 100) : 0
      const hasOverdue = updated.some(i => String(i.status) === 'atrasado')

      if (openViewPlan && currentPlan) {
        const bid = openViewPlan.booking.id
        const pid = openViewPlan.passenger.passageiroId
        setBookings(prev => prev.map(b => {
          if (b.id !== bid) return b
          return {
            ...b,
            passengers: b.passengers.map(p => p.passageiroId === String(pid) ? {
              ...p,
              progressPercent: pct,
              hasOverdue,
              totalAmount: total,
              paidAmount: paid,
              overdueAmount: overdue
            } : p)
          }
        }))
      }

      toast({ title: 'Sucesso', description: 'Parcela atualizada.' })
      setEditingInstallment(null)
    } catch (err) {
      toast({ title: 'Erro', description: err.message || 'Falha ao atualizar.', variant: 'destructive' })
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleAddInstallment = async () => {
    if (!currentPlan) return
    if (!newInstValue || !newInstDate) {
      toast({ title: 'Campos obrigatórios', description: 'Informe o valor e a data de vencimento.', variant: 'destructive' })
      return
    }

    setIsSavingNewInst(true)
    try {
      const val = Number(newInstValue.toString().replace(',', '.'))
      if (isNaN(val) || val <= 0) {
        throw new Error('Valor inválido')
      }

      // Converter DD/MM/YYYY para YYYY-MM-DD
      const dateParts = newInstDate.split('/')
      if (dateParts.length !== 3) {
        throw new Error('Data inválida. Use o formato DD/MM/AAAA')
      }
      const isoDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`
      const status = getStatusFromDate(isoDate)

      // Determinar o próximo número
      const maxNumero = currentInstallments.reduce((max, i) => Math.max(max, i.numero), 0)
      const nextNumero = maxNumero + 1

      // 1. Inserir a nova parcela
      const { data: newInst, error: instError } = await supabase
        .from('finance_installments')
        .insert({
          plano_id: currentPlan.id,
          numero: nextNumero,
          vencimento: isoDate,
          valor: val,
          status: status
        })
        .select()
        .single()

      if (instError) throw instError

      // 2. Atualizar o plano (parcelas_total e parcela_valor)
      // O parcelas_total é a quantidade de parcelas regulares (numero > 0)
      const newTotalCount = currentInstallments.filter(i => i.numero > 0).length + 1
      const { error: planUpdateError } = await supabase
        .from('finance_payment_plans')
        .update({
          parcelas_total: newTotalCount,
          parcela_valor: val
        })
        .eq('id', currentPlan.id)

      if (planUpdateError) throw planUpdateError

      // 3. Atualizar estados locais
      const updatedInsts = [...currentInstallments, newInst].sort((a, b) => a.numero - b.numero)
      setCurrentInstallments(updatedInsts)
      setCurrentPlan(prev => ({ ...prev, parcelas_total: newTotalCount, parcela_valor: val }))

      // 4. Atualizar estatísticas das reservas
      const total = updatedInsts.reduce((acc, i) => acc + Number(i.valor || 0), 0)
      const paid = updatedInsts.filter(i => String(i.status) === 'pago').reduce((acc, i) => acc + Number(i.valor || 0), 0)
      const overdue = updatedInsts.filter(i => String(i.status) === 'atrasado').reduce((acc, i) => acc + Number(i.valor || 0), 0)
      const pct = total > 0 ? Math.round((paid / total) * 100) : 0
      const hasOverdue = updatedInsts.some(i => String(i.status) === 'atrasado')

      if (openViewPlan) {
        const bid = openViewPlan.booking.id
        const pid = openViewPlan.passenger.passageiroId
        setBookings(prev => prev.map(b => {
          if (b.id !== bid) return b
          return {
            ...b,
            passengers: b.passengers.map(p => p.passageiroId === String(pid) ? {
              ...p,
              progressPercent: pct,
              hasOverdue,
              totalAmount: total,
              paidAmount: paid,
              overdueAmount: overdue
            } : p)
          }
        }))
      }

      toast({ title: 'Sucesso', description: `Parcela #${nextNumero} adicionada.` })
      setIsAddingInstallment(false)
      setNewInstValue('')
      setNewInstDate('')
    } catch (err) {
      toast({ title: 'Erro', description: err.message || 'Falha ao adicionar parcela.', variant: 'destructive' })
    } finally {
      setIsSavingNewInst(false)
    }
  }

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
          status: getStatusFromDate(todayStr),
        })
      }
      for (let i = 1; i <= parcelasTot; i++) {
        const due = i === 1 ? primeiroPagamento : monthAddSameDay(primeiroPagamento, i - 1)
        rows.push({
          plano_id: plan.id,
          numero: i,
          vencimento: due,
          valor: parcelaNum,
          status: getStatusFromDate(due),
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

  const getBusLabelById = async (busId) => {
    if (!busId) return ''
    try {
      const { data } = await supabase
        .from('onibus')
        .select('nome, identificacao, tipo')
        .eq('id', busId)
        .maybeSingle()
      if (!data) return String(busId)
      return data.identificacao || data.tipo || data.nome || String(busId)
    } catch {
      return String(busId)
    }
  }

  const PAYMENT_WEBHOOK_URL = 'https://n8n-n8n.j6kpgx.easypanel.host/webhook/pagamento'

  const allFilteredPassengers = bookings.flatMap(booking => {
    if (searchText) {
      const matchesSearch = booking.passengers.some(p =>
        normalizeText(p.name).includes(normalizeText(searchText)) ||
        String(p.seatNumber).includes(searchText)
      )
      if (!matchesSearch) return []
    }

    return booking.passengers
      .filter(p => {
        if (statusFilter === 'has_plan') return p.hasPlan === true
        if (statusFilter === 'no_plan') return p.hasPlan === false
        if (statusFilter === 'overdue') return p.hasOverdue === true
        if (statusFilter === 'in_days') return p.hasOverdue === false
        return true
      })
      .map(p => ({ ...p, booking }))
  })

  const totalPages = Math.ceil(allFilteredPassengers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedPassengers = allFilteredPassengers.slice(startIndex, startIndex + itemsPerPage)

  return (
    <div className="space-y-3 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h2 className="text-xl sm:text-2xl font-bold text-white">Financeiro</h2>
        <div className="text-sm sm:text-base text-white/70">Gerencie planos e parcelas</div>
      </div>

      <div className="bg-white/5 rounded-xl p-3 md:p-4 border border-white/10">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 md:gap-4">
          <div>
            <Select value={selectedExcursionId || ''} onValueChange={(v) => {
              setSelectedExcursionId(v)
              setSelectedBusId(null)
            }}>
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
            <Select value={selectedBusId || 'all'} onValueChange={(v) => setSelectedBusId(v === 'all' ? null : v)}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Filtrar por ônibus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os ônibus</SelectItem>
                {buses.map(b => (
                  <SelectItem key={b.id} value={String(b.id)}>{b.identificacao || `Ônibus ${b.id}`}</SelectItem>
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
                <SelectItem value="has_plan">Com plano</SelectItem>
                <SelectItem value="no_plan">Sem plano</SelectItem>
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
            let totalAmount = 0
            let totalPaid = 0
            let totalOverdue = 0
            
            allFilteredPassengers.forEach(p => {
              totalAmount += Number(p.totalAmount || 0)
              totalPaid += Number(p.paidAmount || 0)
              totalOverdue += Number(p.overdueAmount || 0)
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
                  <p className="text-white text-lg sm:text-xl font-bold">{allFilteredPassengers.length}</p>
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

      {allFilteredPassengers.length === 0 ? (
        <div className="bg-white/5 rounded-xl p-6 md:p-12 text-center">
          <p className="text-white/70 text-sm sm:text-base">Nenhuma reserva encontrada.</p>
        </div>
      ) : (
        <div className="space-y-3 md:space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedPassengers.map((p, index) => (
              <motion.div
                key={`${p.booking.id}-${p.passageiroId}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white/5 rounded-xl p-3 md:p-4 border border-white/10 flex flex-col gap-3"
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="flex flex-col items-center text-center w-full">
                    <p className="font-semibold text-sm sm:text-base text-white mb-2 sm:mb-2.5 truncate w-full px-2">
                      {p.name}
                    </p>
                    <div className={`mb-2 sm:mb-2.5 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold ${p.hasOverdue ? 'bg-red-500/80 text-white border border-red-600' : 'bg-green-500/80 text-white border border-green-600'}`}>
                      {p.hasOverdue ? 'Inadimplente' : 'Em dias'}
                    </div>
                    <p className="text-white/80 text-[11px] sm:text-xs mb-2 sm:mb-3">
                      {getExcursionName(p.booking.excursionId)} • Assento {p.seatNumber} • {formatDate(p.booking.date)}
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
                <div className="flex flex-row justify-center gap-2 w-full pt-2 border-t border-white/10">
                  {!p.hasPlan && (
                    <Button
                      onClick={() => handleOpenPlan(p.booking, p)}
                      size="sm"
                      className="bg-[#ECAE62] hover:bg-[#8C641C] text-[#0B1420] flex-1"
                    >
                      <BadgeDollarSign className="h-4 w-4 mr-2" />
                      Inserir Pagamento
                    </Button>
                  )}
                  {p.hasPlan && (
                    <Button
                      onClick={() => handleOpenViewPlan(p.booking, p)}
                      size="sm"
                      className="bg-transparent border border-white/30 text-white hover:bg-white/10 flex-1"
                    >
                      Ver Plano
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

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
        </div>
      )}

      <Dialog open={!!openPlanFor} onOpenChange={() => setOpenPlanFor(null)}>
        <DialogContent className="bg-[#0F172A] border-white/20 text-white max-w-lg [&>button:last-child]:hidden">
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
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={entrada}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^\d.,-]/g, '')
                    setEntrada(v)
                  }}
                  placeholder="Ex.: 25,00"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-white/80 mb-1">Valor da parcela (R$)</label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={valorParcela}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^\d.,-]/g, '')
                    setValorParcela(v)
                  }}
                  placeholder="Ex.: 100,00"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-white/80 mb-1">Quantidade de parcelas</label>
                <Input
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min="1"
                  value={qtdParcelas}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^\d]/g, '')
                    setQtdParcelas(v)
                  }}
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

      <Dialog open={!!openViewPlan} onOpenChange={() => {
        setOpenViewPlan(null)
        setIsAddingInstallment(false)
        setNewInstValue('')
        setNewInstDate('')
      }}>
        <DialogContent className="bg-[#0F172A] border-white/20 text-white w-full max-w-md sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden p-0 [&>button:last-child]:hidden">
          <DialogHeader className="p-6 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg sm:text-xl">Plano de Pagamento</DialogTitle>
                <DialogDescription className="text-white/80 text-sm">
                  Visualize e atualize o status das parcelas.
                </DialogDescription>
              </div>
              <Button
                  onClick={() => {
                    if (!isAddingInstallment) {
                      setNewInstDate('')
                      setNewInstValue('')
                    }
                    setIsAddingInstallment(!isAddingInstallment)
                  }}
                 size="sm"
                 className="bg-[#ECAE62] hover:bg-[#8C641C] text-[#0B1420]"
               >
                {isAddingInstallment ? <RotateCcw className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                {isAddingInstallment ? 'Cancelar' : 'Adicionar Parcela'}
              </Button>
            </div>
          </DialogHeader>
          
          {currentPlan ? (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-6 pb-6">
              <div className="bg-white/5 rounded-xl p-3 border border-white/10 mb-4">
                <p className="text-sm text-white/90 leading-relaxed">
                  Entrada: <span className="font-bold text-white">R$ {Number(currentPlan.entrada_valor || 0).toFixed(2)}</span> •
                  Parcela: <span className="font-bold text-white">R$ {Number(currentPlan.parcela_valor || 0).toFixed(2)}</span> •
                  Quantidade: <span className="font-bold text-white">{currentPlan.parcelas_total}</span> •
                  Primeiro pagamento: <span className="font-bold text-white">{formatDate(currentPlan.primeiro_pagamento_data)}</span>
                </p>
              </div>

              {isAddingInstallment && (
                <div className="bg-white/10 rounded-xl p-4 border border-[#ECAE62]/30 mb-4 space-y-3">
                  <h4 className="text-sm font-bold text-[#ECAE62]">Nova Parcela</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Vencimento</Label>
                      <Input
                        type="text"
                        placeholder="DD/MM/AAAA"
                        value={newInstDate}
                        onChange={e => {
                          let v = e.target.value.replace(/\D/g, '')
                          if (v.length > 8) v = v.slice(0, 8)
                          if (v.length > 4) v = v.slice(0, 2) + '/' + v.slice(2, 4) + '/' + v.slice(4)
                          else if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2)
                          setNewInstDate(v)
                        }}
                        className="bg-white/5 border-white/20 text-white h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Valor (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={newInstValue}
                        onChange={e => setNewInstValue(e.target.value)}
                        placeholder="0,00"
                        className="bg-white/5 border-white/20 text-white h-8 text-sm"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleAddInstallment}
                    disabled={isSavingNewInst}
                    size="sm"
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isSavingNewInst ? 'Salvando...' : 'Confirmar Nova Parcela'}
                  </Button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                {currentInstallments.length === 0 ? (
                  <p className="text-white/70 text-sm text-center py-8">Nenhuma parcela encontrada.</p>
                ) : (
                  currentInstallments.map((inst) => (
                    <div
                      key={inst.id}
                      className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-200"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-base">Parcela #{inst.numero}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              inst.status === 'pago' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 
                              inst.status === 'atrasado' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
                              'bg-white/10 text-white/70 border border-white/20'
                            }`}>
                              {String(inst.status).toUpperCase()}
                            </span>
                          </div>
                          <div className="text-sm space-y-0.5">
                            <p className="text-white/60">Vencimento: <span className="text-white/90 font-medium">{formatDate(inst.vencimento)}</span></p>
                            <p className="text-[#ECAE62] font-semibold">Valor: R$ {Number(inst.valor).toFixed(2)}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-white/5">
                          <Button
                            onClick={() => handleOpenEdit(inst)}
                            size="icon"
                            variant="ghost"
                            className="text-white/50 hover:text-white hover:bg-white/10 h-9 w-9"
                            title="Editar parcela"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          
                          {inst.status !== 'pago' ? (
                            <Button
                              onClick={() => openPayMethod(inst)}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white font-semibold flex-1 sm:flex-none"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Marcar Pago
                            </Button>
                          ) : (
                            <Button
                              onClick={() => markInstallmentPending(inst)}
                              size="sm"
                              className="bg-white text-[#0B1420] hover:bg-white/90 font-semibold flex-1 sm:flex-none"
                            >
                              <RotateCcw className="h-4 w-4 mr-2" />
                              <span className="sm:hidden">Reverter</span>
                              <span className="hidden sm:inline">Reverter Status</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center">
              <p className="text-sm text-white/50 animate-pulse">Carregando plano...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={payMethodOpen} onOpenChange={setPayMethodOpen}>
        <DialogContent className="bg-[#0F172A] border-white/20 text-white max-w-sm [&>button:last-child]:hidden">
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

      <Dialog open={!!editingInstallment} onOpenChange={(open) => !open && setEditingInstallment(null)}>
        <DialogContent className="bg-[#0F172A] border-white/20 text-white max-w-sm [&>button:last-child]:hidden">
          <DialogHeader>
            <DialogTitle>Editar Parcela #{editingInstallment?.numero}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Data de Vencimento</Label>
              <Input
                type="date"
                value={editDate}
                onChange={e => setEditDate(e.target.value)}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingInstallment(null)} className="text-white hover:bg-white/10">Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={isSavingEdit} className="bg-[#ECAE62] hover:bg-[#8C641C] text-[#0B1420]">
              {isSavingEdit ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default FinanceManagement
