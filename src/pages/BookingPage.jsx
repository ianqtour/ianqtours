import React, { useState, useEffect, useRef } from 'react';
import UserFlow from '@/components/UserFlow';
import AdminPanel from '@/components/AdminPanel';
import AdminLogin from '@/components/AdminLogin';
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button';
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
        </div>
      </div>
      {!isAdmin ? (
        <UserFlow 
          onAdminClick={() => {
            localStorage.removeItem('user_flow_state');
            setIsAdmin(true);
          }} 
          initialExcursion={location.state?.selectedExcursion} 
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
