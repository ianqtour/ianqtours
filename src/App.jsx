import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import LandingPage from '@/pages/LandingPage';
import BookingPage from '@/pages/BookingPage';
import ExcursionDetails from '@/pages/ExcursionDetails';
import ExcursionsList from '@/pages/ExcursionsList';
import MeusIngressos from '@/pages/MeusIngressos';
import { Toaster } from '@/components/ui/toaster';

function ScrollToTop() {
  const location = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [location.pathname])
  return null
}

function App() {
  return (
    <>
      <Helmet>
        <title>IanqTour - Colecionando Momentos</title>
        <meta name="description" content="Reserve excursões incríveis com a IanqTour. Selecione seu passeio, escolha seu assento e embarque em aventuras inesquecíveis." />
      </Helmet>
      <Router>
        <div className="min-h-screen bg-[#0B1420] bg-gradient-to-br from-[#0B1420] via-[#0E1E2E] to-[#0B1420]">
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/excursoes" element={<ExcursionsList />} />
            <Route path="/excursoes/:id" element={<ExcursionDetails />} />
            <Route path="/admin" element={<BookingPage />} />
            <Route path="/meus-ingressos" element={<MeusIngressos />} />
          </Routes>
          <Toaster />
        </div>
      </Router>
    </>
  );
}

export default App;