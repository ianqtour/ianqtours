import React from 'react';
import { Link as ScrollLink } from 'react-scroll';
import { Link as RouterLink } from 'react-router-dom';
import { Instagram, Facebook, Youtube } from 'lucide-react';

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
            <a href="#" className="hover:text-[#ECAE62] transition-colors"><Instagram /></a>
            <a href="#" className="hover:text-[#ECAE62] transition-colors"><Facebook /></a>
            <a href="#" className="hover:text-[#ECAE62] transition-colors"><Youtube /></a>
          </div>
          <h4 className="text-lg font-semibold text-white mt-6 mb-4">Contato</h4>
          <p>contato@ianqtour.com</p>
          <p>(11) 98765-4321</p>
        </div>
      </div>
      <div className="container mx-auto text-center mt-12 border-t border-white/10 pt-8">
        <p>&copy; {new Date().getFullYear()} IanqTour. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
};

export default Footer;