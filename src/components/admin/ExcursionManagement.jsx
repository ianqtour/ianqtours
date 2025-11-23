import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Edit, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase'

const ExcursionManagement = () => {
  const [excursions, setExcursions] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    destination: '',
    departureTime: '',
    returnTime: '',
    paymentTerms: '',
    inclusions: '',
    duration: '',
    price: '',
    image: '',
    imageFile: null,
  });
  const [depDateBR, setDepDateBR] = useState('')
  const [depTimeHM, setDepTimeHM] = useState('')
  const [retDateBR, setRetDateBR] = useState('')
  const [retTimeHM, setRetTimeHM] = useState('')
  const { toast } = useToast();
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const defaultPaymentTerms = "VALOR DE ENTRADA: R$100,00 + 5 parcelas de R$160,00";
  const defaultInclusions = "Hospedagem em Porto de Galinhas (2 diárias).\n2 café da manhã.\nTransporte em ônibus executivo.\nGuia Regional.\nServiço de bordo.\nBrinde Premium individual.\nSorteio de Brindes.\nTranslado até Maragogi.\nCity Tour em Recife e Olinda.";
  const defaultDescription = "🌴✨ Roteiro dos Sonhos: Porto de Galinhas + Recife + Olinda + Maragogi! ✨🌊\n\nPrepare-se para viver momentos inesquecíveis em uma excursão cheia de beleza, cultura e diversão! Venha conosco conhecer as águas cristalinas e piscinas naturais de Porto de Galinhas, a riqueza histórica e cultural de Recife e Olinda, além do paraíso tropical de Maragogi, com suas famosas galés! 🏖️\n\nSerão dias incríveis, com muito sol, mar, passeios emocionantes e experiências únicas!";

  const formatDate = (s) => {
    if (!s) return ''
    try {
      return new Date(s).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    } catch {
      return String(s)
    }
  }

  const toDateTimeLocalInput = (s) => {
    if (!s) return ''
    const d = new Date(s)
    const fmt = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    const parts = fmt.formatToParts(d)
    const get = (t) => parts.find(p => p.type === t)?.value || ''
    const y = get('year')
    const m = get('month')
    const da = get('day')
    const h = get('hour')
    const mi = get('minute')
    if (!y || !m || !da || !h || !mi) return ''
    return `${y}-${m}-${da}T${h}:${mi}`
  }

  const isoToBRDate = (iso) => {
    if (!iso) return ''
    const parts = String(iso).split('T')
    const date = parts[0] || ''
    if (!date) return ''
    const [y, m, d] = date.split('-')
    if (!y || !m || !d) return ''
    return `${d}/${m}/${y}`
  }

  const isoToHM = (iso) => {
    if (!iso) return ''
    const parts = String(iso).split('T')
    const time = parts[1] || ''
    if (!time) return ''
    const [hh, mm] = time.split(':')
    if (!hh || !mm) return ''
    return `${hh}:${mm}`
  }

  const brDateToIsoDate = (br) => {
    if (!br) return ''
    const [d, m, y] = String(br).replace(/[^0-9/]/g, '').split('/')
    if (!d || !m || !y) return ''
    const dd = d.padStart(2, '0')
    const mm = m.padStart(2, '0')
    const yyyy = y.padStart(4, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  const formatBRDateInput = (v) => {
    const digits = String(v).replace(/\D/g, '').slice(0, 8)
    const len = digits.length
    if (len <= 2) return digits
    if (len <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
  }

  useEffect(() => {
    setDepDateBR(isoToBRDate(formData.departureTime))
    setDepTimeHM(isoToHM(formData.departureTime))
    setRetDateBR(isoToBRDate(formData.returnTime))
    setRetTimeHM(isoToHM(formData.returnTime))
  }, [formData.departureTime, formData.returnTime, isAdding, editingId])

  useEffect(() => {
    loadExcursions();
  }, []);

  const loadExcursions = async () => {
    const { data } = await supabase.from('excursoes').select('*').order('horario_partida', { ascending: true })
    const mapped = (data || []).map((row) => ({
      id: row.id,
      name: row.nome,
      description: row.descricao,
      destination: row.destino,
      date: row.horario_partida,
      departureTime: toDateTimeLocalInput(row.horario_partida),
      returnTime: toDateTimeLocalInput(row.horario_retorno),
      paymentTerms: row.forma_pagamento || '',
      inclusions: row.incluso || '',
      duration: row.duracao,
      price: Number(row.preco),
      image: row.imagem_url || ''
    }))
    setExcursions(mapped)
  };

  const saveExcursions = (data) => {
    setExcursions(data);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image: reader.result, imageFile: file });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const toBRTimestamp = (v) => {
      if (!v) return null
      const hasSeconds = v.length >= 19
      const base = hasSeconds ? v : `${v}:00`
      return `${base}-03:00`
    }
    if (editingId) {
      let imageUrl = null
      if (formData.imageFile) {
        const path = `${editingId}/capa-${Date.now()}-${formData.imageFile.name}`
        const { error: upErr } = await supabase.storage.from('excursoes').upload(path, formData.imageFile, { upsert: true, contentType: formData.imageFile.type })
        if (!upErr) {
          const { data: pub } = await supabase.storage.from('excursoes').getPublicUrl(path)
          imageUrl = pub.publicUrl
        }
      }
      const updateFields = {
        nome: formData.name,
        descricao: formData.description,
        destino: formData.destination,
        horario_partida: toBRTimestamp(formData.departureTime),
        horario_retorno: toBRTimestamp(formData.returnTime),
        forma_pagamento: formData.paymentTerms,
        incluso: formData.inclusions,
        duracao: formData.duration,
        preco: parseFloat(formData.price),
      }
      if (imageUrl) {
        updateFields.imagem_url = imageUrl
      }
      await supabase.from('excursoes').update(updateFields).eq('id', editingId)
      await loadExcursions()
      toast({
        title: "Excursão Atualizada",
        description: "A excursão foi atualizada com sucesso.",
      });
      setEditingId(null);
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from('excursoes')
        .insert({
          nome: formData.name,
          descricao: formData.description,
          destino: formData.destination,
          horario_partida: toBRTimestamp(formData.departureTime),
          horario_retorno: toBRTimestamp(formData.returnTime),
          forma_pagamento: formData.paymentTerms,
          incluso: formData.inclusions,
          duracao: formData.duration,
          preco: parseFloat(formData.price),
        })
        .select('id')
        .single()
      if (insErr) {
        toast({ title: 'Erro ao criar excursão', description: insErr.message, variant: 'destructive' })
      }
      if (!insErr && formData.imageFile) {
        const path = `${inserted.id}/capa-${Date.now()}-${formData.imageFile.name}`
        const { error: upErr } = await supabase.storage.from('excursoes').upload(path, formData.imageFile, { upsert: true, contentType: formData.imageFile.type })
        if (upErr) {
          toast({ title: 'Erro no upload da capa', description: upErr.message, variant: 'destructive' })
        } else {
          const { data: pub } = await supabase.storage.from('excursoes').getPublicUrl(path)
          const imageUrl = pub.publicUrl
          await supabase.from('excursoes').update({ imagem_url: imageUrl }).eq('id', inserted.id)
        }
      }
      await loadExcursions()
      toast({
        title: "Excursão Criada",
        description: "Nova excursão foi criada com sucesso.",
      });
    }

    setFormData({
      name: '',
      description: '',
      destination: '',
      departureTime: '',
      returnTime: '',
      paymentTerms: '',
      inclusions: '',
      duration: '',
      price: '',
      image: '',
      imageFile: null,
    });
    setIsAdding(false);
  };

  const handleEdit = (excursion) => {
    setFormData(excursion);
    setEditingId(excursion.id);
    setIsAdding(true);
  };

  const requestDelete = (id) => {
    setConfirmDeleteId(id)
    setConfirmOpen(true)
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return
    await supabase.from('excursoes').delete().eq('id', confirmDeleteId)
    await loadExcursions()
    toast({
      title: "Excursão Excluída",
      description: "A excursão foi removida.",
    });
    setConfirmOpen(false)
    setConfirmDeleteId(null)
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      name: '',
      description: '',
      destination: '',
      departureTime: '',
      returnTime: '',
      paymentTerms: '',
      inclusions: '',
      duration: '',
      price: '',
      image: ''
    });
    setDepDateBR('')
    setDepTimeHM('')
    setRetDateBR('')
    setRetTimeHM('')
  };

  return (
    <div className="space-y-6">
      {!isAdding ? (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">Excursões</h2>
            <Button
              onClick={() => {
                setEditingId(null);
                setFormData({
                  name: '',
                  description: defaultDescription,
                  destination: '',
                  departureTime: '',
                  returnTime: '',
                  paymentTerms: defaultPaymentTerms,
                  inclusions: defaultInclusions,
                  duration: '',
                  price: '',
                  availableSeats: '',
                  image: '',
                  imageFile: null,
                });
                setIsAdding(true);
              }}
              className="bg-[#ECAE62] hover:bg-[#8C641C] text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Excursão
            </Button>
          </div>

          {excursions.length === 0 ? (
            <div className="bg-white/5 rounded-xl p-12 text-center">
              <p className="text-white/70">Nenhuma excursão ainda. Crie a sua primeira!</p>
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {excursions.map((excursion, index) => (
                <motion.div
                  key={excursion.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white/5 rounded-xl p-4 border border-white/10"
                >
                  {excursion.image && (
                    <img
                      src={excursion.image}
                      alt={excursion.name}
                      className="w-full h-32 object-cover rounded-lg mb-3"
                    />
                  )}
                  <h3 className="text-lg font-bold text-white mb-2">{excursion.name}</h3>
                  <p className="text-white/70 text-sm mb-2 line-clamp-2">{excursion.description}</p>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[#ECAE62] font-bold">R${excursion.price}</span>
                    <span className="text-white/60 text-sm">{formatDate(excursion.date)}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleEdit(excursion)}
                      size="sm"
                      className="flex-1 bg-[#ECAE62] hover:bg-[#8C641C] text-white"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      onClick={() => requestDelete(excursion.id)}
                      size="sm"
                      className="flex-1 bg-white text-red-600 border border-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 rounded-xl p-6"
        >
          <h2 className="text-2xl font-bold text-white mb-6">
            {editingId ? 'Editar Excursão' : 'Adicionar Nova Excursão'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white">Nome da Excursão</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  placeholder="Aventura na Montanha"
                  spellCheck={true}
                  lang="pt-BR"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="destination" className="text-white">Destino</Label>
                <Input
                  id="destination"
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  placeholder="Chapada Diamantina"
                  spellCheck={true}
                  lang="pt-BR"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="departureDate" className="text-white">Data de Partida</Label>
                <Input
                  id="departureDate"
                  type="text"
                  inputMode="numeric"
                  placeholder="dd/mm/aaaa"
                  value={depDateBR}
                  maxLength={10}
                  onChange={(e) => {
                    const masked = formatBRDateInput(e.target.value)
                    setDepDateBR(masked)
                    const isoDate = brDateToIsoDate(masked)
                    const hm = depTimeHM
                    setFormData({ ...formData, departureTime: isoDate && hm ? `${isoDate}T${hm}` : '' })
                  }}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  required
                />
                <Label htmlFor="departureHour" className="text-white">Horário de Partida</Label>
                <Input
                  id="departureHour"
                  type="time"
                  value={depTimeHM}
                  onChange={(e) => {
                    const hm = e.target.value
                    setDepTimeHM(hm)
                    const isoDate = brDateToIsoDate(depDateBR)
                    setFormData({ ...formData, departureTime: isoDate && hm ? `${isoDate}T${hm}` : '' })
                  }}
                  className="bg-white/10 border-white/20 text-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="returnDate" className="text-white">Data de Retorno</Label>
                <Input
                  id="returnDate"
                  type="text"
                  inputMode="numeric"
                  placeholder="dd/mm/aaaa"
                  value={retDateBR}
                  maxLength={10}
                  onChange={(e) => {
                    const masked = formatBRDateInput(e.target.value)
                    setRetDateBR(masked)
                    const isoDate = brDateToIsoDate(masked)
                    const hm = retTimeHM
                    setFormData({ ...formData, returnTime: isoDate && hm ? `${isoDate}T${hm}` : '' })
                  }}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  required
                />
                <Label htmlFor="returnHour" className="text-white">Horário de Retorno</Label>
                <Input
                  id="returnHour"
                  type="time"
                  value={retTimeHM}
                  onChange={(e) => {
                    const hm = e.target.value
                    setRetTimeHM(hm)
                    const isoDate = brDateToIsoDate(retDateBR)
                    setFormData({ ...formData, returnTime: isoDate && hm ? `${isoDate}T${hm}` : '' })
                  }}
                  className="bg-white/10 border-white/20 text-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration" className="text-white">Duração</Label>
                <Input
                  id="duration"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  placeholder="3 dias"
                  spellCheck={true}
                  lang="pt-BR"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price" className="text-white">Preço (R$)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  placeholder="299.99"
                  required
                />
              </div>

            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-white">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 min-h-[100px]"
                placeholder="Descreva a excursão..."
                spellCheck={true}
                lang="pt-BR"
                maxLength={500}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentTerms" className="text-white">Forma de Pagamento</Label>
              <Textarea
                id="paymentTerms"
                value={formData.paymentTerms}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 min-h-[90px]"
                placeholder="VALOR DE ENTRADA: R$100,00 + 5 parcelas de R$160,00"
                spellCheck={true}
                lang="pt-BR"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inclusions" className="text-white">Incluso</Label>
              <Textarea
                id="inclusions"
                value={formData.inclusions}
                onChange={(e) => setFormData({ ...formData, inclusions: e.target.value })}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 min-h-[140px]"
                placeholder="Hospedagem em Porto de Galinhas (2 diárias).
2 café da manhã.
Transporte em ônibus executivo.
Guia Regional.
Serviço de bordo.
Brinde Premium individual.
Sorteio de Brindes.
Translado até Maragogi.
City Tour em Recife e Olinda."
                spellCheck={true}
                lang="pt-BR"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image" className="text-white">Imagem de Capa</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  onClick={() => document.getElementById('image')?.click()}
                  className="bg-[#ECAE62] hover:bg-[#8C641C] text-white"
                >
                  Escolher arquivo
                </Button>
                <span className="text-white/80 text-sm whitespace-pre-line">
                  {formData.imageFile ? formData.imageFile.name : 'Nenhum arquivo selecionado'}
                </span>
                {formData.image && (
                  <img src={formData.image} alt="Pré-visualização" className="h-16 w-16 object-cover rounded" />
                )}
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                className="flex-1 bg-[#ECAE62] hover:bg-[#8C641C] text-white"
              >
                {editingId ? 'Atualizar Excursão' : 'Criar Excursão'}
              </Button>
              <Button
                type="button"
                onClick={handleCancel}
                className="flex-1 bg-white text-[#0F172A] hover:bg-gray-100"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </motion.div>
      )}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-[#0F172A] text-white">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Confirmar exclusão</DialogTitle>
            <DialogDescription className="text-white/80 text-sm">
              Essa ação não pode ser desfeita. Tem certeza que deseja excluir esta excursão?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 sm:gap-2">
            <Button onClick={() => setConfirmOpen(false)} className="flex-1 bg-white text-[#0F172A] hover:bg-gray-100 text-sm sm:text-base">Cancelar</Button>
            <Button onClick={handleDelete} className="flex-1 bg-red-600 text-white hover:bg-red-700 text-sm sm:text-base">Confirmar exclusão</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExcursionManagement;