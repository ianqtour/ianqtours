import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Map, ShieldCheck, Star, Users, Sun, Mountain, Waves, CalendarDays, Plane, Compass, Camera, MapPin, Globe2, Bus, Ticket, ChevronLeft, ChevronRight } from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { supabase } from '@/lib/supabase';

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
      const mapped = (data || []).map((row) => ({
        id: row.id,
        name: row.nome,
        description: row.descricao,
        destination: row.destino,
        date: row.horario_partida,
        price: Number(row.preco),
        image: row.imagem_url || '',
        availableSeats: Number(row.assentos_disponiveis || 0),
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
      name: 'Ana Clara',
      review: 'A melhor viagem da minha vida! A organização da IanqTour foi impecável, e o destino era ainda mais bonito pessoalmente. Já estou planejando a próxima!',
      image: 'mulher sorrindo em uma paisagem de montanha',
    },
    {
      name: 'Bruno Martins',
      review: 'Tudo perfeito, desde o atendimento inicial até o último dia da excursão. O guia era super atencioso e o grupo muito animado. Recomendo de olhos fechados!',
      image: 'homem com mochila em uma trilha na floresta',
    },
    {
      name: 'Juliana Costa',
      review: 'Experiência fantástica! O ônibus era muito confortável e os passeios superaram minhas expectativas. A IanqTour realmente sabe como criar momentos inesquecíveis.',
      image: 'mulher tirando uma selfie em uma praia tropical',
    },
  ];

  const stats = [
    { label: 'Viajantes Felizes', value: '12k+' },
    { label: 'Destinos', value: '85+' },
    { label: 'Avaliações 5★', value: '4.9/5' },
    { label: 'Anos de Experiência', value: '8+' },
  ];

  const featuredDestinations = [
    {
      title: 'Praias Paradisíacas',
      location: 'Nordeste do Brasil',
      image: 'https://images.pexels.com/photos/457882/pexels-photo-457882.jpeg?auto=compress&cs=tinysrgb&w=1920',
      tag: 'Sol & Mar',
      description: 'Areias brancas, mar cristalino e pôr do sol inesquecível.',
    },
    {
      title: 'Chapada dos Veadeiros',
      location: 'Goiás',
      image: 'https://images.pexels.com/photos/1552212/pexels-photo-1552212.jpeg?auto=compress&cs=tinysrgb&w=1920',
      tag: 'Natureza',
      description: 'Trilhas, cânions e cachoeiras de tirar o fôlego.',
    },
    {
      title: 'Cidades Históricas',
      location: 'Minas Gerais',
      image: 'https://images.pexels.com/photos/1646172/pexels-photo-1646172.jpeg?auto=compress&cs=tinysrgb&w=1920',
      tag: 'Cultura',
      description: 'Arquitetura colonial e histórias que atravessam séculos.',
    },
    {
      title: 'Serra Gaúcha',
      location: 'Rio Grande do Sul',
      image: 'https://images.pexels.com/photos/5734655/pexels-photo-5734655.jpeg?auto=compress&cs=tinysrgb&w=1920',
      tag: 'Montanha',
      description: 'Paisagens europeias, vinhos premiados e clima acolhedor.',
    },
    {
      title: 'Foz do Iguaçu',
      location: 'Paraná',
      image: 'https://images.pexels.com/photos/338504/pexels-photo-338504.jpeg?auto=compress&cs=tinysrgb&w=1920',
      tag: 'Cachoeiras',
      description: 'A grandiosidade das cataratas em um espetáculo natural único.',
    },
    {
      title: 'Fernando de Noronha',
      location: 'Pernambuco',
      image: 'https://images.pexels.com/photos/221455/pexels-photo-221455.jpeg?auto=compress&cs=tinysrgb&w=1920',
      tag: 'Paraíso',
      description: 'Santuário de vida marinha com águas azul-turquesa.',
    },
  ];

  const steps = [
    { icon: <Compass className="h-6 w-6" />, title: 'Escolha o destino', desc: 'Descubra roteiros exclusivos e experiências únicas.' },
    { icon: <Ticket className="h-6 w-6" />, title: 'Reserve sua vaga', desc: 'Garanta seu lugar com poucos cliques.' },
    { icon: <Bus className="h-6 w-6" />, title: 'Viaje com conforto', desc: 'Ônibus modernos e equipe atenciosa.' },
    { icon: <Camera className="h-6 w-6" />, title: 'Colecione momentos', desc: 'Fotos, amigos e histórias inesquecíveis.' },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHighlight((i) => (i + 1) % featuredDestinations.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [featuredDestinations.length]);

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
  const nextTour = sortedTours[0];
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
                    <div className="text-white/80">Partiu viver essa experiência?</div>
                    <motion.div
                      animate={{ scale: [1, 1.02, 1] }}
                      transition={{ repeat: Infinity, duration: 2.4 }}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full sm:w-auto"
                    >
                      <Button onClick={() => navigate(`/excursoes/${nextTour.id}`)} className="w-full sm:w-auto bg-gradient-to-r from-[#ECAE62] to-[#FFD27A] text-[#0B1420] font-semibold py-3 shadow-lg ring-2 ring-[#ECAE62]/40 hover:brightness-105">Quero ir</Button>
                    </motion.div>
                  </div>
                  
                </div>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {sortedTours.slice(1).map((tour, index) => (
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
                    <div className="text-white/80">Vamos nessa?</div>
                    <motion.div
                      animate={{ scale: [1, 1.02, 1] }}
                      transition={{ repeat: Infinity, duration: 2.4 }}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full sm:w-auto"
                    >
                      <Button onClick={() => navigate(`/excursoes/${tour.id}`)} className="w-full sm:w-auto bg-gradient-to-r from-[#ECAE62] to-[#FFD27A] text-[#0B1420] font-semibold py-3 shadow-lg ring-2 ring-[#ECAE62]/40 hover:brightness-105">Quero ir</Button>
                    </motion.div>
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
          <h2 className="text-4xl font-bold mb-4 text-[#ECAE62]">O que nossos viajantes dizem</h2>
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
                  <img className="w-full h-full object-cover" alt={testimonial.name} src="https://images.unsplash.com/photo-1595872018818-97555653a011" />
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
    </div>
  );
};

export default LandingPage;