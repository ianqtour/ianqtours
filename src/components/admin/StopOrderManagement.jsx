import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { MapPin, ArrowUp, ArrowDown, Save, Loader2, RotateCcw, GripVertical, Info, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';

const StopOrderManagement = () => {
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
    fetchParadasOrder();
  }, []);

  useEffect(() => {
    // Check if order has changed
    const changed = JSON.stringify(paradas.map(p => p.parada)) !== JSON.stringify(originalParadas.map(p => p.parada));
    setHasChanges(changed);
  }, [paradas, originalParadas]);

  const fetchParadasOrder = async () => {
    setLoading(true);
    try {
      // Try to get from paradas_ordem table first
      const { data: ordemData, error: ordemError } = await supabase
        .from('paradas_ordem')
        .select('*')
        .order('posicao', { ascending: true });

      if (ordemError) throw ordemError;

      if (ordemData && ordemData.length > 0) {
        setParadas(ordemData);
        setOriginalParadas(ordemData);
      } else {
        // Fallback: get from enum and initialize
        const { data, error } = await supabase.rpc('get_enum_values', { p_enum_name: 'public.paradas' });
        if (error) throw error;
        
        const values = (data || []).map((x, idx) => ({
          parada: x?.value,
          posicao: idx + 1
        })).filter(p => p.parada);

        // Save initial order to table
        if (values.length > 0) {
          const { error: insertError } = await supabase
            .from('paradas_ordem')
            .upsert(values.map(v => ({
              parada: v.parada,
              posicao: v.posicao
            })), { onConflict: 'parada' });

          if (insertError) console.error('Erro ao inicializar ordem:', insertError);
        }

        setParadas(values);
        setOriginalParadas(values);
      }
    } catch (error) {
      console.error('Erro ao buscar paradas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as paradas.',
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

  const handleSave = async () => {
    setSaving(true);
    try {
      // Upsert all positions
      const updates = paradas.map(p => ({
        parada: p.parada,
        posicao: p.posicao,
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('paradas_ordem')
        .upsert(updates, { onConflict: 'parada' });

      if (error) throw error;

      setOriginalParadas([...paradas]);
      
      toast({
        title: 'Ordem salva!',
        description: 'A ordem das paradas foi atualizada com sucesso. O link do guia já refletirá a nova ordem.',
      });
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

  const handleAddNewStop = () => {
    if (!newStopName.trim()) return;
    
    const formattedStop = newStopName.trim().toUpperCase().replace(/\s+/g, '_');
    
    if (paradas.some(p => p.parada === formattedStop)) {
      toast({
        title: 'Aviso',
        description: 'Esta parada já existe.',
        variant: 'destructive',
      });
      return;
    }

    const maxPos = paradas.length > 0 ? Math.max(...paradas.map(p => p.posicao)) : 0;
    const novoItem = {
      parada: formattedStop,
      posicao: maxPos + 1
    };

    setParadas([...paradas, novoItem]);
    setNewStopName('');
    setNewStopOpen(false);
  };

  const formatParadaLabel = (value) => {
    if (!value) return '';
    return String(value).toUpperCase().replace(/_/g, ' ');
  };

  // Drag handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Required for Firefox
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-[#ECAE62] animate-spin" />
          <span className="text-white/60 text-sm">Carregando paradas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <MapPin className="h-6 w-6 text-[#ECAE62]" />
            Ordem das Paradas
          </h2>
          <p className="text-white/50 text-sm mt-1">
            Arraste ou use as setas para reordenar. A ordem define como os passageiros aparecem agrupados no link do guia.
          </p>
        </div>
        <Button 
          onClick={() => setNewStopOpen(true)}
          className="bg-[#ECAE62] text-[#0B1420] hover:bg-[#d49a55]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Parada
        </Button>
      </div>

      {/* Info Banner */}
      <div className="bg-[#ECAE62]/10 border border-[#ECAE62]/30 rounded-xl p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-[#ECAE62] flex-shrink-0 mt-0.5" />
        <div className="text-sm text-white/80">
          <p>A primeira parada da lista será o ponto de embarque inicial. Os passageiros serão agrupados nesta ordem no link compartilhado com o guia.</p>
        </div>
      </div>

      {/* Stop List */}
      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
        <div className="divide-y divide-white/5">
          {paradas.map((parada, index) => (
            <motion.div
              key={parada.parada}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`
                flex items-center gap-3 px-4 py-3.5 transition-all cursor-grab active:cursor-grabbing select-none
                ${draggedIndex === index ? 'opacity-50 bg-[#ECAE62]/5' : ''}
                ${dragOverIndex === index && draggedIndex !== index ? 'bg-[#ECAE62]/10 border-t-2 border-t-[#ECAE62]' : ''}
                hover:bg-white/5
              `}
            >
              {/* Drag Handle */}
              <div className="text-white/30 hover:text-white/60 transition-colors">
                <GripVertical className="h-5 w-5" />
              </div>

              {/* Position Badge */}
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#ECAE62]/15 flex items-center justify-center">
                <span className="text-[#ECAE62] font-bold text-sm">{index + 1}</span>
              </div>

              {/* Stop Name */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#ECAE62]/60 flex-shrink-0" />
                  <span className="text-white font-medium text-sm truncate">
                    {formatParadaLabel(parada.parada)}
                  </span>
                </div>
              </div>

              {/* Arrow Buttons */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={index === 0}
                  onClick={() => moveItem(index, index - 1)}
                  className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-transparent"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={index === paradas.length - 1}
                  onClick={() => moveItem(index, index + 1)}
                  className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-transparent"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <AnimatePresence>
        {hasChanges && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex justify-end gap-3 pt-2"
          >
            <Button
              variant="outline"
              onClick={handleReset}
              className="bg-transparent border-white/20 text-white hover:bg-white/10"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Desfazer
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#ECAE62] text-[#0B1420] hover:bg-[#d49a55] disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Ordem
                </>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {!hasChanges && paradas.length > 0 && (
        <div className="text-center py-2">
          <span className="text-white/30 text-xs">✓ Ordem salva e sincronizada com o link do guia</span>
        </div>
      )}

      {/* Modal Nova Parada */}
      <Dialog open={newStopOpen} onOpenChange={setNewStopOpen}>
        <DialogContent className="bg-[#0F172A] border-white/20 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Parada</DialogTitle>
            <DialogDescription className="text-white/70">
              Digite o nome da nova parada. Ela será adicionada ao final da lista.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">Nome da Parada</label>
              <Input
                value={newStopName}
                onChange={(e) => setNewStopName(e.target.value)}
                placeholder="Ex: POSTO GRAAL"
                className="bg-white/10 border-white/20 text-white uppercase"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewStopOpen(false)} className="bg-transparent border-white/20 text-white hover:bg-white/10">
              Cancelar
            </Button>
            <Button onClick={handleAddNewStop} className="bg-[#ECAE62] text-[#0B1420] hover:bg-[#d49a55]">
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StopOrderManagement;
