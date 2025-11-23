import React, { useState, useEffect } from 'react';
import UserFlow from '@/components/UserFlow';
import AdminPanel from '@/components/AdminPanel';
import AdminLogin from '@/components/AdminLogin';
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import Footer from '@/components/landing/Footer'
 

  const BookingPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(true);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        setIsAdminLoggedIn(true)
        setIsAdmin(true)
      }
    }
    init()
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const loggedIn = !!session
      setIsAdminLoggedIn(loggedIn)
      if (loggedIn) setIsAdmin(true)
    })
    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const selectedExcursion = location.state && location.state.selectedExcursion
    if (selectedExcursion) {
      setIsAdmin(false)
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }
  }, [location.state])

  const handleAdminLogin = (success) => {
    if (success) {
      setIsAdminLoggedIn(true)
    }
  }

  const handleAdminLogout = async () => {
    await supabase.auth.signOut()
    setIsAdminLoggedIn(false)
    setIsAdmin(false)
  }

  return (
    <>
      <div className="sticky top-0 z-40 bg-white/10 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-3 py-3 flex items-center justify-between">
          <RouterLink to="/" className="text-xl font-bold">
            <span className="text-[#ECAE62]">IanqTour</span>
          </RouterLink>
          
        </div>
        
      </div>
      {!isAdmin ? (
        <UserFlow onAdminClick={() => setIsAdmin(true)} initialExcursion={location.state?.selectedExcursion} />
      ) : (
        <>
          {!isAdminLoggedIn ? (
            <AdminLogin onLogin={handleAdminLogin} onBack={() => setIsAdmin(false)} />
          ) : (
            <AdminPanel onLogout={handleAdminLogout} onBack={() => navigate('/')} />
          )}
        </>
      )}
      <Footer />
    </>
  );
};

export default BookingPage;