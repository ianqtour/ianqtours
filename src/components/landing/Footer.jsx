import React from 'react';
import { Link as ScrollLink } from 'react-scroll';
import { Link as RouterLink } from 'react-router-dom';
import { Instagram, Mail, Phone } from 'lucide-react';
import { buildWhatsAppUrl } from '@/lib/whatsapp';

const Footer = () => {
  return (
    <footer className="bg-gradient-to-b from-[#0B1420] to-[#123F4E] text-white/80 py-12 px-4 border-t border-white/10">
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* About */}
        <div className="md:col-span-2">
          <h3 className="text-2xl font-bold mb-4 text-[#ECAE62]">
            IanqTour
          </h3>
          <p className="max-w-md">
            Somos apaixonados por viagens e nosso objetivo é proporcionar experiências únicas e inesquecíveis. Junte-se a nós e colecione momentos incríveis pelo mundo.
          </p>
        </div>

        

        {/* Social */}
        <div>
          <h4 className="text-lg font-semibold text-white mb-4">Siga-nos</h4>
          <div className="flex space-x-4">
            <a href="https://www.instagram.com/ianqtour_excursoes" className="hover:text-[#ECAE62] transition-colors"><Instagram /></a>
          </div>
          <h4 className="text-lg font-semibold text-white mt-6 mb-4">Contato</h4>
          <div className="flex items-center gap-2 mb-2">
            <Mail className="h-5 w-5 text-[#ECAE62]" />
            <p>contato@ianqtour.com.br</p>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-[#ECAE62]" />
            <a href={buildWhatsAppUrl('Olá! Quero saber mais sobre as excursões.')} className="hover:text-[#ECAE62] transition-colors">(88) 9 9423-5525</a>
          </div>
        </div>
      </div>
      <div className="container mx-auto text-center mt-12 border-t border-white/10 pt-8">
        <p>&copy; {new Date().getFullYear()} IanqTour. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
};

export default Footer;
