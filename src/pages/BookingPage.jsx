import { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { DayPicker } from 'react-day-picker'
import { format, addMinutes, setHours, setMinutes, isBefore, isAfter } from 'date-fns'
import 'react-day-picker/dist/style.css'
import { Turnstile } from '@marsidev/react-turnstile'
import { translations } from '../i18n'


const WORK_START_1 = 9
const WORK_END_1 = 13
const WORK_START_2 = 15
const WORK_END_2 = 19
const SUPABASE_URL = 'https://lwrklzearmzkxxophqja.supabase.co'

function generateSlots(date, durationMinutes, bookedSlots) {
  const slots = []
  const now = new Date()

  const periods = [
    {start: WORK_START_1, end: WORK_END_1},
    {start: WORK_START_2, end: WORK_END_2},
  ]

  for(const period of periods) {
    let current = setMinutes(setHours(new Date(date), period.start), 0)
    const end = setMinutes(setHours(new Date(date), period.end), 0)

    while (isBefore(current, end)) {
      const slotEnd = addMinutes(current, durationMinutes)
      if (isAfter(slotEnd, end)) break
      const startStr = format(current, 'HH:mm')
      const endStr = format(slotEnd, 'HH:mm')
      const isBooked = bookedSlots.some(b => {
       const bookedStart = b.start_time.slice(0, 5)
       const bookedEnd = b.end_time.slice(0, 5)
       return startStr < bookedEnd && endStr > bookedStart
      })
      const isPast = isBefore(current, now)
      if (!isBooked && !isPast) slots.push({start: startStr, end: endStr})
      current = addMinutes(current, 15)
    }
  }
  return slots
}


export default function BookingPage() {
  const [services, setServices] = useState([])
  const [selectedService, setSelectedService] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [slots, setSlots] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [photos, setPhotos] = useState([])
  const [lightbox, setLightbox] = useState(null)
  const [captchaToken, setCaptchaToken] = useState(null)
  const bookingRef = useRef(null)
  const [lang, setLang] = useState('el')
  const t = translations[lang]

  useEffect(() => {
    supabase.from('services').select('*').then(({ data }) => setServices(data || []))
    supabase.storage.from('gallery').list('', { limit: 50 }).then(({ data }) => {
      if (data) setPhotos(data.filter(f => f.name !== '.emptyFolderPlaceholder'))
    })
  }, [])

  useEffect(() => {
    if (!selectedDate || !selectedService) return
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    supabase.from('appointments').select('start_time, end_time').eq('date', dateStr).then(({ data }) => {
      setSlots(generateSlots(selectedDate, selectedService.duration_minutes, data || []))
    })
  }, [selectedDate, selectedService])

  async function handleBook() {
    setLoading(true)
    const { error } = await supabase.from('appointments').insert({
      service_id: selectedService.id,
      client_name: form.name,
      client_email: form.email,
      client_phone: form.phone,
      date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: selectedSlot.start,
      end_time: selectedSlot.end,
      status: 'confirmed'
    })
    setLoading(false)
    if (!error) {
    // Στείλε confirmation email
    await supabase.functions.invoke('send-confirmation', {
      body: {
        client_name: form.name,
        client_email: form.email,
        client_phone: form.phone,
        service_name: lang === 'en' ? selectedService.name_en : selectedService.name,
        date: format(selectedDate, 'dd/MM/yyyy'),
        start_time: selectedSlot.start,
        end_time: selectedSlot.end,
        lang: lang
      }
    })
    setSuccess(true)
  }

  setLoading(false)
}

  if (success) {
    const eventTitle = encodeURIComponent(`✂️ Lakata Cuts - ${selectedService.name}`)
    const eventDate = format(selectedDate, 'yyyyMMdd')
    const startTime = selectedSlot.start.replace(':', '')
    const endTime = selectedSlot.end.replace(':', '')
    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${eventDate}T${startTime}00/${eventDate}T${endTime}00&details=Lakata+Cuts+Barbershop`
    const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:✂️ Lakata Cuts - ${selectedService.name}\nDTSTART:${eventDate}T${startTime}00\nDTEND:${eventDate}T${endTime}00\nDESCRIPTION:Lakata Cuts Barbershop\nEND:VEVENT\nEND:VCALENDAR`
    const icsUrl = `data:text/calendar;charset=utf8,${encodeURIComponent(icsContent)}`

    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center px-6 max-w-sm">
          <div className="text-6xl mb-4">✂️</div>
          <h2 className="text-3xl font-bold mb-2">{t.success_title}</h2>
          <p className="text-zinc-400 mt-2 mb-8">{t.success_subtitle}</p>
          <div className="space-y-3 mb-8">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">{t.add_to_calendar}</p>
            <a href={googleUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-lg transition-all">
              <span>📅</span> Google Calendar
            </a>
            <a href={icsUrl} download="lakata-cuts-appointment.ics" className="flex items-center justify-center gap-2 w-full bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-lg transition-all">
              <span>🍎</span> Apple Calendar
            </a>
          </div>
          <button
            onClick={() => {
              setSuccess(false)
              setStep(1)
              setSelectedService(null)
              setSelectedDate(null)
              setSelectedSlot(null)
              setForm({ name: '', email: '', phone: '' })
              setCaptchaToken(null)
            }}
            className="text-sm text-amber-400 hover:text-amber-300"
          >
            ← {t.new_appointment}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">

      {/* Hero */}
      <div className="relative bg-zinc-900 border-b border-zinc-800 px-6 py-20 text-center overflow-hidden">
        <div className="absolute inset-0 opacity-5 bg-[repeating-linear-gradient(45deg,#d97706_0px,#d97706_1px,transparent_1px,transparent_12px)]" />
        <div className="relative z-10">
          <p className="text-amber-500 text-sm font-semibold tracking-[0.3em] uppercase mb-3">Barbershop</p>
          <div className="absolute top-4 right-4 flex gap-2">
    <button
        onClick={() => setLang('el')}
        className={`text-xs px-3 py-1 rounded-full font-semibold transition-all ${lang === 'el' ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
    >
    ΕΛ
  </button>
  <button
    onClick={() => setLang('en')}
    className={`text-xs px-3 py-1 rounded-full font-semibold transition-all ${lang === 'en' ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
  >
    EN
  </button>
</div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-2">Lakata</h1>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-amber-500 mb-6">Cuts</h1>
          <p className="text-zinc-400 text-lg mb-8 max-w-sm mx-auto">{t.hero_subtitle}</p>
          <button
            onClick={() => bookingRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-8 py-3 rounded-full text-lg transition-all"
          >
            {t.book_cta}
          </button>
        </div>
      </div>

      {/* Services strip */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-6">
        <div className="max-w-2xl mx-auto flex flex-wrap justify-center gap-6">
          {services.map(s => (
            <div key={s.id} className="text-center">
              <div className="text-amber-400 font-bold text-lg">{s.price}€</div>
              <div className="text-white text-sm font-medium">{lang === 'en' ? s.name_en : s.name}</div>
              <div className="text-zinc-500 text-xs">{s.duration_minutes} {t.minutes}</div>
            </div>
          ))}
        </div>
      </div>

      

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
        >
          <img src={lightbox} alt="" className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg" />
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-6 text-white text-3xl">×</button>
        </div>
      )}

      {/* Booking */}
      <div ref={bookingRef} className="bg-zinc-900 border-t border-zinc-800 px-6 py-16">
        <div className="max-w-lg mx-auto">
          <h2 className="text-2xl font-bold text-center mb-2">{t.booking_title}</h2>
          <p className="text-zinc-400 text-center text-sm mb-10">{t.booking_subtitle}</p>

          <div className="space-y-8">
            {/* Service */}
            <div>
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">{t.service}</h3>
              <div className="space-y-2">
                {services.map(s => (
                  <button key={s.id}
                    onClick={() => { setSelectedService(s); setStep(2); setSelectedDate(null); setSelectedSlot(null) }}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${selectedService?.id === s.id ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-600'}`}
                  >
                    <div className="font-medium">{lang === 'en' ? s.name_en : s.name}</div>
                    <div className="text-sm text-zinc-400">{s.duration_minutes} {t.minutes} · {s.price}€</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Date */}
            {step >= 2 && selectedService && (
              <div>
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">{t.date}</h3>
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 flex justify-center">
                  <DayPicker
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => { setSelectedDate(d); setStep(3); setSelectedSlot(null) }}
                    disabled={{ before: new Date() }}
                  />
                </div>
              </div>
            )}

            {/* Time */}
            {step >= 3 && selectedDate && (
              <div>
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">{t.time}</h3>
                {slots.length === 0
                  ? <p className="text-zinc-400 text-sm">{t.no_slots}</p>
                  : <div className="grid grid-cols-3 gap-2">
                    {slots.map(slot => (
                      <button key={slot.start}
                        onClick={() => { setSelectedSlot(slot); setStep(4) }}
                        className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${selectedSlot?.start === slot.start ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-600'}`}
                      >
                        {slot.start}
                      </button>
                    ))}
                  </div>
                }
              </div>
            )}

            {/* Details */}
            {step >= 4 && selectedSlot && (
              <div>
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">{t.details}</h3>
                <div className="space-y-3">
                  <input type="text" placeholder={t.name_placeholder} value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500" />
                  <input type="email" placeholder="Email" value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500" />
                  <input type="tel" placeholder={t.phone_placeholder} value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500" />
                </div>
              </div>
            )}

            {/* Summary */}
            {step >= 4 && selectedSlot && form.name && form.email && (
              <div className="border border-zinc-800 rounded-lg p-4 space-y-2">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">{t.summary}</h3>
                <div className="flex justify-between text-sm"><span className="text-zinc-400">{t.service}</span><span>{lang === 'en' ? selectedService.name_en : selectedService.name}</span></div>
                <div className="flex justify-between text-sm"><span className="text-zinc-400">{t.date}</span><span>{format(selectedDate, 'dd/MM/yyyy')}</span></div>
                <div className="flex justify-between text-sm"><span className="text-zinc-400">{t.time}</span><span>{selectedSlot.start} – {selectedSlot.end}</span></div>
                <div className="flex justify-between text-sm"><span className="text-zinc-400">{t.price}</span><span className="text-amber-400 font-medium">{selectedService.price}€</span></div>
                <Turnstile
                    siteKey="0x4AAAAAADz8D70cBbjco79X"
                    onSuccess={(token) => setCaptchaToken(token)}
                    onExpire={() => setCaptchaToken(null)}
                    options={{ theme: 'dark' }}
                />
                <button 
                    onClick={handleBook} 
                    disabled={loading || !captchaToken}
                  className="w-full mt-4 bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 rounded-lg transition-all disabled:opacity-50">
                  {loading ? t.booking_loading : t.book_button}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

        {/* Gallery */}
            {photos.length > 0 && (
        <div className="px-6 py-16 max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-2">{t.gallery_title}</h2>
          <p className="text-zinc-400 text-center text-sm mb-8">{t.gallery_subtitle}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map(photo => (
              <div
                key={photo.name}
                onClick={() => setLightbox(`${SUPABASE_URL}/storage/v1/object/public/gallery/${photo.name}`)}
                className="aspect-square overflow-hidden rounded-lg cursor-pointer group"
              >
                <img
                  src={`${SUPABASE_URL}/storage/v1/object/public/gallery/${photo.name}`}
                  alt="Lakata Cuts"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Footer */}
<div className="border-t border-zinc-800 px-6 py-8 text-center">
  <p className="text-amber-500 font-bold text-lg mb-1">Lakata Cuts</p>

    <a href="https://www.instagram.com/lakata.cuts"
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-2 text-zinc-400 hover:text-amber-400 transition-colors text-sm mb-3"
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
    @lakata.cuts
  </a>
  <p className="text-zinc-500 text-sm">© 2026</p>
</div>
    </div>
  )
}