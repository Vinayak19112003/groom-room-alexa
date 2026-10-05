import { useEffect, useRef, useState } from 'react'

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

const SERVICES = [
  { name: 'Bath & Tidy', duration: '40 min', durationMin: 40, price: 700, priceLabel: '₹700' },
  { name: 'Full Groom', duration: '1h 15m', durationMin: 75, price: 1500, priceLabel: '₹1,500' },
  { name: 'Nail & Paw', duration: '25 min', durationMin: 25, price: 350, priceLabel: '₹350' },
  { name: 'De-matting add-on', duration: '+30 min', durationMin: 30, price: 400, priceLabel: '+₹400' },
]

const DAY_CHIPS = ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const TIME_CHIPS = ['Morning', 'Afternoon', 'Evening']
const TIME_LABELS = { morning: '10:30 AM', afternoon: '12:00 PM', evening: '4:00 PM' }

const SAMPLES = [
  'Book a full groom for Bruno next Saturday morning',
  'What slots are free on Sunday?',
  'Book a bath for Momo on Friday afternoon',
]

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const pad = (n) => String(n).padStart(2, '0')

function stamp(d = new Date()) {
  let h = d.getHours()
  const m = pad(d.getMinutes())
  const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${m} ${ap}`
}

function makeRef() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return `GR-${s}`
}

/** Next calendar date for a weekday name (0=Sun..6=Sat). If today, use today. */
function nextWeekday(name) {
  const idx = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(name.toLowerCase())
  const d = new Date()
  const delta = (idx - d.getDay() + 7) % 7
  d.setDate(d.getDate() + delta)
  return d
}

function prettyDate(d) {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function prettyDateShort(d) {
  const day = d.getDate()
  const suffix = day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'
  return `${d.toLocaleDateString('en-US', { weekday: 'long', month: 'long' })} ${day}${suffix}`
}

/** Very small NLU: intent, pet, service, day, time_of_day. */
function parseUtterance(text) {
  const t = text.toLowerCase()
  const slots = { intent: null, pet_name: null, service: null, day: null, time_of_day: null }

  if (/\b(book|appointment|schedule)\b/.test(t)) slots.intent = 'book'
  else if (/\b(free|available|slots|open)\b/.test(t)) slots.intent = 'availability'

  const pet = t.match(/\bfor\s+([a-z]+)/)
  if (pet && !['a', 'the', 'my'].includes(pet[1])) {
    slots.pet_name = pet[1][0].toUpperCase() + pet[1].slice(1)
  }

  if (t.includes('full groom')) slots.service = 'Full Groom'
  else if (t.includes('bath')) slots.service = 'Bath & Tidy'
  else if (t.includes('nail')) slots.service = 'Nail & Paw'
  else if (t.includes('de-matt') || t.includes('dematt')) slots.service = 'De-matting add-on'

  const dayMatch = t.match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/)
  if (dayMatch) slots.day = dayMatch[1][0].toUpperCase() + dayMatch[1].slice(1)

  if (t.includes('morning')) slots.time_of_day = 'morning'
  else if (t.includes('afternoon')) slots.time_of_day = 'afternoon'
  else if (t.includes('evening')) slots.time_of_day = 'evening'

  return slots
}

/* ------------------------------------------------------------------ */
/* App                                                                 */
/* ------------------------------------------------------------------ */

export default function App() {
  const [ring, setRing] = useState('idle') // idle | listening | thinking | speaking | waiting
  const [ringLabel, setRingLabel] = useState('TAP THE MIC OR PICK A PHRASE')
  const [heard, setHeard] = useState('') // live transcription
  const [quote, setQuote] = useState('') // last full utterance shown under ring
  const [alexaMsg, setAlexaMsg] = useState(null) // {title, text}
  const [chips, setChips] = useState([]) // quick replies
  const [chipKind, setChipKind] = useState(null) // 'day' | 'time' | null
  const [slots, setSlots] = useState({ intent: null, pet_name: null, service: null, day: null, time_of_day: null })
  const [booking, setBooking] = useState(null)
  const [transcript, setTranscript] = useState([]) // {from: 'YOU'|'ALEXA', text, at}
  const [modalOpen, setModalOpen] = useState(false)
  const [input, setInput] = useState('')
  const timers = useRef([])

  const later = (ms, fn) => {
    const id = setTimeout(fn, ms)
    timers.current.push(id)
    return id
  }
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const say = (from, text) => setTranscript((t) => [...t, { from, text, at: stamp() }])

  const setRingState = (s, label) => {
    setRing(s)
    setRingLabel(label)
  }

  /* ---- booking ---------------------------------------------------- */
  const completeBooking = (s) => {
    const svc = SERVICES.find((x) => x.name === s.service)
    const date = nextWeekday(s.day)
    const ref = makeRef()
    const isSat = s.day === 'Saturday'
    const b = {
      ref,
      pet: s.pet_name,
      service: s.service,
      dateLabel: `${prettyDate(date)}, ${TIME_LABELS[s.time_of_day]}`,
      duration: svc.duration,
      price: svc.priceLabel,
      deposit: isSat,
    }
    setBooking(b)
    const done = `Done! I've booked a ${s.service} for ${s.pet_name} on ${prettyDateShort(date)} at ${TIME_LABELS[s.time_of_day]}.`
    const extra = isSat ? ' Saturday bookings need a ₹200 deposit, payable at the studio.' : ''
    setAlexaMsg({ title: 'ALEXA', text: done + extra })
    say('ALEXA', done + extra)
    setRingState('idle', 'ANYTHING ELSE?')
    setQuote(`“${cap(s.service)} for ${s.pet_name}”`)
    setChips([])
    setChipKind(null)
  }

  const askDay = (s) => {
    setAlexaMsg({ title: 'ALEXA', text: "Which day works best? We're open Tuesday to Sunday." })
    say('ALEXA', "Which day works best? We're open Tuesday to Sunday.")
    setChips(DAY_CHIPS)
    setChipKind('day')
    setRingState('waiting', 'WAITING FOR YOUR ANSWER')
  }

  const askTime = (s) => {
    setAlexaMsg({ title: 'ALEXA', text: 'Would you prefer morning, afternoon, or evening?' })
    say('ALEXA', 'Would you prefer morning, afternoon, or evening?')
    setChips(TIME_CHIPS)
    setChipKind('time')
    setRingState('waiting', 'WAITING FOR YOUR ANSWER')
  }

  const continueFlow = (s) => {
    if (s.intent === 'availability') {
      const msg = s.day
        ? `On ${s.day} we're open 9:00 AM to 6:00 PM, and morning, afternoon and evening are all currently free. Want me to book one?`
        : `We're open Tuesday to Sunday, 9:00 AM to 6:00 PM, closed Mondays. Tell me a day and I'll check what's free.`
      setAlexaMsg({ title: 'ALEXA', text: msg })
      say('ALEXA', msg)
      setRingState('idle', 'ANYTHING ELSE?')
      setChips([])
      setChipKind(null)
      return
    }
    if (!s.day) return askDay(s)
    if (!s.time_of_day) return askTime(s)
    completeBooking(s)
  }

  /* ---- input handling --------------------------------------------- */
  const handleUtterance = (text) => {
    const raw = text.trim()
    if (!raw) return
    // reset turn visuals
    setBooking(null)
    setAlexaMsg(null)
    setChips([])
    setChipKind(null)
    setInput('')
    say('YOU', raw)
    setQuote('')
    setHeard('')
    setRingState('listening', 'LISTENING')
    // timed transcription
    const chars = raw.split('')
    chars.forEach((_, i) => {
      later(28 * i + 200, () => setHeard(raw.slice(0, i + 1)))
    })
    later(28 * chars.length + 500, () => {
      setRingState('thinking', 'THINKING')
      setQuote(`“${raw}”`)
    })
    later(28 * chars.length + 1400, () => {
      const s = parseUtterance(raw)
      if (!s.intent) s.intent = 'book'
      setSlots(s)
      setRingState('speaking', 'ALEXA IS SPEAKING')
      later(700, () => continueFlow(s))
    })
  }

  const handleChip = (value) => {
    if (chipKind === 'day') {
      say('YOU', value)
      const s = { ...slots, day: value }
      setSlots(s)
      setChips([])
      setChipKind(null)
      setRingState('thinking', 'THINKING')
      later(900, () => {
        setRingState('speaking', 'ALEXA IS SPEAKING')
        later(600, () => continueFlow(s))
      })
    } else if (chipKind === 'time') {
      say('YOU', value)
      const s = { ...slots, time_of_day: value.toLowerCase() }
      setSlots(s)
      setChips([])
      setChipKind(null)
      setRingState('thinking', 'THINKING')
      later(900, () => {
        setRingState('speaking', 'ALEXA IS SPEAKING')
        later(600, () => continueFlow(s))
      })
    }
  }

  const reset = () => {
    setBooking(null)
    setAlexaMsg(null)
    setChips([])
    setChipKind(null)
    setSlots({ intent: null, pet_name: null, service: null, day: null, time_of_day: null })
    setQuote('')
    setHeard('')
    setRingState('idle', 'TAP THE MIC OR PICK A PHRASE')
  }

  /* ---- render ------------------------------------------------------ */
  const slotChips = [
    slots.intent && `intent: ${slots.intent}`,
    slots.pet_name && `pet_name: ${slots.pet_name}`,
    slots.service && `service: ${slots.service}`,
    slots.day ? `day: ${prettyDateShort(nextWeekday(slots.day))}` : slots.intent ? 'day: missing' : null,
    slots.time_of_day
      ? `time_of_day: ${slots.time_of_day}`
      : slots.intent
        ? 'time_of_day: missing'
        : null,
  ].filter(Boolean)

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <div className="paw">🐾</div>
          <div>
            <div className="brand-name">Groom Room by Asha</div>
            <div className="brand-sub">Dog &amp; cat grooming · Indiranagar, Bengaluru</div>
          </div>
        </div>
        <div className="sim-badge">✨ Simulated Alexa+ experience — Amazon Developer Hackathon demo</div>
      </header>

      <main className="layout">
        <section className="stage">
          <div className={`ring ring-${ring}`}>
            <div className="ring-core">🎙</div>
          </div>
          <div className="ring-label">{ringLabel}</div>

          {ring === 'idle' && !quote && !booking && (
            <div className="idle-prompt">
              Say: <span className="hl">“Alexa, book a grooming appointment”</span>
            </div>
          )}
          {heard && <div className="heard">“{heard}<span className="caret">|</span>”</div>}
          {quote && !heard && <div className="heard static">{quote}</div>}

          {alexaMsg && (
            <div className="alexa-card">
              <div className="alexa-title">{alexaMsg.title}</div>
              <div className="alexa-text">{alexaMsg.text}</div>
              {chips.length > 0 && (
                <div className="chips">
                  {chips.map((c) => (
                    <button key={c} className="chip" onClick={() => handleChip(c)}>
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {booking && (
            <div className="confirm-card">
              <div className="confirm-head">
                <span>Booking confirmed</span>
                <span className="ref">{booking.ref}</span>
              </div>
              <div className="confirm-grid">
                <div><div className="k">Pet</div><div className="v">{booking.pet}</div></div>
                <div><div className="k">Service</div><div className="v">{booking.service}</div></div>
                <div><div className="k">Date &amp; time</div><div className="v">{booking.dateLabel}</div></div>
                <div><div className="k">Duration</div><div className="v">{booking.duration}</div></div>
                <div><div className="k">Price</div><div className="v">{booking.price}</div></div>
              </div>
              {booking.deposit && (
                <div className="deposit">Saturday booking: a ₹200 deposit is required at the studio.</div>
              )}
            </div>
          )}

          {(booking || alexaMsg) && (
            <div className="actions">
              <button className="btn primary" onClick={reset}>⟳ Book another</button>
              <button className="btn" onClick={() => setModalOpen(true)}>🗎 View transcript</button>
            </div>
          )}

          {ring === 'idle' && !alexaMsg && !booking && (
            <>
              <div className="samples">
                {SAMPLES.map((s) => (
                  <button key={s} className="sample" onClick={() => handleUtterance(s)}>
                    “{s}”
                  </button>
                ))}
              </div>
              <form
                className="speak"
                onSubmit={(e) => {
                  e.preventDefault()
                  handleUtterance(input)
                }}
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Speak (type) to Alexa..."
                />
                <button type="submit" aria-label="Send">🎙</button>
              </form>
            </>
          )}
          {(ring !== 'idle' || alexaMsg || booking) && chipKind && (
            <form
              className="speak"
              onSubmit={(e) => {
                e.preventDefault()
                handleUtterance(input)
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your answer..."
              />
              <button type="submit" aria-label="Send">🎙</button>
            </form>
          )}
        </section>

        <aside className="side">
          <div className="panel">
            <div className="panel-title">ALEXA UNDERSTOOD</div>
            {slotChips.length === 0 && <div className="muted">Slots will appear here once you speak.</div>}
            <div className="slotchips">
              {slotChips.map((c) => (
                <span key={c} className="slotchip">{c}</span>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">SESSION TRANSCRIPT</div>
            {transcript.length === 0 && <div className="muted">Nothing said yet.</div>}
            <div className="tlist">
              {transcript.map((m, i) => (
                <div key={i} className={`tmsg ${m.from === 'YOU' ? 'you' : 'alexa'}`}>
                  <div className="tmeta">{m.from} · {m.at}</div>
                  <div className="tbody">{m.text}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">SERVICES</div>
            {SERVICES.map((s) => (
              <div key={s.name} className="svc">
                <span>{s.name} <span className="muted">· {s.duration}</span></span>
                <span className="price">{s.priceLabel}</span>
              </div>
            ))}
            <div className="muted small">Tue–Sun 9:00–18:00 · Closed Monday</div>
          </div>
        </aside>
      </main>

      <footer className="foot">This is a simulation of an Alexa+ experience, built as a web app.</footer>

      {modalOpen && (
        <div className="modal-back" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <span>SESSION TRANSCRIPT</span>
              <button className="btn" onClick={() => setModalOpen(false)}>Close</button>
            </div>
            <div className="tlist big">
              {transcript.map((m, i) => (
                <div key={i} className={`tmsg ${m.from === 'YOU' ? 'you' : 'alexa'}`}>
                  <div className="tmeta">{m.from} · {m.at}</div>
                  <div className="tbody">{m.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function cap(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s
}
