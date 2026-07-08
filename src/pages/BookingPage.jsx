import { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { DayPicker } from 'react-day-picker'
import { format, addMinutes, setHours, setMinutes, isBefore, isAfter } from 'date-fns'
import 'react-day-picker/dist/style.css'

const WORK_START = 10
const WORK_END = 20

function generateSlots(date, durationMinutes, bookedSlots) {
  const slots = []
  const now = new Date()
  let current = setMinutes(setHours(new Date(date), WORK_START), 0)
  const end = setMinutes(setHours(new Date(date), WORK_END), 0)
  while (isBefore(current, end)) {
    const slotEnd = addMinutes(current, durationMinutes)
    if (isAfter(slotEnd, end)) break
    const startStr = format(current, 'HH:mm')
    const endStr = format(slotEnd, 'HH:mm')
    const isBooked = bookedSlots.some(b => !(endStr <= b.start_time || startStr >= b.end_time))
    const isPast = isBefore(current, now)
    if (!isBooked && !isPast) slots.push({ start: startStr, end: endStr })
    current = addMinutes(current, durationMinutes)
  }
  return slots
}

const SUPABASE_URL = 'https://lwrklzearmzkxxophqja.supabase.co'

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
  const bookingRef = useRef(null)

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
        service_name: selectedService.name,
        date: format(selectedDate, 'dd/MM/yyyy'),
        start_time: selectedSlot.start,
        end_time: selectedSlot.end,
      }
    })
    setSuccess(true)
  }

  setLoading(false)
}

  if (success) return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
      <div className="text-center px-6">
        <div className="text-6xl mb-4">✂️</div>
        <h2 className="text-3xl font-bold mb-2">Το ραντεβού σου κλείστηκε!</h2>
        <p className="text-zinc-400 mt-2">Θα λάβεις email επιβεβαίωσης σύντομα.</p>
        <button onClick={() => { setSuccess(false); setStep(1); setSelectedService(null); setSelectedDate(null); setSelectedSlot(null); setForm({ name: '', email: '', phone: '' }) }}
          className="mt-6 text-sm text-amber-400 hover:text-amber-300">← Νέο ραντεβού</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-zinc-950 text-white">

      {/* Hero */}
      <div className="relative bg-zinc-900 border-b border-zinc-800 px-6 py-20 text-center overflow-hidden">
        <div className="absolute inset-0 opacity-5 bg-[repeating-linear-gradient(45deg,#d97706_0px,#d97706_1px,transparent_1px,transparent_12px)]" />
        <div className="relative z-10">
          <p className="text-amber-500 text-sm font-semibold tracking-[0.3em] uppercase mb-3">Barbershop</p>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-2">Lakata</h1>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-amber-500 mb-6">Cuts</h1>
          <p className="text-zinc-400 text-lg mb-8 max-w-sm mx-auto">Επαγγελματικό κούρεμα & φροντίδα γένιων</p>
          <button
            onClick={() => bookingRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-8 py-3 rounded-full text-lg transition-all"
          >
            Κλείσε Ραντεβού
          </button>
        </div>
      </div>

      {/* Services strip */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-6">
        <div className="max-w-2xl mx-auto flex flex-wrap justify-center gap-6">
          {services.map(s => (
            <div key={s.id} className="text-center">
              <div className="text-amber-400 font-bold text-lg">{s.price}€</div>
              <div className="text-white text-sm font-medium">{s.name}</div>
              <div className="text-zinc-500 text-xs">{s.duration_minutes} λεπτά</div>
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
          <h2 className="text-2xl font-bold text-center mb-2">Κλείσε Ραντεβού</h2>
          <p className="text-zinc-400 text-center text-sm mb-10">Επίλεξε υπηρεσία, ημερομηνία και ώρα</p>

          <div className="space-y-8">
            {/* Service */}
            <div>
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Υπηρεσία</h3>
              <div className="space-y-2">
                {services.map(s => (
                  <button key={s.id}
                    onClick={() => { setSelectedService(s); setStep(2); setSelectedDate(null); setSelectedSlot(null) }}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${selectedService?.id === s.id ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-600'}`}
                  >
                    <div className="font-medium">{s.name}</div>
                    <div className="text-sm text-zinc-400">{s.duration_minutes} λεπτά · {s.price}€</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Date */}
            {step >= 2 && selectedService && (
              <div>
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Ημερομηνία</h3>
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
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Ώρα</h3>
                {slots.length === 0
                  ? <p className="text-zinc-400 text-sm">Δεν υπάρχουν διαθέσιμες ώρες για αυτή την ημέρα.</p>
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
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Στοιχεία</h3>
                <div className="space-y-3">
                  <input type="text" placeholder="Ονοματεπώνυμο" value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500" />
                  <input type="email" placeholder="Email" value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500" />
                  <input type="tel" placeholder="Τηλέφωνο" value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500" />
                </div>
              </div>
            )}

            {/* Summary */}
            {step >= 4 && selectedSlot && form.name && form.email && (
              <div className="border border-zinc-800 rounded-lg p-4 space-y-2">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Σύνοψη</h3>
                <div className="flex justify-between text-sm"><span className="text-zinc-400">Υπηρεσία</span><span>{selectedService.name}</span></div>
                <div className="flex justify-between text-sm"><span className="text-zinc-400">Ημερομηνία</span><span>{format(selectedDate, 'dd/MM/yyyy')}</span></div>
                <div className="flex justify-between text-sm"><span className="text-zinc-400">Ώρα</span><span>{selectedSlot.start} – {selectedSlot.end}</span></div>
                <div className="flex justify-between text-sm"><span className="text-zinc-400">Τιμή</span><span className="text-amber-400 font-medium">{selectedService.price}€</span></div>
                <button onClick={handleBook} disabled={loading}
                  className="w-full mt-4 bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 rounded-lg transition-all disabled:opacity-50">
                  {loading ? 'Γίνεται κράτηση...' : 'Κλείσε Ραντεβού'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

        {/* Gallery */}
            {photos.length > 0 && (
        <div className="px-6 py-16 max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-2">Ικανοποιημένοι πελάτες</h2>
          <p className="text-zinc-400 text-center text-sm mb-8">Κάποια από τα αποτελέσματά μας</p>
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
        <p className="text-zinc-500 text-sm">© 2026</p>
      </div>

    </div>
  )
}