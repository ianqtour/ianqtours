import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, MapPin, Calendar, Bus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const SeatSelection = ({ bus, excursion, onSelect, onBack }) => {
  const [selectedSeats, setSelectedSeats] = useState([]);
  const { toast } = useToast();

  const [occupiedInfo, setOccupiedInfo] = useState(null);
  const formatBirthDisplay = (dateStr) => {
    if (!dateStr) return '-'
    const s = String(dateStr)
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (m) return `${m[3]}/${m[2]}/${m[1]}`
    const first10 = s.slice(0, 10)
    const mIso = first10.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (mIso) return `${mIso[3]}/${mIso[2]}/${mIso[1]}`
    const mBr = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (mBr) return s
    return s
  }
  const toggleSeat = (seatNumber) => {
    const seat = bus.seats.find(s => s.number === seatNumber);
    if (seat.status === 'occupied') {
      setOccupiedInfo({
        seatNumber,
        name: (seat.occupant?.name || 'Passageiro não identificado'),
        phone: (seat.occupant?.phone || ''),
        birthDate: (seat.occupant?.birthDate || '')
      });
      return;
    }
    if (selectedSeats.includes(seatNumber)) {
      setSelectedSeats([]);
    } else {
      setSelectedSeats([seatNumber]);
      setOccupiedInfo(null);
    }
  };

  const handleContinue = () => {
    if (selectedSeats.length === 0) {
      toast({
        title: "Nenhum Assento Selecionado",
        description: "Por favor, selecione pelo menos um assento.",
        variant: "destructive",
      });
      return;
    }
    onSelect(selectedSeats);
  };

  const getSeatColor = (seat) => {
    if (seat.status === 'occupied') return 'bg-red-500';
    if (selectedSeats.includes(seat.number)) return 'bg-[#ECAE62]';
    return 'bg-green-500';
  };

  const formatDateOnly = (s) => {
    if (!s) return ''
    return new Date(s).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  }

  const strip = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const t = strip(bus.type).toLowerCase()
  const isMicro = t.includes('micro') || ((bus.seats || []).length === 30)
  const isBus46 = ((bus.seats || []).length === 46) || t.includes('46')
  const seatByNumber = (n) => bus.seats.find(s => s.number === n)
  const leftRows = [[1,2],[3,4],[7,8],[11,12],[15,16],[19,20],[23,24],[27,28]]
  const rightRows = [null,[5,6],[9,10],[13,14],[17,18],[21,22],[25,26],[29,30]]
  const microRows = Array.from({ length: leftRows.length }).map((_, i) => ([
    leftRows[i][0],
    leftRows[i][1],
    'gap',
    rightRows[i] ? rightRows[i][0] : null,
    rightRows[i] ? rightRows[i][1] : null
  ]))
  const microSet = new Set([
    ...leftRows.flat(),
    ...rightRows.flat().filter(Boolean)
  ])
  const unmatched = bus.seats.filter(s => !microSet.has(s.number))
  const bus46Left = [[1,2],[5,6],[9,10],[13,14],[17,18],[21,22],[25,26],[29,30],[33,34],[37,38],[41,42],[45,46]]
  const bus46Right = [[4,3],[8,7],[12,11],[16,15],[20,19],[24,23],[28,27],[32,31],[36,35],[40,39],[44,43]]
  const bus46Max = Math.max(bus46Left.length, bus46Right.length)
  const bus46Rows = Array.from({ length: bus46Max }).map((_, i) => ([
    bus46Left[i] ? bus46Left[i][0] : null,
    bus46Left[i] ? bus46Left[i][1] : null,
    'gap',
    bus46Right[i] ? bus46Right[i][0] : null,
    bus46Right[i] ? bus46Right[i][1] : null
  ]))
  const bus46Set = new Set([
    ...bus46Left.flat(),
    ...bus46Right.flat()
  ])
  const bus46Unmatched = bus.seats.filter(s => !bus46Set.has(s.number))

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Button
          onClick={onBack}
          variant="ghost"
          className="mb-6 text-white hover:bg-white/10"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Ônibus
        </Button>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 md:p-6 mb-6"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Seleção de Assento</h2>
          <div className="text-white/80 space-y-2">
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-2 text-[#ECAE62]" />
              <span className="text-white/70 mr-1">Destino:</span>
              <span className="text-white/90 font-semibold">{excursion.destination}</span>
            </div>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-[#ECAE62]" />
              <span className="text-white/70 mr-1">Data de partida:</span>
              <span className="text-white/90 font-semibold">{formatDateOnly(excursion.date)}</span>
            </div>
            <div className="flex items-center">
              <Bus className="h-4 w-4 mr-2 text-[#ECAE62]" />
              <span className="text-white/70 mr-1">Ônibus:</span>
              <span className="text-white/90 font-semibold">{bus.type || bus.name}</span>
            </div>
          </div>
        </motion.div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 md:p-5 mb-6">
          <h3 className="text-white font-semibold text-base mb-3">Legenda</h3>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center">
              <div className="w-4 h-4 sm:w-5 sm:h-5 bg-green-500 rounded mr-2"></div>
              <span className="text-white text-sm">Disponível</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 sm:w-5 sm:h-5 bg-red-500 rounded mr-2"></div>
              <span className="text-white text-sm">Ocupado</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 sm:w-5 sm:h-5 bg-[#ECAE62] rounded mr-2"></div>
              <span className="text-white text-sm">Selecionado</span>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 md:p-8 mb-6">
          {/* Bus front indicator */}
          <div className="bg-[#848C7C] text-white text-center py-3 rounded-lg mb-8 font-semibold">
            FRENTE DO ÔNIBUS
          </div>

          <div className="space-y-3 sm:space-y-4">
            {isMicro ? (
              microRows.map((nums, idx) => (
                <div key={idx} className="flex justify-center gap-3 sm:gap-4">
                  {nums.map((num, i) => (
                    num === 'gap' ? (
                      <div key={`gap-${idx}-${i}`} className="w-10 sm:w-16" />
                    ) : (
                      (() => {
                        const seat = seatByNumber(num)
                        if (!seat) return <div key={`empty-${idx}-${i}-${num ?? 'none'}`} className="w-12 h-12 sm:w-16 sm:h-16" />
                        return (
                          <motion.button
                            key={seat.number}
                            whileHover={{ scale: seat.status === 'occupied' ? 1.02 : 1.1 }}
                            whileTap={{ scale: seat.status === 'occupied' ? 1 : 0.95 }}
                            onClick={() => toggleSeat(seat.number)}
                            className={`w-12 h-12 sm:w-16 sm:h-16 rounded-lg flex items-center justify-center font-bold text-white transition-all duration-200 ${getSeatColor(seat)} ${
                              seat.status === 'occupied' ? 'cursor-help opacity-80' : 'cursor-pointer hover:shadow-lg'
                            }`}
                          title={seat.status === 'occupied' ? (seat.occupant?.name ? `Ocupado por ${seat.occupant.name}` : 'Ocupado') : 'Disponível'}
                          >
                            {seat.number}
                          </motion.button>
                        )
                      })()
                    )
                  ))}
                </div>
              ))
            ) : isBus46 ? (
              <>
                {bus46Rows.map((nums, idx) => (
                  <div key={`b46-${idx}`} className="flex justify-center gap-3 sm:gap-4">
                    {nums.map((num, i) => (
                    num === 'gap' ? (
                      <div key={`gap46-${idx}-${i}`} className="w-10 sm:w-16" />
                    ) : (
                      (() => {
                        const seat = seatByNumber(num)
                        if (!seat) return <div key={`empty46-${idx}-${i}-${num ?? 'none'}`} className="w-12 h-12 sm:w-16 sm:h-16" />
                        return (
                          <motion.button
                            key={seat.number}
                            whileHover={{ scale: seat.status === 'occupied' ? 1.02 : 1.1 }}
                            whileTap={{ scale: seat.status === 'occupied' ? 1 : 0.95 }}
                              onClick={() => toggleSeat(seat.number)}
                              className={`w-12 h-12 sm:w-16 sm:h-16 rounded-lg flex items-center justify-center font-bold text-white transition-all duration-200 ${getSeatColor(seat)} ${
                                seat.status === 'occupied' ? 'cursor-help opacity-80' : 'cursor-pointer hover:shadow-lg'
                              }`}
                              title={seat.status === 'occupied' ? (seat.occupant?.name ? `Ocupado por ${seat.occupant.name}` : 'Ocupado') : 'Disponível'}
                            >
                              {seat.number}
                            </motion.button>
                          )
                        })()
                      )
                    ))}
                  </div>
                ))}
                {bus46Unmatched.length > 0 && (
                  (() => {
                    const seatsPerRow = 4
                    const rows = []
                    for (let i = 0; i < bus46Unmatched.length; i += seatsPerRow) {
                      rows.push(bus46Unmatched.slice(i, i + seatsPerRow))
                    }
                    return rows.map((row, rowIndex) => (
                      <div key={`b46-unmatched-${rowIndex}`} className="flex justify-center gap-3 sm:gap-4">
                        {row.map((seat, seatIndex) => (
                          <React.Fragment key={`b46-un-${seat.number}`}>
                            <motion.button
                              whileHover={{ scale: seat.status === 'occupied' ? 1.02 : 1.1 }}
                            whileTap={{ scale: seat.status === 'occupied' ? 1 : 0.95 }}
                            onClick={() => toggleSeat(seat.number)}
                            className={`w-12 h-12 sm:w-16 sm:h-16 rounded-lg flex items-center justify-center font-bold text-white transition-all duration-200 ${getSeatColor(seat)} ${
                              seat.status === 'occupied' ? 'cursor-help opacity-80' : 'cursor-pointer hover:shadow-lg'
                            }`}
                            title={seat.status === 'occupied' ? (seat.occupant?.name ? `Ocupado por ${seat.occupant.name}` : 'Ocupado') : 'Disponível'}
                          >
                              {seat.number}
                            </motion.button>
                            {seatIndex === 1 && <div className="w-6 sm:w-8" />}
                          </React.Fragment>
                        ))}
                      </div>
                    ))
                  })()
                )}
              </>
            ) : (
              (() => {
                const seatsPerRow = 4
                const rows = []
                for (let i = 0; i < bus.seats.length; i += seatsPerRow) {
                  rows.push(bus.seats.slice(i, i + seatsPerRow))
                }
                return rows.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex justify-center gap-3 sm:gap-4">
                    {row.map((seat, seatIndex) => (
                      <React.Fragment key={seat.number}>
                        <motion.button
                          whileHover={{ scale: seat.status === 'occupied' ? 1.02 : 1.1 }}
                          whileTap={{ scale: seat.status === 'occupied' ? 1 : 0.95 }}
                          onClick={() => toggleSeat(seat.number)}
                          className={`w-12 h-12 sm:w-16 sm:h-16 rounded-lg flex items-center justify-center font-bold text-white transition-all duration-200 ${getSeatColor(seat)} ${
                            seat.status === 'occupied' ? 'cursor-help opacity-80' : 'cursor-pointer hover:shadow-lg'
                          }`}
                          title={seat.status === 'occupied' ? (seat.occupant?.name ? `Ocupado por ${seat.occupant.name}` : 'Ocupado') : 'Disponível'}
                        >
                          {seat.number}
                        </motion.button>
                        {seatIndex === 1 && <div className="w-6 sm:w-8" />}
                      </React.Fragment>
                    ))}
                  </div>
                ))
              })()
            )}
            {isMicro && unmatched.length > 0 && (
              (() => {
                const seatsPerRow = 4
                const rows = []
                for (let i = 0; i < unmatched.length; i += seatsPerRow) {
                  rows.push(unmatched.slice(i, i + seatsPerRow))
                }
                return rows.map((row, rowIndex) => (
                  <div key={`unmatched-${rowIndex}`} className="flex justify-center gap-3 sm:gap-4">
                    {row.map((seat, seatIndex) => (
                      <React.Fragment key={`un-${seat.number}`}>
                        <motion.button
                          whileHover={{ scale: seat.status === 'occupied' ? 1.02 : 1.1 }}
                          whileTap={{ scale: seat.status === 'occupied' ? 1 : 0.95 }}
                          onClick={() => toggleSeat(seat.number)}
                          className={`w-12 h-12 sm:w-16 sm:h-16 rounded-lg flex items-center justify-center font-bold text-white transition-all duration-200 ${getSeatColor(seat)} ${
                            seat.status === 'occupied' ? 'cursor-help opacity-80' : 'cursor-pointer hover:shadow-lg'
                          }`}
                        >
                          {seat.number}
                        </motion.button>
                        {seatIndex === 1 && <div className="w-6 sm:w-8" />}
                      </React.Fragment>
                    ))}
                  </div>
                ))
              })()
            )}
          </div>
        </div>

        <Dialog open={!!occupiedInfo} onOpenChange={(v) => { if (!v) setOccupiedInfo(null) }}>
          <DialogContent className="bg-[#0F172A] text-white">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">Assento Ocupado</DialogTitle>
              <DialogDescription className="text-white/80 text-sm">
                Informações do passageiro
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <div>Assento: <span className="font-semibold">{occupiedInfo?.seatNumber}</span></div>
              <div>Nome: <span className="font-semibold">{occupiedInfo?.name || '-'}</span></div>
              <div>Telefone: <span className="font-semibold">{occupiedInfo?.phone || '-'}</span></div>
              <div>Nascimento: <span className="font-semibold">{formatBirthDisplay(occupiedInfo?.birthDate)}</span></div>
            </div>
            <DialogFooter>
              <Button onClick={() => setOccupiedInfo(null)} className="bg-white text-[#0F172A] hover:bg-gray-100">
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button
          onClick={handleContinue}
          disabled={selectedSeats.length === 0}
          className="w-full bg-[#ECAE62] hover:bg-[#8C641C] text-white text-lg py-6 disabled:opacity-50"
        >
          Continuar
        </Button>
      </div>
    </div>
  );
};

export default SeatSelection;
