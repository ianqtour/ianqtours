import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import ExcursionSelection from '@/components/user/ExcursionSelection'
import { supabase } from '@/lib/supabase'
import { getUserRole } from '@/lib/authRole'
import { buildWhatsAppUrl } from '@/lib/whatsapp'

const ExcursionsList = () => {
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        const role = await getUserRole()
        setIsAdmin(role === 'admin')
      } else {
        setIsAdmin(false)
      }
    }
    init()
  }, [])

  const handleSelect = async (excursion) => {
    if (isAdmin) {
      navigate('/admin', { state: { selectedExcursion: excursion } })
      return
    }
    const msg = `Olá! Gostaria de informações/reserva para a excursão "${excursion.name}" em ${new Date(excursion.date).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.`
    const url = buildWhatsAppUrl(msg)
    window.open(url, '_blank')
  }
  return (
    <div className="w-full overflow-x-hidden text-white">
      <Navbar />
      <section className="pt-24 pb-12 px-4">
        <ExcursionSelection onSelect={handleSelect} />
      </section>
      <Footer />
    </div>
  )
}

export default ExcursionsList
