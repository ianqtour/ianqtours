import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CheckCircle, Calendar, MapPin, Bus, Users, Download } from 'lucide-react';

const BookingConfirmation = ({ bookingId, excursion, bus, seats, passengers, ticketUrl, onReset }) => {
  const formatDateHour = (s) => {
    if (!s) return ''
    const d = new Date(s)
    const dateStr = d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    const hourStr = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }).format(d)
    const hourNum = Number(hourStr)
    const period = hourNum < 12 ? 'da manhã' : hourNum < 18 ? 'da tarde' : 'da noite'
    const h = String(hourNum)
    return `${dateStr} às ${h} horas ${period}`
  }
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [])
  return (
    <div className="min-h-screen p-3 md:p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full md:max-w-none"
      >
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-6 md:p-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="flex justify-center mb-6"
          >
            <div className="bg-green-500 p-4 sm:p-5 rounded-full">
              <CheckCircle className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
            </div>
          </motion.div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white text-center mb-3">
            Reserva Confirmada!
          </h1>
          <p className="text-white/70 text-center mb-6">
            Sua reserva foi confirmada com sucesso. Entraremos em contato em breve para confirmação.
          </p>

          <div className="bg-white/5 rounded-xl p-6 mb-6">
            <div className="hidden sm:flex items-center justify-between mb-4">
              <span className="text-white/70">ID da Reserva</span>
              <span className="text-white font-mono font-bold">{bookingId}</span>
            </div>
            <div className="border-t border-white/10 my-4"></div>
            
            <div className="space-y-2 sm:space-y-4">
              <div className="flex items-start">
                <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-[#ECAE62] mr-2 sm:mr-3 mt-0.5" />
                <div>
                  <p className="text-white font-semibold">{excursion.name}</p>
                  <p className="text-white/70 text-sm">{excursion.destination}</p>
                </div>
              </div>

              <div className="flex items-center">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-[#ECAE62] mr-2 sm:mr-3" />
                <span className="text-white">{formatDateHour(excursion.date)}</span>
              </div>

              <div className="flex items-center">
                <Bus className="h-4 w-4 sm:h-5 sm:w-5 text-[#ECAE62] mr-2 sm:mr-3" />
                <span className="text-white/70 mr-1">Ônibus:</span>
                <span className="text-white">{bus.identification || bus.type || bus.name}</span>
              </div>

              <div className="flex items-center">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-[#ECAE62] mr-2 sm:mr-3" />
                <span className="text-white/70 mr-1">Assento:</span>
                <span className="text-white">{seats.join(', ')}</span>
              </div>
            </div>
          </div>

          

          <div className="flex flex-col md:flex-row gap-3 md:gap-4">
            <Button
              onClick={onReset}
              className="flex-1 bg-[#ECAE62] hover:bg-[#8C641C] text-[#0B1420] text-base py-3 md:text-lg md:py-6"
            >
              Reservar novamente
            </Button>
            <Button
              variant="ghost"
              className="flex-1 bg-transparent border border-white/30 text-white hover:bg-white/10 text-base py-3 md:text-lg md:py-6"
              onClick={() => { if (ticketUrl) { window.open(ticketUrl, '_blank') } }}
              disabled={!ticketUrl}
            >
              <Download className="mr-2 h-5 w-5" />
              Baixar Ingresso
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default BookingConfirmation;