import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Map, ShieldCheck, Star, Users, Sun, Mountain, Waves, CalendarDays, Plane, Compass, Camera, MapPin, Globe2, Bus, Ticket, ChevronLeft, ChevronRight } from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { supabase } from '@/lib/supabase';
import { buildWhatsAppUrl } from '@/lib/whatsapp';

const LandingPage = () => {
  const navigate = useNavigate();
  const [tours, setTours] = useState([]);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef(null);
  const SEGMENT_SECONDS = 20;
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [currentHighlight, setCurrentHighlight] = useState(0);

  useEffect(() => {
    const loadTours = async () => {
      const { data } = await supabase.from('excursoes').select('*').order('horario_partida', { ascending: true });

      const exList = data || [];
      const exIds = exList.map(r => r.id);
      let busByExc = {};
      let availByExc = {};

      if (exIds.length) {
        const { data: buses } = await supabase
          .from('onibus')
          .select('id,excursao_id,total_assentos')
          .in('excursao_id', exIds);

        const busIds = (buses || []).map(b => b.id);
        (buses || []).forEach(b => {
          busByExc[b.excursao_id] = (busByExc[b.excursao_id] || []).concat(b);
        });

        if (busIds.length) {
          const { data: seats } = await supabase
            .from('assentos_onibus')
            .select('onibus_id,status')
            .in('onibus_id', busIds);

          const byBus = {};
          (seats || []).forEach(s => {
            byBus[s.onibus_id] = (byBus[s.onibus_id] || []).concat(s);
          });

          exIds.forEach(exId => {
            const busesForExc = busByExc[exId] || [];
            if (busesForExc.length) {
              let count = 0;
              busesForExc.forEach(b => {
                const ss = byBus[b.id] || [];
                if (ss.length) {
                  count += ss.filter(s => s.status !== 'ocupado').length;
                } else {
                  count += Number(b.total_assentos) || 0;
                }
              });
              availByExc[exId] = count;
            }
          });
        }
      }

      const mapped = exList.map((row) => ({
        id: row.id,
        name: row.nome,
        description: row.descricao,
        destination: row.destino,
        date: row.horario_partida,
        price: Number(row.preco),
        image: row.imagem_url || '',
        availableSeats: availByExc[row.id] ?? null,
      }));
      const upcoming = mapped.filter(t => new Date(t.date) >= new Date());
      setTours(upcoming.slice(0, 6));
      if (!data || data.length === 0) {
        setTours([
          {
            id: '1',
            name: 'Aventura na Chapada',
            date: '2025-12-05',
            price: 899.90,
            image: 'https://images.unsplash.com/photo-1533130095898-a7648f9479a4?q=80&w=2070&auto=format&fit=crop',
            destination: 'Chapada dos Veadeiros, Goiás',
          },
          {
            id: '2',
            name: 'Paraíso Litorâneo',
            date: '2026-01-15',
            price: 1250.00,
            image: 'https://images.unsplash.com/photo-1507525428034-b723a996f6ea?q=80&w=2070&auto=format&fit=crop',
            destination: 'Praias Paradisíacas, Nordeste do Brasil',
          },
          {
            id: '3',
            name: 'Cidades Históricas',
            date: '2026-02-20',
            price: 750.00,
            image: 'https://images.unsplash.com/photo-1599912025742-3a7a92d259fb?q=80&w=1936&auto=format&fit=crop',
            destination: 'Cidades Históricas, Minas Gerais',
          },
        ]);
      }
    };
    loadTours();
  }, []);

  const features = [
    {
      icon: <Map className="h-8 w-8 text-[#ECAE62]" />,
      title: 'Destinos Exclusivos',
      description: 'Explore lugares únicos e paisagens de tirar o fôlego, cuidadosamente selecionados para você.',
    },
    {
      icon: <ShieldCheck className="h-8 w-8 text-[#ECAE62]" />,
      title: 'Segurança e Conforto',
      description: 'Viaje com tranquilidade em nossos ônibus modernos e com guias experientes.',
    },
    {
      icon: <Users className="h-8 w-8 text-[#ECAE62]" />,
      title: 'Grupos Incríveis',
      description: 'Conecte-se com outros viajantes e crie amizades e memórias para toda a vida.',
    },
  ];

  const testimonials = [
    {
      name: 'Helen Cavalcante',
      review: 'Foi maravilhoso, que venham as próximas vezes. 😍👏',
      image: 'https://ujowugielrmzvmwqenhb.supabase.co/storage/v1/object/public/excursoes/hellen-comment.jpg',
    },
    {
      name: 'Tatyana Lima',
      review: 'Equipe maravilhosa, obrigada por proporcionar esse momentos incríveis 😍👏👏',
      image: 'https://ujowugielrmzvmwqenhb.supabase.co/storage/v1/object/public/excursoes/taty-comment.jpg',
    },
    {
      name: 'Ant° Vasconcelos',
      review: 'Que viagem maravilhosa, incrível. Só parabenizar agradecer ao @ianqtur_excursoes por proporcionar momentos como esses. É o melhor de Sobral!',
      image: 'https://ujowugielrmzvmwqenhb.supabase.co/storage/v1/object/public/excursoes/antonio.jpg',
    },
  ];

  const stats = [
    { label: 'Aventureiros felizes', value: '4k+' },
    { label: 'Destinos', value: '30+' },
    { label: 'Avaliações 5★', value: '4.9/5' },
    { label: 'Anos de experiência', value: '3+' }
  ];

  const [featuredDestinations, setFeaturedDestinations] = useState([]);

  const steps = [
    { icon: <Compass className="h-6 w-6" />, title: 'Escolha o destino', desc: 'Descubra roteiros exclusivos e experiências únicas.' },
    { icon: <Ticket className="h-6 w-6" />, title: 'Reserve sua vaga', desc: 'Garanta seu lugar com poucos cliques.' },
    { icon: <Bus className="h-6 w-6" />, title: 'Viaje com conforto', desc: 'Ônibus modernos e equipe atenciosa.' },
    { icon: <Camera className="h-6 w-6" />, title: 'Colecione momentos', desc: 'Fotos, amigos e histórias inesquecíveis.' },
  ];

  useEffect(() => {
    const fetchFeaturedDestinations = async () => {
      const { data, error } = await supabase
        .from('destinos_em_destaque')
        .select('*');

      if (error) {
        console.error('Erro ao buscar destinos em destaque:', error);
      } else {
        setFeaturedDestinations(data.map(item => ({
          title: item.name,
          location: item.location,
          image: item.image_url,
          tag: item.tag,
          description: item.description,
        })));
      }
    };
    fetchFeaturedDestinations();
  }, []);

  useEffect(() => {
    if (featuredDestinations.length === 0) return;
    const interval = setInterval(() => {
      setCurrentHighlight((i) => (i + 1) % featuredDestinations.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [featuredDestinations.length, featuredDestinations]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  };
  const daysUntil = (dateString) => {
    const now = new Date();
    const target = new Date(dateString);
    const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  const handleVideoEnded = () => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    v.play().catch(() => {});
  };

  const handleVideoResume = () => {
    const v = videoRef.current;
    if (!v) return;
    v.play().catch(() => {});
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.currentTime >= SEGMENT_SECONDS) {
      v.currentTime = 0;
      v.play().catch(() => {});
    }
  };

  const handleSelectDestination = (label) => {
    setSelectedDestination(label || null);
    const el = document.getElementById('excursoes');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const matchesLabel = (tour, label) => {
    if (!label) return true;
    const s = label.toLowerCase();
    const fields = [tour.name, tour.destination].filter(Boolean).map(x => x.toLowerCase());
    return fields.some(f => f.includes(s));
  };

  const displayedTours = selectedDestination ? tours.filter(t => matchesLabel(t, selectedDestination)) : tours;
  const sortedTours = [...displayedTours].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Encontrar a próxima excursão com vagas disponíveis para destaque
  // Se todas estiverem esgotadas, mantém a primeira como destaque (mas o botão será removido no JSX)
  const nextTour = sortedTours.find(t => t.availableSeats === null || t.availableSeats > 0) || sortedTours[0];
  const otherTours = nextTour ? sortedTours.filter(t => t.id !== nextTour.id) : sortedTours;
  
  const uniqueDestinations = Array.from(new Set(tours.map(t => t.destination).filter(Boolean)));

  return (
    <div className="w-full overflow-x-hidden text-white">
      <Navbar />

      {/* Hero Section */}
      <section id="home" className="relative min-h-screen flex items-center justify-center text-center p-4 overflow-hidden">
        {!videoError ? (
          <video
            autoPlay
            muted
            playsInline
            preload="auto"
            poster="https://images.pexels.com/photos/248797/pexels-photo-248797.jpeg?auto=compress&cs=tinysrgb&w=1920"
            onError={() => setVideoError(true)}
            onCanPlay={() => setVideoError(false)}
            onEnded={handleVideoEnded}
            onStalled={handleVideoResume}
            onWaiting={handleVideoResume}
            onPause={handleVideoResume}
            onLoadedData={handleVideoResume}
            onTimeUpdate={handleTimeUpdate}
            ref={videoRef}
            className="absolute inset-0 z-0 w-full h-full object-cover"
          >
            <source src="https://ujowugielrmzvmwqenhb.supabase.co/storage/v1/object/public/excursoes/161045-822582085_small.mp4" type="video/mp4" />
            <source src="https://cdn.coverr.co/videos/waterfall-in-the-mountains-L7iQYa4N5Y/1080p.webm" type="video/webm" />
          </video>
        ) : (
          <img
            src="https://images.pexels.com/photos/248797/pexels-photo-248797.jpeg?auto=compress&cs=tinysrgb&w=1920"
            alt=""
            className="absolute inset-0 z-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B1420]/90 via-[#0B1420]/70 to-[#0B1420]/90"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-[#1C6A8B]/20 to-transparent"></div>
        
        <div className="relative z-10">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-[#ECAE62]"
          >
            Colecionando momentos <span className="text-[#ECAE62]">😍</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-4 max-w-2xl mx-auto text-lg md:text-xl text-white/80"
          >
            Sua próxima grande aventura começa aqui. Explore destinos incríveis e crie memórias que durarão para sempre.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-8 flex flex-col sm:flex-row justify-center gap-3"
          >
            <Button size="lg" onClick={() => handleSelectDestination('')} className="w-full sm:w-auto bg-[#ECAE62] text-[#0B1420] font-bold text-lg px-8 py-6 hover:bg-[#FFD27A] hover:text-[#0B1420] transition-all duration-300 shadow-lg hover:shadow-xl ring-2 ring-[#ECAE62]/40">
              Próximas aventuras <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button asChild size="lg" className="w-full sm:w-auto bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold text-lg px-8 py-6 hover:bg-white/20">
              <RouterLink to="/meus-ingressos">Meus ingressos</RouterLink>
            </Button>
          </motion.div>
        </div>
      </section>

      <section id="estatisticas" className="py-12 px-4 bg-white/5">
        <div className="container mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <motion.div key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-4 md:p-6 text-center hover:border-[#ECAE62]/40 transition-colors"
            >
              <p className="text-3xl md:text-4xl font-extrabold text-[#ECAE62]">{s.value}</p>
              <p className="text-white/80 mt-2">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="destinos" className="py-16 sm:py-20 px-4">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold mb-4 text-center text-[#ECAE62]">Destinos em Destaque</h2>
          <p className="text-lg text-white/70 mb-8 sm:mb-12 max-w-3xl mx-auto text-center">Algumas das experiências que já realizamos e amamos compartilhar.</p>

          <div className="relative max-w-5xl mx-auto">
            {featuredDestinations.length > 0 && (
              <motion.div
                key={featuredDestinations[currentHighlight].title}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.5 }}
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 ring-1 ring-white/10"
              >
                <div className="relative">
                  <img src={featuredDestinations[currentHighlight].image} alt={featuredDestinations[currentHighlight].title} className="w-full h-64 md:h-80 lg:h-96 object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                  <div className="absolute top-4 left-4 bg-[#ECAE62]/80 text-[#123F4E] font-bold px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> {featuredDestinations[currentHighlight].tag}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                    <h3 className="text-2xl sm:text-3xl font-bold">{featuredDestinations[currentHighlight].title}</h3>
                    <p className="text-white/80 mt-1 flex items-center gap-2"><Globe2 className="h-4 w-4 text-[#ECAE62]" /> {featuredDestinations[currentHighlight].location}</p>
                    <p className="text-white/80 mt-3 max-w-2xl">{featuredDestinations[currentHighlight].description}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {featuredDestinations.length > 0 && (
              <div className="absolute inset-y-0 left-0 hidden sm:flex items-center p-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-white/10 hover:bg-white/20 text-white"
                  onClick={() => setCurrentHighlight((i) => (i - 1 + featuredDestinations.length) % featuredDestinations.length)}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </div>
            )}
            {featuredDestinations.length > 0 && (
              <div className="absolute inset-y-0 right-0 hidden sm:flex items-center p-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-white/10 hover:bg-white/20 text-white"
                  onClick={() => setCurrentHighlight((i) => (i + 1) % featuredDestinations.length)}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            )}

            <div className="mt-4 flex justify-center gap-2">
              {featuredDestinations.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentHighlight(idx)}
                  className={`w-2.5 h-2.5 rounded-full ${idx === currentHighlight ? 'bg-[#ECAE62]' : 'bg-white/30'}`}
                  aria-label={`Ir para destaque ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="diferenciais" className="py-16 sm:py-20 px-4 bg-white/5">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4 text-[#ECAE62]">Por que viajar com a IanqTour?</h2>
          <p className="text-lg text-white/70 mb-12 max-w-3xl mx-auto">Nós cuidamos de todos os detalhes para que sua única preocupação seja aproveitar cada segundo.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 text-center hover:border-[#ECAE62]/40 transition-colors hover:shadow-[0_0_30px_rgba(236,174,98,0.25)]"
              >
                <div className="inline-block bg-[#123F4E] p-4 rounded-full mb-4">{feature.icon}</div>
                <h3 className="text-2xl font-bold mb-2 text-white">{feature.title}</h3>
                <p className="text-white/80">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Tour Showcase Section */}
      <section id="excursoes" className="py-16 sm:py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-4">Próximas Aventuras</h2>
            <p className="text-lg text-white/70 mb-8 max-w-3xl mx-auto">Escolha seu destino e garanta sua vaga com conforto e segurança.</p>
          </div>

          {/* filtros removidos */}

          {nextTour && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.6 }}
              className="relative overflow-hidden rounded-2xl border border-[#ECAE62]/30 bg-white/5 shadow-[0_20px_60px_rgba(236,174,98,0.15)] mb-10"
            >
              <div className="relative">
                <div className="p-4 sm:p-6 bg-white/10 backdrop-blur-md border-b border-white/10">
                  <h3 className="text-2xl sm:text-3xl font-extrabold">{nextTour.name}</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-white/85">
                    <span className="flex items-center"><MapPin className="h-4 w-4 mr-1 text-[#ECAE62]" /> {nextTour.destination}</span>
                    <span className="flex items-center"><CalendarDays className="h-4 w-4 mr-1 text-[#ECAE62]" /> {formatDate(nextTour.date)}</span>
                  </div>
                </div>
                <img src={nextTour.image || 'https://images.unsplash.com/photo-1632178151697-fd971baa906f'} alt={nextTour.name} className="w-full h-64 md:h-96 object-cover" />
                {/* badges removidos */}
                <div className="bg-[#ECAE62] text-[#0B1420] font-bold text-center py-3 px-4">
                  {daysUntil(nextTour.date) <= 1 ? 'Último dia para reservar' : `Faltam ${daysUntil(nextTour.date)} dias`}
                  {typeof nextTour.availableSeats === 'number' ? ` • ${nextTour.availableSeats} vagas disponíveis` : ''}
                </div>
                <div className="p-4 sm:p-8">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="text-white/80">
                      {nextTour.availableSeats === 0 ? 'Vagas esgotadas' : 'Partiu viver essa experiência?'}
                    </div>
                    {(nextTour.availableSeats === null || nextTour.availableSeats > 0) && (
                      <motion.div
                        animate={{ scale: [1, 1.02, 1] }}
                        transition={{ repeat: Infinity, duration: 2.4 }}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full sm:w-auto"
                      >
                        <Button onClick={() => navigate(`/excursoes/${nextTour.id}`)} className="w-full sm:w-auto bg-gradient-to-r from-[#ECAE62] to-[#FFD27A] text-[#0B1420] font-semibold py-3 shadow-lg ring-2 ring-[#ECAE62]/40 hover:brightness-105">Quero ir</Button>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {otherTours.map((tour, index) => (
              <motion.div
                key={tour.id || index}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group relative bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-lg hover:shadow-[0_10px_40px_rgba(28,106,139,0.25)]"
              >
                <div className="relative h-36 sm:h-56">
                  <img className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt={tour.name} src={tour.image || 'https://images.unsplash.com/photo-1632178151697-fd971baa906f'} />
                  
                  {/* badges removidos */}
                </div>
                <div className="p-4 sm:p-6 text-left">
                  <h3 className="text-lg sm:text-2xl font-bold text-white mb-1 line-clamp-2">{tour.name}</h3>
                  <p className="text-white/70 mb-3 flex items-center"><MapPin className="h-4 w-4 mr-2 text-[#ECAE62]" /> {tour.destination}</p>
                  <p className="text-white/70 mb-4 flex items-center"><CalendarDays className="h-4 w-4 mr-2 text-[#ECAE62]"/> {formatDate(tour.date)}</p>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div className="text-white/80">
                      {tour.availableSeats === 0 ? 'Vagas esgotadas' : 'Vamos nessa?'}
                    </div>
                    {(tour.availableSeats === null || tour.availableSeats > 0) && (
                      <motion.div
                        animate={{ scale: [1, 1.02, 1] }}
                        transition={{ repeat: Infinity, duration: 2.4 }}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full sm:w-auto"
                      >
                        <Button onClick={() => navigate(`/excursoes/${tour.id}`)} className="w-full sm:w-auto bg-gradient-to-r from-[#ECAE62] to-[#FFD27A] text-[#0B1420] font-semibold py-3 shadow-lg ring-2 ring-[#ECAE62]/40 hover:brightness-105">Quero ir</Button>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="como-funciona" className="py-16 sm:py-20 px-4 bg-white/5">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4 text-[#ECAE62]">Como funciona</h2>
          <p className="text-lg text-white/70 mb-12 max-w-3xl mx-auto">Planeje sua viagem sem complicações. Nós te acompanhamos do início ao fim.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {steps.map((s, i) => (
              <motion.div key={s.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 hover:border-[#ECAE62]/40 transition-colors"
              >
                <div className="mx-auto mb-4 w-12 h-12 flex items-center justify-center rounded-full bg-[#ECAE62] text-[#123F4E]">
                  {s.icon}
                </div>
                <h3 className="text-xl font-bold mb-2">{s.title}</h3>
                <p className="text-white/80">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* Testimonials Section */}
      <section id="depoimentos" className="py-16 sm:py-20 px-4 bg-white/5">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4 text-[#ECAE62]">O que nossos aventureiros dizem</h2>
          <p className="text-lg text-white/70 mb-12 max-w-3xl mx-auto">A satisfação de quem viaja conosco é nossa maior recompensa.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 md:p-8 text-left"
              >
                <div className="flex items-center mb-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden mr-4 border-2 border-[#ECAE62]">
                  <img className="w-full h-full object-cover" alt={testimonial.name} src={testimonial.image} />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white">{testimonial.name}</h4>
                    <div className="flex text-[#ECAE62]">
                      <Star className="h-5 w-5 fill-current" />
                      <Star className="h-5 w-5 fill-current" />
                      <Star className="h-5 w-5 fill-current" />
                      <Star className="h-5 w-5 fill-current" />
                      <Star className="h-5 w-5 fill-current" />
                    </div>
                  </div>
                </div>
                <p className="text-white/80 italic">"{testimonial.review}"</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      

      <Footer />
      
      {/* WhatsApp Floating Button */}
      <a
        href={buildWhatsAppUrl('Olá! Quero saber mais sobre as excursões.')}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-[#25D366] hover:bg-[#128C7E] text-white p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110 flex items-center justify-center group"
        aria-label="Fale conosco no WhatsApp"
      >
        <div className="absolute right-full mr-3 bg-white text-gray-800 px-3 py-1 rounded-lg text-sm font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-md pointer-events-none">
          Fale conosco
        </div>
        <svg viewBox="0 0 24 24" className="h-8 w-8 fill-current" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
        </svg>
      </a>
    </div>
  );
};

export default LandingPage;
