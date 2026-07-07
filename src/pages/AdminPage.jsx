import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { format } from 'date-fns'

export default function AdminPage() {
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [appointments, setAppointments] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('appointments')

  // Blocked slot form
  const [blockDate, setBlockDate] = useState('')
  const [blockStart, setBlockStart] = useState('')
  const [blockEnd, setBlockEnd] = useState('')
  const [blockedSlots, setBlockedSlots] = useState([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    supabase.auth.onAuthStateChange((_e, session) => setSession(session))
  }, [])

  useEffect(() => {
    if (!session) return
    fetchAppointments()
    fetchServices()
    fetchBlockedSlots()
  }, [session])

  async function fetchAppointments() {
    const { data } = await supabase
      .from('appointments')
      .select('*, services(name)')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })
    setAppointments(data || [])
  }

  async function fetchServices() {
    const { data } = await supabase.from('services').select('*')
    setServices(data || [])
  }

  async function fetchBlockedSlots() {
    const { data } = await supabase
      .from('booked_slots')
      .select('*')
      .order('date', { ascending: true })
    setBlockedSlots(data || [])
  }

  async function handleLogin() {
    setLoading(true)
    setLoginError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setLoginError('Λάθος email ή password')
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  async function deleteAppointment(id) {
    await supabase.from('appointments').delete().eq('id', id)
    fetchAppointments()
  }

  async function addBlockedSlot() {
    if (!blockDate || !blockStart || !blockEnd) return
    await supabase.from('booked_slots').insert({
      date: blockDate,
      start_time: blockStart,
      end_time: blockEnd
    })
    setBlockDate('')
    setBlockStart('')
    setBlockEnd('')
    fetchBlockedSlots()
  }

  async function deleteBlockedSlot(id) {
    await supabase.from('booked_slots').delete().eq('id', id)
    fetchBlockedSlots()
  }

  // Login screen
  if (!session) return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
      <div className="w-full max-w-sm px-6">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">✂️</div>
          <h1 className="text-2xl font-bold">Lakata Panel</h1>
          <p className="text-zinc-400 text-sm mt-1">Σύνδεση διαχειριστή</p>
        </div>
        <div className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
          {loginError && <p className="text-red-400 text-sm">{loginError}</p>}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 rounded-lg transition-all disabled:opacity-50"
          >
            {loading ? 'Σύνδεση...' : 'Σύνδεση'}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">✂️ Admin Panel</h1>
        <button
          onClick={handleLogout}
          className="text-sm text-zinc-400 hover:text-white transition-colors"
        >
          Αποσύνδεση
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-800 px-6 flex gap-6">
        {['appointments', 'blocked'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            {tab === 'appointments' ? 'Ραντεβού' : 'Μπλοκαρισμένες Ώρες'}
          </button>
        ))}
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">

        {/* Appointments Tab */}
        {activeTab === 'appointments' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold">Όλα τα ραντεβού ({appointments.length})</h2>
              <button onClick={fetchAppointments} className="text-xs text-zinc-400 hover:text-white">↻ Ανανέωση</button>
            </div>
            {appointments.length === 0 && (
              <p className="text-zinc-400 text-sm">Δεν υπάρχουν ραντεβού ακόμα.</p>
            )}
            {appointments.map(a => (
              <div key={a.id} className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex justify-between items-start">
                <div>
                  <div className="font-medium">{a.client_name}</div>
                  <div className="text-sm text-zinc-400">{a.client_email}</div>
                  {a.client_phone && <div className="text-sm text-zinc-400">{a.client_phone}</div>}

                  <div className="text-sm text-amber-400 mt-1">
                    {a.date} · {a.start_time.slice(0,5)}–{a.end_time.slice(0,5)}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">{a.services?.name}</div>
                </div>
                <button
                  onClick={() => deleteAppointment(a.id)}
                  className="text-red-400 hover:text-red-300 text-sm ml-4 mt-1"
                >
                  Διαγραφή
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Blocked Slots Tab */}
        {activeTab === 'blocked' && (
          <div>
            <h2 className="font-semibold mb-4">Μπλοκάρισμα ωρών</h2>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-zinc-400 mb-3">Πρόσθεσε ώρες που δεν είσαι διαθέσιμος</p>
              <div className="space-y-3">
                <input
                  type="date"
                  value={blockDate}
                  onChange={e => setBlockDate(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Από</label>
                    <input
                      type="time"
                      value={blockStart}
                      onChange={e => setBlockStart(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Έως</label>
                    <input
                      type="time"
                      value={blockEnd}
                      onChange={e => setBlockEnd(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
                <button
                  onClick={addBlockedSlot}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-2 rounded-lg transition-all"
                >
                  Προσθήκη
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {blockedSlots.length === 0 && (
                <p className="text-zinc-400 text-sm">Δεν υπάρχουν μπλοκαρισμένες ώρες.</p>
              )}
              {blockedSlots.map(b => (
                <div key={b.id} className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium">{b.date}</div>
                    <div className="text-xs text-zinc-400">{b.start_time.slice(0,5)} – {b.end_time.slice(0,5)}</div>
                  </div>
                  <button
                    onClick={() => deleteBlockedSlot(b.id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Διαγραφή
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}