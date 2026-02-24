import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Star, MessageSquare, Calendar, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const FeedbackManagement = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [excursions, setExcursions] = useState([]);
  const [selectedExcursion, setSelectedExcursion] = useState('all');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, average: 0 });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchExcursions();
    fetchFeedbacks();
  }, []);

  useEffect(() => {
    // Reset to first page when filter changes
    setCurrentPage(1);

    if (feedbacks.length > 0) {
      const filtered = selectedExcursion === 'all' 
        ? feedbacks 
        : feedbacks.filter(f => f.excursao_id === selectedExcursion);
      
      const total = filtered.length;
      const sum = filtered.reduce((acc, curr) => acc + curr.rating, 0);
      const average = total > 0 ? (sum / total).toFixed(1) : 0;
      
      setStats({ total, average });
    } else {
      setStats({ total: 0, average: 0 });
    }
  }, [feedbacks, selectedExcursion]);

  const fetchExcursions = async () => {
    const { data } = await supabase.from('excursoes').select('id, nome').order('nome');
    if (data) setExcursions(data);
  };

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('feedbacks')
        .select(`
          id,
          rating,
          comentario,
          created_at,
          excursao_id,
          excursoes (nome),
          passageiros (nome)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFeedbacks(data || []);
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFeedbacks = selectedExcursion === 'all' 
    ? feedbacks 
    : feedbacks.filter(f => f.excursao_id === selectedExcursion);

  // Pagination logic
  const totalPages = Math.ceil(filteredFeedbacks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentFeedbacks = filteredFeedbacks.slice(startIndex, endIndex);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-white">Feedbacks e Avaliações</h2>
        
        <div className="w-full md:w-64">
          <Select value={selectedExcursion} onValueChange={setSelectedExcursion}>
            <SelectTrigger className="bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="Filtrar por excursão" />
            </SelectTrigger>
            <SelectContent className="bg-[#0F172A] border-white/20 text-white">
              <SelectItem value="all">Todas as Excursões</SelectItem>
              {excursions.map(excursion => (
                <SelectItem key={excursion.id} value={excursion.id}>
                  {excursion.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white/5 rounded-xl p-4 border border-white/10 flex items-center gap-4">
          <div className="p-3 bg-blue-500/20 rounded-full">
            <MessageSquare className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <p className="text-white/60 text-sm">Total de Avaliações</p>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white/5 rounded-xl p-4 border border-white/10 flex items-center gap-4">
          <div className="p-3 bg-yellow-500/20 rounded-full">
            <Star className="h-6 w-6 text-yellow-400" />
          </div>
          <div>
            <p className="text-white/60 text-sm">Média de Satisfação</p>
            <p className="text-2xl font-bold text-white">{stats.average} / 5.0</p>
          </div>
        </div>
      </div>

      {/* Feedbacks List */}
      <div className="grid gap-4">
        {loading ? (
          <p className="text-white/60 text-center py-8">Carregando feedbacks...</p>
        ) : filteredFeedbacks.length === 0 ? (
          <div className="bg-white/5 rounded-xl p-8 text-center border border-white/10">
            <p className="text-white/60">Nenhum feedback encontrado.</p>
          </div>
        ) : (
          <>
            {currentFeedbacks.map((feedback, index) => (
              <motion.div
                key={feedback.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white/5 rounded-xl p-6 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-[#ECAE62]">
                      {feedback.excursoes?.nome || 'Excursão desconhecida'}
                    </h3>
                    <div className="flex items-center gap-2 text-white/80 mt-1">
                      <User className="h-4 w-4" />
                      <span>{feedback.passageiros?.nome || 'Anônimo'}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-start md:items-end gap-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-5 w-5 ${
                            star <= feedback.rating
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-white/50 text-xs">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(feedback.created_at)}</span>
                    </div>
                  </div>
                </div>

                {feedback.comentario && (
                  <div className="bg-black/20 rounded-lg p-4 mt-2">
                    <p className="text-gray-300 italic">"{feedback.comentario}"</p>
                  </div>
                )}
              </motion.div>
            ))}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
                <p className="text-sm text-white/60">
                  Mostrando {startIndex + 1} a {Math.min(endIndex, filteredFeedbacks.length)} de {filteredFeedbacks.length} resultados
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="bg-white/5 border-white/10 text-white hover:bg-white/10 disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <div className="flex items-center px-2 text-white/80 text-sm font-medium">
                    Página {currentPage} de {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="bg-white/5 border-white/10 text-white hover:bg-white/10 disabled:opacity-50"
                  >
                    Próximo
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FeedbackManagement;
