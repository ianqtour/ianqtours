import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { 
  TrendingUp, Users, AlertCircle, DollarSign, Star, 
  ArrowUpRight, ArrowDownRight, Calendar, Filter,
  Search, ChevronDown, Download, MoreHorizontal, ArrowLeft,
  PieChart as PieChartIcon, BarChart3, LineChart as LineChartIcon
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, ComposedChart
} from 'recharts';
import { 
  format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, isSameMonth,
  eachDayOfInterval, eachWeekOfInterval, addDays, addWeeks, isSameDay, isSameWeek, startOfDay, startOfWeek
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import * as XLSX from 'xlsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';

const COLORS = ['#25D366', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalExcursions: 0,
    totalPassengers: 0,
    totalOverdueClients: 0,
    totalOverdueAmount: 0,
    npsScore: 0,
    npsDistribution: { promoters: 0, neutrals: 0, detractors: 0 }
  });

  const [chartsData, setChartsData] = useState({
    cashProjection: [],
    monthlyComparison: [],
    installmentsStatus: [],
    overdueByMonth: [],
    paymentMethods: []
  });

  const [tableData, setTableData] = useState([]);
  const [filteredTableData, setFilteredTableData] = useState([]);
  const [searchTerm, setSearchSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [excursionFilter, setExcursionFilter] = useState('all');
  const [projectionInterval, setProjectionInterval] = useState('monthly'); // 'daily', 'weekly', 'monthly'
  const [allInstallments, setAllInstallments] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    updateProjectionData(allInstallments, projectionInterval);
  }, [projectionInterval, allInstallments]);

  useEffect(() => {
    let filtered = tableData;
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.passengerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.excursionName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }
    if (excursionFilter !== 'all') {
      filtered = filtered.filter(item => item.excursionName === excursionFilter);
    }
    setFilteredTableData(filtered);
    setCurrentPage(1);
  }, [searchTerm, statusFilter, excursionFilter, tableData]);

  const uniqueExcursions = Array.from(new Set(allInstallments.map(i => i.excursao_nome))).filter(Boolean).sort();

  const updateProjectionData = (installments, interval) => {
    const now = new Date();
    let projectionData = [];

    if (interval === 'daily') {
      const next14Days = eachDayOfInterval({
        start: now,
        end: addDays(now, 13)
      });
      projectionData = next14Days.map(day => {
        const dayStr = format(day, 'dd/MM', { locale: ptBR });
        const amount = installments
          .filter(i => isSameDay(parseISO(i.vencimento), day) && i.status !== 'pago')
          .reduce((acc, i) => acc + Number(i.valor), 0);
        return { name: dayStr, valor: amount };
      });
    } else if (interval === 'weekly') {
      const next12Weeks = eachWeekOfInterval({
        start: now,
        end: addWeeks(now, 11)
      });
      projectionData = next12Weeks.map(week => {
        const weekStr = `Sem ${format(week, 'ww', { locale: ptBR })}`;
        const amount = installments
          .filter(i => isSameWeek(parseISO(i.vencimento), week) && i.status !== 'pago')
          .reduce((acc, i) => acc + Number(i.valor), 0);
        return { name: weekStr, valor: amount };
      });
    } else {
      const next6Months = eachMonthOfInterval({
        start: now,
        end: subMonths(now, -5)
      });
      projectionData = next6Months.map(month => {
        const monthStr = format(month, 'MMM/yy', { locale: ptBR });
        const amount = installments
          .filter(i => isSameMonth(parseISO(i.vencimento), month) && i.status !== 'pago')
          .reduce((acc, i) => acc + Number(i.valor), 0);
        return { name: monthStr, valor: amount };
      });
    }

    setChartsData(prev => ({ ...prev, cashProjection: projectionData }));
  };

  const exportToExcel = () => {
    if (allInstallments.length === 0) return;

    const dataToExport = allInstallments.map(i => ({
      'Excursão': i.plano?.excursao?.nome || 'N/A',
      'Passageiro': i.plano?.passageiro?.nome || 'N/A',
      'Parcela': i.numero,
      'Valor': i.valor,
      'Vencimento': format(parseISO(i.vencimento), 'dd/MM/yyyy'),
      'Status': i.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório Financeiro');

    // Download file
    XLSX.writeFile(workbook, `Relatorio_IanqTour_${format(new Date(), 'dd_MM_yyyy')}.xlsx`);
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Totals
      const { count: excCount } = await supabase.from('excursoes').select('*', { count: 'exact', head: true });
      const { count: paxCount } = await supabase.from('passageiros').select('*', { count: 'exact', head: true });
      
      // 2. Fetch Installments from View for metrics and charts
      const { data: installments, error: instError } = await supabase
        .from('vw_finance_installments_to_collect')
        .select('*');

      if (instError) throw instError;
      setAllInstallments(installments);

      // 3. Fetch Feedbacks for NPS
      const { data: feedbacks } = await supabase.from('feedbacks').select('rating');

      // Process Metrics
      const now = new Date();
      const overdueInsts = installments.filter(i => i.status === 'atrasado');
      const overdueAmount = overdueInsts.reduce((acc, i) => acc + Number(i.valor), 0);
      const overduePaxIds = new Set(overdueInsts.map(i => i.plano_id));

      // NPS Calculation (mapping 1-5 to standard NPS promoters/detractors)
      let promoters = 0, neutrals = 0, detractors = 0;
      feedbacks?.forEach(f => {
        if (f.rating === 5) promoters++;
        else if (f.rating === 4) neutrals++;
        else detractors++;
      });
      const totalFeedbacks = feedbacks?.length || 0;
      const npsScore = totalFeedbacks > 0 
        ? Math.round(((promoters - detractors) / totalFeedbacks) * 100) 
        : 0;

      setStats({
        totalExcursions: excCount || 0,
        totalPassengers: paxCount || 0,
        totalOverdueClients: overduePaxIds.size,
        totalOverdueAmount: overdueAmount,
        npsScore,
        npsDistribution: { promoters, neutrals, detractors }
      });

      // Process Chart Data
      const last12Months = eachMonthOfInterval({
        start: subMonths(now, 11),
        end: now
      });

      const allMonthlyData = last12Months.map(month => {
        const monthStr = format(month, 'MMM/yy', { locale: ptBR });
        const monthInsts = installments.filter(i => isSameMonth(parseISO(i.vencimento), month));
        
        const received = monthInsts.filter(i => i.status === 'pago').reduce((acc, i) => acc + Number(i.valor), 0);
        const toReceive = monthInsts.filter(i => i.status === 'pendente' || i.status === 'atrasado').reduce((acc, i) => acc + Number(i.valor), 0);
        const overdue = monthInsts.filter(i => i.status === 'atrasado').reduce((acc, i) => acc + Number(i.valor), 0);

        return {
          name: monthStr,
          recebido: received,
          aReceber: toReceive,
          atrasado: overdue,
          total: received + toReceive + overdue
        };
      });

      // Filtra para mostrar apenas meses que possuem algum valor (recebido, a receber ou atrasado)
      const filteredMonthlyData = allMonthlyData.filter(d => d.total > 0);

      // Payment Methods (Counting installments)
      const methods = {};
      installments.filter(i => i.status === 'pago').forEach(i => {
        const m = i.metodo || 'Outros';
        methods[m] = (methods[m] || 0) + 1;
      });
      const paymentMethodsData = Object.entries(methods).map(([name, value]) => ({ name, value }));

      // Status Distribution
      const statusCounts = {
        recebido: installments.filter(i => i.status === 'pago').length,
        aReceber: installments.filter(i => i.status === 'pendente').length,
        atrasado: installments.filter(i => i.status === 'atrasado').length
      };

      setChartsData({
        cashProjection: [], // Will be updated by updateProjectionData
        monthlyComparison: filteredMonthlyData,
        installmentsStatus: [
          { name: 'Recebido', value: statusCounts.recebido },
          { name: 'Pendente', value: statusCounts.aReceber },
          { name: 'Atrasado', value: statusCounts.atrasado }
        ],
        overdueByMonth: filteredMonthlyData.map(d => ({ name: d.name, valor: d.atrasado })),
        paymentMethods: paymentMethodsData
      });

      updateProjectionData(installments, projectionInterval);

      // Process Table Data
      const formattedTable = installments.map(i => ({
        id: i.installment_id,
        excursionName: i.excursao_nome || 'N/A',
        passengerName: i.passageiro_nome || 'N/A',
        installment: i.numero_parcela,
        value: Number(i.valor),
        dueDate: i.vencimento,
        status: i.status
      })).sort((a, b) => parseISO(b.dueDate) - parseISO(a.dueDate));

      setTableData(formattedTable);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#25D366]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 p-4 sm:p-8 font-sans selection:bg-[#25D366]/30">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-[#25D366]/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[35%] h-[35%] bg-blue-500/5 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/admin')}
              className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-95"
            >
              <ArrowLeft size={24} />
            </Button>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">Dashboard <span className="text-[#25D366]">Financeiro</span></h1>
              <p className="text-slate-400 font-medium">Visão geral do seu império de aventuras.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={fetchDashboardData} variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 text-white gap-2 rounded-xl">
              <Calendar size={18} className="text-[#25D366]" />
              Atualizar Dados
            </Button>
            <Button 
              onClick={exportToExcel}
              className="bg-[#25D366] hover:bg-[#1DA851] text-slate-950 font-bold gap-2 rounded-xl shadow-lg shadow-emerald-500/20"
            >
              <Download size={18} />
              Exportar Relatório
            </Button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard title="Excursões" value={stats.totalExcursions} icon={TrendingUp} color="emerald" />
          <MetricCard title="Passageiros" value={stats.totalPassengers} icon={Users} color="blue" />
          <MetricCard title="Inadimplentes" value={stats.totalOverdueClients} icon={AlertCircle} color="red" />
          <MetricCard title="Valor Atrasado" value={fmt(stats.totalOverdueAmount)} icon={DollarSign} color="orange" />
          <MetricCard title="NPS Score" value={stats.npsScore} icon={Star} color="purple" subValue="Excelente" />
        </div>

        {/* Charts Grid - First Row (Main Comparison & Projection) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Main Comparison Chart */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <BarChart3 size={20} className="text-[#25D366]" />
                Recebido X A Receber (Mensal)
              </h3>
              <div className="flex gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#25D366]" /> Recebido
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" /> A Receber
                </div>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartsData.monthlyComparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v/1000}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#fff' }}
                  />
                  <Bar dataKey="recebido" fill="#25D366" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="aReceber" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cash Projection */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <TrendingUp size={20} className="text-[#25D366]" />
                Projeção de Caixa
              </h3>
              <div className="flex bg-white/5 p-1 rounded-xl">
                {[
                  { id: 'daily', label: 'Diário' },
                  { id: 'weekly', label: 'Semanal' },
                  { id: 'monthly', label: 'Mensal' }
                ].map((interval) => (
                  <button
                    key={interval.id}
                    onClick={() => setProjectionInterval(interval.id)}
                    className={cn(
                      "px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                      projectionInterval === interval.id 
                        ? "bg-[#25D366] text-slate-950" 
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    {interval.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartsData.cashProjection}>
                  <defs>
                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#25D366" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#25D366" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v/1000}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="valor" stroke="#25D366" fillOpacity={1} fill="url(#colorVal)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Charts Grid - Second Row (Secondary Metrics) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Payment Type Pie */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
              <PieChartIcon size={20} className="text-[#25D366]" />
              Pagamentos por Tipo (Qtd)
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartsData.paymentMethods}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartsData.paymentMethods.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#fff' }}
                    formatter={(value) => [`${value} parcelas`, 'Quantidade']}
                  />
                  <Legend verticalAlign="bottom" align="center" iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Installments Status Bar */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
              <LineChartIcon size={20} className="text-[#25D366]" />
              Status das Parcelas
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartsData.installmentsStatus} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} width={80} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#fff' }}
                  />
                  <Bar dataKey="value" fill="#25D366" radius={[0, 4, 4, 0]} barSize={30}>
                    {chartsData.installmentsStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.name === 'Atrasado' ? '#ef4444' : entry.name === 'Pendente' ? '#3b82f6' : '#25D366'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* NPS Evolution / Overdue History */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
              <AlertCircle size={20} className="text-red-500" />
              Histórico de Inadimplência
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartsData.overdueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v/1000}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#fff' }}
                  />
                  <Bar dataKey="valor" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-white/5 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Users size={22} className="text-[#25D366]" />
                Relatório de Inadimplência & Parcelas
              </h3>
              <div className="flex items-center gap-3">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#25D366] transition-colors" size={18} />
                  <Input 
                    value={searchTerm}
                    onChange={(e) => setSearchSearchTerm(e.target.value)}
                    placeholder="Buscar passageiro ou excursão..." 
                    className="pl-10 w-full sm:w-[300px] bg-white/5 border-white/10 rounded-xl focus-visible:ring-[#25D366]/20"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {/* Status Filter Capsule Style */}
              <div className="flex bg-white/5 p-1 rounded-xl">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'atrasado', label: 'Atrasados' },
                  { id: 'pendente', label: 'Pendentes' },
                  { id: 'pago', label: 'Pagos' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setStatusFilter(item.id)}
                    className={cn(
                      "px-4 py-1.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all",
                      statusFilter === item.id 
                        ? "bg-[#25D366] text-slate-950" 
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Excursion Dropdown Filter */}
              <Select value={excursionFilter} onValueChange={setExcursionFilter}>
                <SelectTrigger className="w-[200px] bg-white/5 border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-300 focus:ring-[#25D366]/20 transition-all h-9">
                  <div className="flex items-center gap-2">
                    <Filter size={14} className="text-slate-500" />
                    <SelectValue placeholder="Todas as Excursões" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-slate-300">
                  <SelectItem value="all" className="text-[11px] font-bold uppercase tracking-widest focus:bg-[#25D366] focus:text-slate-950">Todas as Excursões</SelectItem>
                  {uniqueExcursions.map(name => (
                    <SelectItem key={name} value={name} className="text-[11px] font-bold uppercase tracking-widest focus:bg-[#25D366] focus:text-slate-950">{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/5 text-[11px] font-black uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-6 py-4">Excursão</th>
                  <th className="px-6 py-4">Passageiro</th>
                  <th className="px-6 py-4 text-center">Parcela</th>
                  <th className="px-6 py-4">Valor</th>
                  <th className="px-6 py-4">Vencimento</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredTableData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((row) => (
                  <tr key={row.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-sm text-white group-hover:text-[#25D366] transition-colors">{row.excursionName}</div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-300">{row.passengerName}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-1 rounded-lg bg-white/5 text-[10px] font-bold font-mono">#{row.installment}</span>
                    </td>
                    <td className="px-6 py-4 font-bold text-sm text-white">{fmt(row.value)}</td>
                    <td className="px-6 py-4 text-sm font-mono text-slate-400">{format(parseISO(row.dueDate), 'dd/MM/yyyy')}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ring-1 ring-inset",
                        row.status === 'atrasado' ? "bg-red-500/10 text-red-500 ring-red-500/20" :
                        row.status === 'pago' ? "bg-[#25D366]/10 text-[#25D366] ring-[#25D366]/20" :
                        "bg-blue-500/10 text-blue-500 ring-blue-500/20"
                      )}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          <div className="p-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/[0.01]">
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">
              Mostrando {Math.min(filteredTableData.length, (currentPage - 1) * itemsPerPage + 1)} a {Math.min(filteredTableData.length, currentPage * itemsPerPage)} de {filteredTableData.length} registros
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="bg-white/5 border-white/10 hover:bg-white/10 text-xs font-bold uppercase tracking-widest rounded-xl disabled:opacity-20"
              >
                Anterior
              </Button>
              <div className="flex gap-1">
                {Array.from({ length: Math.ceil(filteredTableData.length / itemsPerPage) }).map((_, i) => {
                  const pageNum = i + 1;
                  // Show only current page, first, last, and pages around current
                  if (
                    pageNum === 1 || 
                    pageNum === Math.ceil(filteredTableData.length / itemsPerPage) ||
                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={cn(
                          "w-8 h-8 rounded-lg text-xs font-bold transition-all",
                          currentPage === pageNum 
                            ? "bg-[#25D366] text-slate-950 shadow-lg shadow-emerald-500/20" 
                            : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
                        )}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                    return <span key={pageNum} className="text-slate-600 px-1">...</span>;
                  }
                  return null;
                })}
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredTableData.length / itemsPerPage), prev + 1))}
                disabled={currentPage === Math.ceil(filteredTableData.length / itemsPerPage)}
                className="bg-white/5 border-white/10 hover:bg-white/10 text-xs font-bold uppercase tracking-widest rounded-xl disabled:opacity-20"
              >
                Próximo
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, icon: Icon, color, subValue }) => {
  const colors = {
    emerald: "from-emerald-500/20 to-emerald-500/5 text-emerald-500",
    blue: "from-blue-500/20 to-blue-500/5 text-blue-500",
    red: "from-red-500/20 to-red-500/5 text-red-500",
    orange: "from-orange-500/20 to-orange-500/5 text-orange-500",
    purple: "from-purple-500/20 to-purple-500/5 text-purple-500",
  };

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-5 shadow-xl relative overflow-hidden group"
    >
      <div className={cn("absolute -right-4 -bottom-4 opacity-10 transition-transform group-hover:scale-110 duration-500", colors[color].split(' ')[2])}>
        <Icon size={100} strokeWidth={3} />
      </div>
      <div className="flex items-center gap-3 mb-4">
        <div className={cn("p-2 rounded-xl bg-gradient-to-br", colors[color])}>
          <Icon size={20} />
        </div>
        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{title}</span>
      </div>
      <div className="space-y-1">
        <h4 className="text-2xl font-black text-white tracking-tight">{value}</h4>
        {subValue && (
          <div className="flex items-center gap-1.5">
            <TrendingUp size={12} className="text-[#25D366]" />
            <span className="text-[10px] font-bold text-[#25D366] uppercase">{subValue}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Dashboard;
