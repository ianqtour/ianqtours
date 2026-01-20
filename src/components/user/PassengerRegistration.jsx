import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, User, Shuffle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const PassengerRegistration = ({ seats, onSubmit, onBack, initialCpf }) => {
  const [passengers, setPassengers] = useState(
    seats.map(seat => ({
      seatNumber: seat,
      name: '',
      cpf: initialCpf || '',
      birthDate: '',
      phone: ''
    }))
  );
  const { toast } = useToast();

  const formatCpf = (v) => {
    const digits = String(v).replace(/\D/g, '').slice(0, 11)
    const p1 = digits.slice(0, 3)
    const p2 = digits.slice(3, 6)
    const p3 = digits.slice(6, 9)
    const p4 = digits.slice(9, 11)
    let out = ''
    if (p1) out = p1
    if (p2) out = `${out}.${p2}`
    if (p3) out = `${out}.${p3}`
    if (p4) out = `${out}-${p4}`
    return out
  }
  const validateCpf = (v) => {
    const cpf = String(v).replace(/\D/g, '')
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
    let sum = 0
    for (let i = 0; i < 9; i++) sum += parseInt(cpf.charAt(i)) * (10 - i)
    let d1 = (sum * 10) % 11
    if (d1 === 10) d1 = 0
    if (d1 !== parseInt(cpf.charAt(9))) return false
    sum = 0
    for (let i = 0; i < 10; i++) sum += parseInt(cpf.charAt(i)) * (11 - i)
    let d2 = (sum * 10) % 11
    if (d2 === 10) d2 = 0
    return d2 === parseInt(cpf.charAt(10))
  }
  const formatPhone = (v) => {
    const digits = String(v).replace(/\D/g, '').slice(0, 11)
    const ddd = digits.slice(0, 2)
    const first = digits.slice(2, 3)
    const mid = digits.slice(3, 7)
    const end = digits.slice(7, 11)
    let out = ''
    if (ddd) out = `(${ddd})`
    if (first) out = `${out} ${first}`
    if (mid) out = `${out} ${mid}`
    if (end) out = `${out}-${end}`
    return out.trim()
  }
  const formatBirthDate = (v) => {
    const digits = String(v).replace(/\D/g, '').slice(0, 8)
    const d = digits.slice(0, 2)
    const m = digits.slice(2, 4)
    const y = digits.slice(4, 8)
    let out = ''
    if (d) out = d
    if (m) out = `${out}/${m}`
    if (y) out = `${out}/${y}`
    return out
  }
  const validateBirthDate = (v) => {
    const parts = String(v).split('/')
    if (parts.length !== 3) return false
    const d = Number(parts[0])
    const m = Number(parts[1])
    const y = Number(parts[2])
    if ([d, m, y].some(n => Number.isNaN(n))) return false
    if (y < 1900 || m < 1 || m > 12 || d < 1 || d > 31) return false
    const dt = new Date(y, m - 1, d)
    return dt.getFullYear() === y && (dt.getMonth() + 1) === m && dt.getDate() === d
  }
  const generateRandomCpf = () => {
    const rnd = (n) => Math.round(Math.random() * n);
    const mod = (base, div) => Math.round(base - (Math.floor(base / div) * div));
    const n = Array(9).fill(0).map(() => rnd(9));
    let d1 = n.reduce((acc, val, i) => acc + val * (10 - i), 0);
    d1 = 11 - mod(d1, 11);
    if (d1 >= 10) d1 = 0;
    let d2 = n.reduce((acc, val, i) => acc + val * (11 - i), 0) + d1 * 2;
    d2 = 11 - mod(d2, 11);
    if (d2 >= 10) d2 = 0;
    const cpf = [...n, d1, d2].join('');
    return formatCpf(cpf);
  };

  const handleInputChange = (index, field, value) => {
    const updated = [...passengers];
    if (field === 'name') {
      updated[index][field] = String(value).toUpperCase();
    } else if (field === 'cpf') {
      updated[index][field] = formatCpf(value);
    } else if (field === 'phone') {
      updated[index][field] = formatPhone(value);
    } else if (field === 'birthDate') {
      updated[index][field] = formatBirthDate(value);
    } else {
      updated[index][field] = value;
    }
    setPassengers(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const incomplete = passengers.find(p => !p.name || !p.cpf || !validateCpf(p.cpf) || !validateBirthDate(p.birthDate) || !p.phone);
    if (incomplete) {
      toast({
        title: "Informação Incompleta",
        description: "Preencha todos os campos corretamente (CPF válido).",
        variant: "destructive",
      });
      return;
    }

    onSubmit(passengers);
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Button
          onClick={onBack}
          variant="ghost"
          className="mb-6 text-white hover:bg-white/10"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Seleção de Assentos
        </Button>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 md:p-6 mb-8"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Cadastro de Passageiros</h2>
          <p className="text-white/70">Por favor, forneça as informações para todos os passageiros</p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {passengers.map((passenger, index) => (
            <motion.div
              key={passenger.seatNumber}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 md:p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white flex items-center">
                  <User className="mr-2 h-5 w-5 text-[#ECAE62]" />
                  Passageiro {index + 1} - Assento {passenger.seatNumber}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor={`name-${index}`} className="text-white">Nome Completo</Label>
                  <Input
                    id={`name-${index}`}
                    value={passenger.name}
                    onChange={(e) => handleInputChange(index, 'name', e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    placeholder="JOÃO DA SILVA"
                    spellCheck={false}
                    lang="pt-BR"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`cpf-${index}`} className="text-white">CPF</Label>
                    <button
                      type="button"
                      onClick={() => handleInputChange(index, 'cpf', generateRandomCpf())}
                      className="text-[#ECAE62] hover:text-[#FFD27A] transition-colors p-1"
                      title="Gerar CPF Aleatório"
                    >
                      <Shuffle className="h-4 w-4" />
                    </button>
                  </div>
                  <Input
                    id={`cpf-${index}`}
                    value={passenger.cpf}
                    onChange={(e) => handleInputChange(index, 'cpf', e.target.value)}
                    className={`bg-white/10 border ${((passenger.cpf || '').replace(/\D/g, '').length === 11 && !validateCpf(passenger.cpf)) ? 'border-red-500' : 'border-white/20'} text-white placeholder:text-white/50`}
                    placeholder="000.000.000-00"
                    spellCheck={false}
                    lang="pt-BR"
                    required
                  />
                  {((passenger.cpf || '').replace(/\D/g, '').length === 11 && !validateCpf(passenger.cpf)) && (
                    <p className="text-red-400 text-xs">CPF inválido</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`phone-${index}`} className="text-white">Telefone</Label>
                  <Input
                    id={`phone-${index}`}
                    type="tel"
                    value={passenger.phone}
                    onChange={(e) => handleInputChange(index, 'phone', e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    placeholder="(11) 9 8765-4321"
                    spellCheck={false}
                    lang="pt-BR"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`birth-${index}`} className="text-white">Data de Nascimento</Label>
                  <Input
                    id={`birth-${index}`}
                    type="text"
                    value={passenger.birthDate}
                    onChange={(e) => handleInputChange(index, 'birthDate', e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    placeholder="dd/mm/yyyy"
                    required
                  />
                </div>

              </div>
            </motion.div>
          ))}

          <Button
            type="submit"
            className="w-full bg-[#ECAE62] hover:bg-[#8C641C] text-white text-lg py-6"
          >
            Completar Reserva
          </Button>
        </form>

      </div>
    </div>
  );
};

export default PassengerRegistration;
