import React, { useState, useEffect } from 'react';
import { Link as ScrollLink } from 'react-scroll';
import { Link as RouterLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Menu, X, ArrowLeft } from 'lucide-react';

const Navbar = ({ adminBackAction, disableDesktopButtons = false, disableMobileMenu = false }) => {
  const [scrolled, setScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { to: 'home', label: 'Início' },
    { to: 'destinos', label: 'Destinos' },
    { to: 'diferenciais', label: 'Diferenciais' },
    { to: 'excursoes', label: 'Excursões' },
    { to: 'como-funciona', label: 'Como funciona' },
    { to: 'galeria', label: 'Galeria' },
    { to: 'depoimentos', label: 'Depoimentos' },
  ];

  const NavLinkComponent = ({ to, label }) => (
    <ScrollLink
      to={to}
      spy={true}
      smooth={true}
      offset={-70}
      duration={500}
      className="cursor-pointer text-white/80 hover:text-white transition-colors relative after:content-[''] after:absolute after:left-0 after:bottom-[-4px] after:w-0 after:h-[2px] after:bg-[#ECAE62] after:transition-all after:duration-300 hover:after:w-full"
      onClick={() => setIsMenuOpen(false)}
    >
      {label}
    </ScrollLink>
  );

  return (
    <motion.nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || isMenuOpen
          ? 'bg-white/10 backdrop-blur-xl border-b border-white/10 shadow-lg'
          : 'bg-[#0B1420]/30 backdrop-blur-xl'
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container mx-auto flex items-center justify-between p-4">
        <RouterLink to="/" className="flex items-center gap-2 text-2xl font-bold text-white">
          <img src="https://ujowugielrmzvmwqenhb.supabase.co/storage/v1/object/public/excursoes/logo-ianq.png" alt="IanqTour Logo" className="h-8 w-8" />
          <span className="text-[#ECAE62]">IanqTour</span>
        </RouterLink>

        <div className="hidden md:flex items-center gap-3">
          {adminBackAction && (
            <Button onClick={adminBackAction} variant="ghost" size="icon" className="text-white hover:bg-white/10" aria-label="Voltar para Admin" title="Voltar para Admin">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
        </div>

        {!disableDesktopButtons && (
          <div className={`hidden md:flex items-center gap-3 ${adminBackAction ? 'ml-2' : ''}`}>
            <Button asChild className="bg-[#ECAE62] text-[#0B1420] font-semibold hover:bg-[#FFD27A] hover:text-[#0B1420] ring-2 ring-[#ECAE62]/40 shadow-[0_0_20px_rgba(236,174,98,0.3)]">
              <RouterLink to="/excursoes">Ver Excursões</RouterLink>
            </Button>
            <Button asChild className="bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20">
              <RouterLink to="/meus-ingressos">Meus Ingressos</RouterLink>
            </Button>
            <Button asChild className="bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20">
              <RouterLink to="/admin">Área Admin</RouterLink>
            </Button>
          </div>
        )}

        <div className="md:hidden">
          {adminBackAction && (
            <Button onClick={adminBackAction} variant="ghost" size="icon" className="text-white mr-2" aria-label="Voltar para Admin" title="Voltar para Admin">
              <ArrowLeft />
            </Button>
          )}
          {!disableMobileMenu && (
            <Button onClick={() => setIsMenuOpen(!isMenuOpen)} variant="ghost" size="icon" className="text-white">
              {isMenuOpen ? <X /> : <Menu />}
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {!disableMobileMenu && isMenuOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden flex flex-col items-center space-y-6 py-6"
        >
          <Button asChild className="w-4/5 bg-[#ECAE62] text-[#0B1420] font-semibold hover:bg-[#FFD27A] hover:text-[#0B1420] ring-2 ring-[#ECAE62]/40 shadow-[0_0_20px_rgba(236,174,98,0.3)]">
            <RouterLink to="/excursoes" onClick={() => setIsMenuOpen(false)}>Ver Excursões</RouterLink>
          </Button>
          <Button asChild className="w-4/5 bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20">
            <RouterLink to="/meus-ingressos" onClick={() => setIsMenuOpen(false)}>Meus Ingressos</RouterLink>
          </Button>
          <Button asChild className="w-4/5 bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20">
            <RouterLink to="/admin" state={{ adminMode: true }} onClick={() => setIsMenuOpen(false)}>Área Admin</RouterLink>
          </Button>
        </motion.div>
      )}
    </motion.nav>
  );
};

export default Navbar;
