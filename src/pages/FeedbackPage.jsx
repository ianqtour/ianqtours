import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';

const FeedbackPage = () => {
  const { excursaoName, cpf } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const [surveyData, setSurveyData] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');

  useEffect(() => {
    const fetchSurveyDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        // Normalize inputs for safety (though RPC handles it too)
        const cleanCpf = cpf?.replace(/\D/g, '') || '';
        const decodedExcursionName = decodeURIComponent(excursaoName || '').replace(/_/g, ' ');

        if (!cleanCpf || !decodedExcursionName) {
          throw new Error('Link inválido.');
        }

        // Call the RPC function
        const { data, error } = await supabase
          .rpc('get_survey_target', {
            p_excursion_name: decodedExcursionName,
            p_cpf: cleanCpf
          });

        if (error) throw error;

        // The RPC returns a row if valid, or nothing/null if invalid
        // Since it returns a table, data will be an array.
        if (!data || data.length === 0) {
          throw new Error('Reserva não encontrada ou link inválido. Verifique se o nome da excursão e o CPF estão corretos.');
        }

        const details = data[0];
        
        if (details.has_feedback) {
           setError('Você já enviou seu feedback para esta excursão. Obrigado!');
           return;
        }

        setSurveyData(details);
      } catch (err) {
        console.error('Error fetching survey:', err);
        setError(err.message || 'Erro ao carregar a pesquisa.');
      } finally {
        setLoading(false);
      }
    };

    fetchSurveyDetails();
  }, [excursaoName, cpf]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      toast({
        variant: "destructive",
        title: "Avaliação necessária",
        description: "Por favor, selecione uma nota de 1 a 5 estrelas.",
      });
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase.rpc('submit_feedback', {
        p_excursao_id: surveyData.excursao_id,
        p_passageiro_id: surveyData.passageiro_id,
        p_rating: rating,
        p_comentario: comment
      });

      if (error) throw error;

      setSuccess(true);
      toast({
        title: "Obrigado!",
        description: "Seu feedback foi enviado com sucesso.",
        className: "bg-green-500 text-white border-none"
      });

    } catch (err) {
      console.error('Error submitting feedback:', err);
      toast({
        variant: "destructive",
        title: "Erro ao enviar",
        description: "Ocorreu um erro ao salvar seu feedback. Tente novamente.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B1420]">
        <Loader2 className="h-8 w-8 animate-spin text-[#ECAE62]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B1420] p-4">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Atenção</h2>
          <p className="text-gray-300">{error}</p>
          <Button 
            onClick={() => navigate('/')}
            className="mt-6 bg-[#ECAE62] hover:bg-[#8C641C] text-[#0B1420]"
          >
            Voltar ao Início
          </Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B1420] p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 text-center"
        >
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Obrigado pelo Feedback!</h2>
          <p className="text-gray-300 mb-6">Sua opinião é muito importante para melhorarmos nossos serviços.</p>
          <Button 
            onClick={() => navigate('/')}
            className="bg-[#ECAE62] hover:bg-[#8C641C] text-[#0B1420]"
          >
            Voltar ao Início
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1420] bg-gradient-to-br from-[#0B1420] via-[#0E1E2E] to-[#0B1420] py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="max-w-lg w-full space-y-8 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 sm:p-10 shadow-2xl"
      >
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[#ECAE62] mb-2">Pesquisa de Satisfação</h1>
          <p className="text-gray-300">
            Olá, <span className="font-semibold text-white">{surveyData?.passageiro_nome}</span>!
          </p>
          <p className="text-gray-400 text-sm mt-1">
            Como foi sua experiência na excursão <br/>
            <span className="font-semibold text-white text-lg">{surveyData?.excursao_nome}</span>?
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 mt-8">
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-300 text-center">
              Sua Avaliação
            </label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="focus:outline-none transition-transform hover:scale-110"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                >
                  <Star 
                    className={`h-10 w-10 ${
                      star <= (hoverRating || rating) 
                        ? 'text-yellow-400 fill-yellow-400' 
                        : 'text-gray-600'
                    }`} 
                  />
                </button>
              ))}
            </div>
            <p className="text-center text-sm h-5 font-medium text-[#ECAE62]">
              {rating === 1 && "Muito Insatisfeito"}
              {rating === 2 && "Insatisfeito"}
              {rating === 3 && "Neutro"}
              {rating === 4 && "Satisfeito"}
              {rating === 5 && "Muito Satisfeito!"}
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="comment" className="block text-sm font-medium text-gray-300">
              Comentário (Opcional)
            </label>
            <Textarea
              id="comment"
              placeholder="Conte-nos o que você mais gostou ou o que podemos melhorar..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 min-h-[120px]"
            />
          </div>

          <Button
            type="submit"
            disabled={submitting || rating === 0}
            className="w-full bg-[#ECAE62] hover:bg-[#8C641C] text-[#0B1420] font-bold py-3 text-lg h-auto transition-all"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar Avaliação'
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

export default FeedbackPage;
