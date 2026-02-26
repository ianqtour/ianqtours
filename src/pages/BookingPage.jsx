import React, { useState, useEffect, useRef } from 'react';
import UserFlow from '@/components/UserFlow';
import AdminPanel from '@/components/AdminPanel';
import AdminLogin from '@/components/AdminLogin';
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { BarChart3, MessageSquare, Sparkles, LayoutDashboard } from 'lucide-react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import Footer from '@/components/landing/Footer'
import { getUserRole } from '@/lib/authRole'


  const BookingPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(() => {
    if (location.pathname === '/admin') return true;
    if (location.state?.adminMode) return true;
    if (location.state?.selectedExcursion) return false;
    const hasSavedFlow = localStorage.getItem('user_flow_state');
    return !hasSavedFlow;
  });
  const isBookingModeRef = useRef(!isAdmin);

  useEffect(() => {
    isBookingModeRef.current = !isAdmin;
  }, [isAdmin]);

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('normal');
  

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        setIsAdminLoggedIn(true)
        
        // Se já estiver logado e houver uma rota de origem, redireciona imediatamente
        const from = location.state?.from?.pathname;
        if (from) {
          navigate(from, { replace: true });
          return;
        }

        if (location.pathname === '/admin' || location.state?.adminMode) {
          // Only force admin if not in booking mode
          if (!isBookingModeRef.current) {
             setIsAdmin(true)
          }
        } else {
          const hasSavedFlow = localStorage.getItem('user_flow_state');
          setIsAdmin(!(location.state && location.state.selectedExcursion) && !hasSavedFlow)
        }
        const role = await getUserRole()
        setUserRole(role)
      }
    }
    init()
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const loggedIn = !!session
      setIsAdminLoggedIn(loggedIn)
      if (loggedIn) {
        if (location.pathname === '/admin') {
           // Only force admin if not in booking mode
           if (!isBookingModeRef.current) {
              setIsAdmin(true)
           }
        } else {
          const hasSavedFlow = localStorage.getItem('user_flow_state');
          setIsAdmin(!(location.state && location.state.selectedExcursion) && !hasSavedFlow)
        }
        ;(async () => {
          const role = await getUserRole()
          setUserRole(role)
        })()
      }
    })
    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (location.pathname === '/admin') {
      if (!isBookingModeRef.current) {
        setIsAdmin(true)
      }
      return
    }
    if (location.state?.adminMode) {
      setIsAdmin(true)
      return
    }
    const selectedExcursion = location.state && location.state.selectedExcursion
    if (selectedExcursion) {
      setIsAdmin(false)
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }
  }, [location.state, location.pathname])

  const handleAdminLogin = (success) => {
    if (success) {
      setIsAdminLoggedIn(true)
      setIsAdmin(true)
      ;(async () => {
        const role = await getUserRole()
        setUserRole(role)
      })()
      
      // Se houver uma rota de origem (vindo de uma ProtectedRoute), redireciona de volta
      const from = location.state?.from?.pathname;
      if (from) {
        navigate(from, { replace: true });
      }
    }
  }

  const handleAdminLogout = async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' })
    } catch {}
    setIsAdminLoggedIn(false)
    setIsAdmin(false)
    navigate('/', { replace: true })
    setTimeout(() => {
      if (window.location.pathname === '/admin') {
        window.location.assign('/')
      }
    }, 50)
  }

  return (
    <>
      <div className="sticky top-0 z-40 bg-white/10 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-3 py-3 flex items-center justify-between">
          <RouterLink to="/" className="flex items-center gap-2 text-2xl font-bold text-white">
            <img src="https://ujowugielrmzvmwqenhb.supabase.co/storage/v1/object/public/excursoes/logo-ianq.png" alt="IanqTour Logo" className="h-8 w-8" />
            <span className="text-[#ECAE62]">IanqTour</span>
          </RouterLink>

          {isAdminLoggedIn && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="bg-[#25D366]/10 border-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/20 font-bold gap-2 rounded-xl transition-all active:scale-95">
                  <BarChart3 size={18} />
                  <span className="hidden sm:inline">Análise</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#020617] border-white/10 text-white max-w-md rounded-3xl overflow-hidden">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black tracking-tight text-center mb-6">
                    Centro de <span className="text-[#25D366]">Análise</span>
                  </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <button
                    onClick={() => navigate('/chat')}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-[#25D366]/10 hover:border-[#25D366]/30 transition-all group text-left"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#25D366]/20 flex items-center justify-center text-[#25D366] group-hover:scale-110 transition-transform">
                      <Sparkles size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-lg">Analisar com IA</div>
                      <div className="text-sm text-slate-400 font-medium leading-tight">Insights inteligentes e chat com o Agente Ianq.</div>
                    </div>
                  </button>

                  <button
                    onClick={() => navigate('/dash')}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-blue-500/10 hover:border-blue-500/30 transition-all group text-left"
                  >
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                      <LayoutDashboard size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-lg">Analisar Dashboard</div>
                      <div className="text-sm text-slate-400 font-medium leading-tight">Gráficos, métricas financeiras e projeção de caixa.</div>
                    </div>
                  </button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
      {!isAdmin ? (
        <UserFlow 
          onAdminClick={() => {
            localStorage.removeItem('user_flow_state');
            setIsAdmin(true);
          }} 
          initialExcursion={location.state?.selectedExcursion}
          isAdmin={userRole === 'admin'}
        />
      ) : (
        <>
          {!isAdminLoggedIn ? (
            <AdminLogin onLogin={handleAdminLogin} onBack={() => setIsAdmin(false)} />
          ) : (
            <AdminPanel
              onLogout={handleAdminLogout}
              onBack={() => navigate('/')}
              onStartReservation={() => setIsAdmin(false)}
              role={userRole}
            />
          )}
        </>
      )}
      <div className="hidden sm:block">
        <Footer />
      </div>
    </>
  );
};

export default BookingPage;
