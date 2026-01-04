import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LogOut, PlusCircle } from 'lucide-react';
import ExcursionManagement from '@/components/admin/ExcursionManagement';
import BusManagement from '@/components/admin/BusManagement';
import ReservationManagement from '@/components/admin/ReservationManagement';

const AdminPanel = ({ onLogout, onBack, onStartReservation, role = 'admin' }) => {
  const [tab, setTab] = React.useState(role === 'admin' ? 'excursions' : 'reservations')
  React.useEffect(() => {
    setTab(role === 'admin' ? 'excursions' : 'reservations')
  }, [role])
  const handleLogout = () => {
    onLogout();
  };

  return (
    <div className="min-h-screen p-2 sm:p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 md:p-6 lg:p-8 shadow-2xl">
          <div className="flex items-center justify-between gap-3 mb-6 md:mb-8">
            <Button
              onClick={onBack}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Voltar</span>
            </Button>
            {role === 'admin' && (
              <Button
                onClick={onStartReservation}
                size="sm"
                className="bg-[#ECAE62] hover:bg-[#8C641C] text-[#0B1420]"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Nova Reserva
              </Button>
            )}
            <Button
              onClick={handleLogout}
              size="sm"
              className="bg-red-500/80 hover:bg-red-600 text-white"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>

          <Tabs value={tab} onValueChange={setTab} className="w-full">
            {role === 'admin' ? (
              <TabsList className="grid w-full grid-cols-3 bg-white/5 mb-4 md:mb-8">
                <TabsTrigger value="excursions" className="data-[state=active]:bg-[#ECAE62] data-[state=active]:text-white text-xs sm:text-sm">
                  Excursões
                </TabsTrigger>
                <TabsTrigger value="buses" className="data-[state=active]:bg-[#ECAE62] data-[state=active]:text-white text-xs sm:text-sm">
                  Ônibus
                </TabsTrigger>
                <TabsTrigger value="reservations" className="data-[state=active]:bg-[#ECAE62] data-[state=active]:text-white text-xs sm:text-sm">
                  Reservas
                </TabsTrigger>
              </TabsList>
            ) : (
              <TabsList className="grid w-full grid-cols-1 bg-white/5 mb-4 md:mb-8">
                <TabsTrigger value="reservations" className="data-[state=active]:bg-[#ECAE62] data-[state=active]:text-white text-xs sm:text-sm">
                  Reservas
                </TabsTrigger>
              </TabsList>
            )}

            {role === 'admin' && (
              <TabsContent value="excursions">
                <ExcursionManagement />
              </TabsContent>
            )}

            {role === 'admin' && (
              <TabsContent value="buses">
                <BusManagement />
              </TabsContent>
            )}

            <TabsContent value="reservations">
              <ReservationManagement allowCancel={role === 'admin'} />
            </TabsContent>
          </Tabs>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminPanel;
