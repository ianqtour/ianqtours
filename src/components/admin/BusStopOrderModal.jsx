import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { MapPin, ArrowUp, ArrowDown, Save, Loader2, Eye, EyeOff, GripVertical, Info, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';

const BusStopOrderModal = ({ open, onOpenChange, bus }) => {
  const [paradas, setParadas] = useState([]);
  const [originalParadas, setOriginalParadas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [newStopOpen, setNewStopOpen] = useState(false);
  const [newStopName, setNewStopName] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (open && bus) {
      fetchBusStops();
    }
  }, [open, bus]);

  useEffect(() => {
    // Check if order has changed
    const changed = JSON.stringify(paradas.map(p => ({ parada: p.parada, ativo: p.ativo }))) !== JSON.stringify(originalParadas.map(p => ({ parada: p.parada, ativo: p.ativo })));
    setHasChanges(changed);
  }, [paradas, originalParadas]);

  const fetchBusStops = async () => {
    setLoading(true);
    try {
      const { data: onibusData, error: onibusError } = await supabase
        .from('onibus_paradas')
        .select('*')
        .eq('onibus_id', bus.id)
        .order('posicao', { ascending: true });

      if (onibusError) throw onibusError;

      const { data: globalData, error: globalError } = await supabase
        .from('paradas_ordem')
        .select('parada, posicao')
        .order('posicao', { ascending: true });
        
      if (globalError) throw globalError;

      if (onibusData && onibusData.length > 0) {
        // Encontrar paradas globais que não estão na onibusData
        const onibusParadaNames = new Set(onibusData.map(p => p.parada));
        const missingGlobalStops = (globalData || [])
          .filter(p => !onibusParadaNames.has(p.parada))
          .map((p, index) => ({
            onibus_id: bus.id,
            parada: p.parada,
            posicao: onibusData.length + index + 1,
            ativo: false
          }));

        const combinedData = [...onibusData, ...missingGlobalStops];

        setParadas(combinedData);
        setOriginalParadas(combinedData);
      } else {
        const initialData = (globalData || []).map(p => ({
          onibus_id: bus.id,
          parada: p.parada,
          posicao: p.posicao,
          ativo: true
        }));

        setParadas(initialData);
        setOriginalParadas(initialData);
      }
    } catch (error) {
      console.error('Erro ao buscar paradas do ônibus:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as paradas deste ônibus.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const moveItem = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= paradas.length) return;
    
    const newParadas = [...paradas];
    const [movedItem] = newParadas.splice(fromIndex, 1);
    newParadas.splice(toIndex, 0, movedItem);
    
    // Recalculate positions
    const updated = newParadas.map((p, idx) => ({
      ...p,
      posicao: idx + 1
    }));
    
    setParadas(updated);
  };

  const toggleAtivo = (index) => {
    const newParadas = [...paradas];
    newParadas[index].ativo = newParadas[index].ativo === undefined ? false : !newParadas[index].ativo;
    setParadas(newParadas);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Primeiro limpa as antigas para este onibus (para garantir que deleções sejam efetivadas)
      await supabase
        .from('onibus_paradas')
        .delete()
        .eq('onibus_id', bus.id);

      // Upsert all positions
      if (paradas.length > 0) {
        const inserts = paradas.map(p => ({
          onibus_id: bus.id,
          parada: p.parada,
          posicao: p.posicao,
          ativo: p.ativo === undefined ? true : p.ativo
        }));

        const { error } = await supabase
          .from('onibus_paradas')
          .insert(inserts);

        if (error) throw error;
      }

      setOriginalParadas([...paradas]);
      
      toast({
        title: 'Ordem salva!',
        description: 'A ordem das paradas para este ônibus foi atualizada.',
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar ordem:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a ordem das paradas.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setParadas([...originalParadas]);
  };

  const handleAddNewStop = async () => {
    if (!newStopName.trim()) return;
    
    const formattedStop = newStopName.trim().toUpperCase().replace(/\s+/g, '_');
    
    if (paradas.some(p => p.parada === formattedStop)) {
      toast({
        title: 'Aviso',
        description: 'Esta parada já existe na lista.',
        variant: 'destructive',
      });
      return;
    }

    const maxPos = paradas.length > 0 ? Math.max(...paradas.map(p => p.posicao)) : 0;
    const novoItem = {
      onibus_id: bus.id,
      parada: formattedStop,
      posicao: maxPos + 1,
      ativo: true
    };

    setParadas([...paradas, novoItem]);
    setNewStopName('');
    setNewStopOpen(false);

    // Adiciona automaticamente à tabela global (paradas_ordem) se não existir
    try {
      const { data: existingGlobal, error: checkError } = await supabase
        .from('paradas_ordem')
        .select('id')
        .eq('parada', formattedStop)
        .maybeSingle();

      if (!existingGlobal && !checkError) {
        const { data: allGlobal } = await supabase
          .from('paradas_ordem')
          .select('posicao')
          .order('posicao', { ascending: false })
          .limit(1);
          
        const maxGlobalPos = allGlobal && allGlobal.length > 0 ? allGlobal[0].posicao : 0;

        await supabase
          .from('paradas_ordem')
          .insert({
            parada: formattedStop,
            posicao: maxGlobalPos + 1
          });
      }
    } catch (err) {
      console.error('Erro ao adicionar parada na lista global:', err);
    }
  };

  const formatParadaLabel = (value) => {
    if (!value) return '';
    return String(value).toUpperCase().replace(/_/g, ' ');
  };

  // Drag handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      moveItem(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0F172A] border-white/20 text-white sm:max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center pr-6">
            <span>Paradas: {bus?.name} ({bus?.identification})</span>
            <Button 
              size="sm"
              onClick={() => setNewStopOpen(true)}
              className="bg-[#ECAE62] text-[#0B1420] hover:bg-[#d49a55] h-8"
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </DialogTitle>
          <DialogDescription className="text-white/70">
            Ajuste a ordem em que este ônibus passará pelas paradas.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 pb-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-[#ECAE62] animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-[#ECAE62]/10 border border-[#ECAE62]/30 rounded-xl p-3 flex items-start gap-3">
                <Info className="h-5 w-5 text-[#ECAE62] flex-shrink-0 mt-0.5" />
                <div className="text-sm text-white/80">
                  <p>Desative as paradas que não fazem parte do trajeto deste ônibus ou altere a ordem. Isso não afetará a lista global.</p>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                <div className="divide-y divide-white/5">
                  {paradas.length === 0 ? (
                    <div className="p-6 text-center text-white/50">Nenhuma parada configurada.</div>
                  ) : (
                    paradas.map((parada, index) => (
                      <motion.div
                        key={parada.parada}
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`
                          flex items-center gap-2 px-3 py-2 transition-all cursor-grab active:cursor-grabbing select-none
                          ${draggedIndex === index ? 'opacity-50 bg-[#ECAE62]/5' : ''}
                          ${dragOverIndex === index && draggedIndex !== index ? 'bg-[#ECAE62]/10 border-t-2 border-t-[#ECAE62]' : ''}
                          ${parada.ativo === false ? 'opacity-50' : 'hover:bg-white/5'}
                        `}
                      >
                        <div className="text-white/30 hover:text-white/60 transition-colors">
                          <GripVertical className="h-5 w-5" />
                        </div>

                        <div className="flex-shrink-0 w-6 h-6 rounded bg-[#ECAE62]/15 flex items-center justify-center">
                          <span className="text-[#ECAE62] font-bold text-xs">{index + 1}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <span className="text-white font-medium text-sm truncate pl-2">
                            {formatParadaLabel(parada.parada)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={index === 0}
                            onClick={() => moveItem(index, index - 1)}
                            className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-20"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={index === paradas.length - 1}
                            onClick={() => moveItem(index, index + 1)}
                            className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-20"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleAtivo(index)}
                            title={parada.ativo === false ? 'Ativar parada' : 'Desativar parada'}
                            className={`h-8 w-8 ${parada.ativo === false ? 'text-white/40 hover:text-white' : 'text-red-400/60 hover:text-red-400 hover:bg-red-400/10'}`}
                          >
                            {parada.ativo === false ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-white/10 pt-4 mt-2">
          {hasChanges && (
            <Button
              variant="ghost"
              onClick={handleReset}
              className="text-white/60 hover:text-white"
            >
              Desfazer
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-transparent border-white/20 text-white">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || (!hasChanges && paradas.length === originalParadas.length)}
            className="bg-[#ECAE62] text-[#0B1420] hover:bg-[#d49a55] disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar
          </Button>
        </DialogFooter>

        {/* Modal de Nova Parada Interno */}
        <Dialog open={newStopOpen} onOpenChange={setNewStopOpen}>
          <DialogContent className="bg-[#1E293B] border-white/20 text-white sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Adicionar Parada ao Ônibus</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input
                value={newStopName}
                onChange={(e) => setNewStopName(e.target.value)}
                placeholder="Ex: POSTO GRAAL"
                className="bg-white/10 border-white/20 text-white uppercase"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewStopOpen(false)} className="border-white/20">Cancelar</Button>
              <Button onClick={handleAddNewStop} className="bg-[#ECAE62] text-[#0B1420]">Adicionar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </DialogContent>
    </Dialog>
  );
};

export default BusStopOrderModal;
