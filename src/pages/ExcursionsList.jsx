import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import ExcursionSelection from '@/components/user/ExcursionSelection'

const ExcursionsList = () => {
  const navigate = useNavigate()
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  }, [])
  const handleSelect = (excursion) => {
    navigate(`/excursoes/${excursion.id}`)
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