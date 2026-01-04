export const WHATSAPP_NUMBER = '5588994235525'

export function buildWhatsAppUrl(text) {
  const phone = String(WHATSAPP_NUMBER).replace(/\D/g, '')
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
}

