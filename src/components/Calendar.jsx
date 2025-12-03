import { useMemo, useState, useRef, useEffect } from 'react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  isSameMonth,
  isSameDay,
  format
} from 'date-fns'
import {
  getBookings,
  saveBookings,
  getSettings,
  getCurrentUser,
  id,
  isSameMinute
} from '../lib/storage'
import { useI18n } from '../lib/i18n'

function dayISO(d) {
  return new Date(d).toISOString().slice(0, 10)
}
function toDateOnly(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

const DEFAULT_SERVICES = [
  { name: 'Šukuosena', duration: 60, deposit: 50 },
  { name: 'Tresų nuoma', duration: 15, deposit: 25 },
  { name: 'Papuošalų nuoma', duration: 15, deposit: 10 },
  { name: 'Atvykimas', duration: 180, deposit: 50 },
  { name: 'Konsultacija', duration: 30, deposit: 10 }
]

const SERVICE_LABEL_KEYS = {
  'Šukuosena': 'service_hair',
  'Tresų nuoma': 'service_extensions_rent',
  'Papuošalų nuoma': 'service_jewelry_rent',
  'Atvykimas': 'service_arrival',
  'Konsultacija': 'service_consultation'
}

export default function Calendar() {
  const { t } = useI18n()
  const settings = getSettings()

  const serviceList =
    Array.isArray(settings.serviceList) && settings.serviceList.length
      ? settings.serviceList
      : DEFAULT_SERVICES

  const renderServiceName = (name) => {
    const key = SERVICE_LABEL_KEYS[name]
    return key ? t(key) : name
  }

  const [openPrices, setOpenPrices] = useState(false)

  useEffect(() => {
    const handler = () => {
      setOpenPrices(prev => !prev)
    }
    window.addEventListener('togglePrices', handler)
    return () => window.removeEventListener('togglePrices', handler)
  }, [])

  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [busy, setBusy] = useState(false)
  const [processingISO, setProcessingISO] = useState(null)
  const [bookedISO, setBookedISO] = useState([])
  const [modal, setModal] = useState(null)
  const [hoverIdx, setHoverIdx] = useState(-1)
  const touchStartX = useRef(null)

  const [pendingTime, setPendingTime] = useState(null)
  const [selectedServices, setSelectedServices] = useState([])

  // ←←← НОВОЕ: email в модалке
  const [modalEmail, setModalEmail] = useState('')

  const today = toDateOnly(new Date())
  const now = new Date()
  const minDate = today
  const maxDate = addMonths(new Date(), 24)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days = useMemo(() => {
    const arr = []
    let d = new Date(gridStart)
    while (d <= gridEnd) {
      arr.push(new Date(d))
      d = addDays(d, 1)
    }
    return arr
  }, [currentMonth, gridStart, gridEnd])

  const bookings = getBookings()

  const slotsForDay = (d) => {
    if (toDateOnly(d) < today) return []
    const [sh, sm] = settings.workStart.split(':').map(Number)
    const [eh, em] = settings.workEnd.split(':').map(Number)
    const start = new Date(d)
    start.setHours(sh, sm, 0, 0)
    const end = new Date(d)
    end.setHours(eh, em, 0, 0)
    const slots = []
    let cur = new Date(start)
    while (cur <= end) {
      slots.push(new Date(cur))
      cur = new Date(cur.getTime() + settings.slotMinutes * 60000)
    }
    const blocked = settings.blockedDates.includes(dayISO(d))
    if (blocked) return []
    if (toDateOnly(d) < minDate || toDateOnly(d) > maxDate) return []
    return slots
  }

  const isTaken = (tSel) => {
    const active = bookings.filter(
      b => b.status === 'approved' || b.status === 'pending'
    )
    const byBookings = active.some(b => {
      const bs = new Date(b.start)
      const be = new Date(b.end)
      return tSel >= bs && tSel < be
    })
    const isProc = processingISO && isSameMinute(processingISO, tSel)
    const isLocal = bookedISO.some(x => isSameMinute(x, tSel))
    return byBookings || isProc || isLocal
  }

  const isRangeFree = (start, durationMinutes) => {
    const end = new Date(start.getTime() + durationMinutes * 60000)
    const active = getBookings().filter(
      b => b.status === 'approved' || b.status === 'pending'
    )
    return !active.some(b => {
      const bs = new Date(b.start)
      const be = new Date(b.end)
      return bs < end && be > start
    })
  }

  const calcTotals = (servicesNames) => {
    let duration = 0
    let price = 0
    servicesNames.forEach(name => {
      const s = serviceList.find(x => x.name === name)
      if (!s) return
      duration += Number(s.duration) || 0
      price += Number(s.deposit) || 0
    })
    return { duration, price }
  }

  const openTimeModal = (tSel) => {
    if (
      toDateOnly(tSel) < today ||
      (isSameDay(tSel, now) && tSel < now)
    ) {
      alert(t('cannot_book_past'))
      return
    }
    const user = getCurrentUser()
    if (!user) {
      alert(t('login_or_register'))
      return
    }
    if (isTaken(tSel)) {
      alert(t('already_booked'))
      return
    }
    const endPreview = new Date(tSel)
    endPreview.setMinutes(endPreview.getMinutes() + settings.slotMinutes)

    setPendingTime(tSel)
    setSelectedServices([])
    setModalEmail(user.email || '') // ← подставляем email из профиля

    setModal({
      title: t('calendar_modal_title'),
      dateStr: format(tSel, 'dd.MM.yyyy'),
      timeStr: `${format(tSel, 'HH:mm')} – ${format(endPreview, 'HH:mm')}`,
      caption: t('calendar_modal_caption')
    })
  }

  const confirmBooking = () => {
    if (!pendingTime) return
    if (!selectedServices || selectedServices.length === 0) {
      alert(t('calendar_select_service_error'))
      return
    }
    const user = getCurrentUser()
    if (!user) {
      alert(t('login_or_register'))
      return
    }
    const start = pendingTime

    if (
      toDateOnly(start) < today ||
      (isSameDay(start, now) && start < now)
    ) {
      alert(t('cannot_book_past'))
      return
    }
    if (isTaken(start)) {
      alert(t('already_booked'))
      return
    }

    const { duration, price } = calcTotals(selectedServices)
    const durationMinutes = duration || settings.slotMinutes

    if (!isRangeFree(start, durationMinutes)) {
      alert(t('already_booked'))
      return
    }

    setBusy(true)
    setProcessingISO(new Date(start))

    const end = new Date(start.getTime() + durationMinutes * 60000)

    const newB = {
      id: id(),
      userPhone: user.phone,
      userName: user.name,
      userInstagram: user.instagram || '',
      userEmail: modalEmail || user.email || null,     // ←←← ВОТ ЭТО
      userLang: localStorage.getItem("lang") || "lt",  // ←←← И ЭТО
      start,
      end,
      status: 'pending',
      createdAt: new Date().toISOString(),
      services: selectedServices,
      durationMinutes,
      price,
      paid: false
    }

    const newLocalSlots = []
    let cur = new Date(start)
    while (cur < end) {
      newLocalSlots.push(new Date(cur))
      cur = new Date(cur.getTime() + settings.slotMinutes * 60000)
    }

    setTimeout(() => {
      const current = getBookings()
      saveBookings([...current, newB])
      setBookedISO(prev => [...prev, ...newLocalSlots])
      setBusy(false)
      setProcessingISO(null)
      setPendingTime(null)
      setSelectedServices([])
      setModalEmail('')
      setModal(null)
    }, 600)
  }

  const closeModal = () => {
    if (busy) return
    setModal(null)
    setPendingTime(null)
    setSelectedServices([])
    setModalEmail('')
  }

  const goPrev = () => {
    setCurrentMonth(m => addMonths(m, -1))
  }
  const goNext = () => {
    setCurrentMonth(m => addMonths(m, 1))
  }

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e) => {
    if (touchStartX.current == null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 50) {
      if (dx > 0) goPrev()
      else goNext()
    }
    touchStartX.current = null
  }

  const monthIndex = currentMonth.getMonth()
  const year = currentMonth.getFullYear()
  const monthLabel = t(`month_${monthIndex}`) + ' ' + year

  // ... все твои стили без изменений ...

  return (
    <>
      <style>{` ... твой весь <style> без изменений ... `}</style>

      <div className="card" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {/* KAINOS — без изменений */}
        {/* NAV — без изменений */}
        {/* GRID — без изменений */}
        {/* SLOTS — без изменений */}
      </div>

      {/* MODAL */}
      {modal && (
        <div className="calendar-modal-backdrop" onClick={closeModal}>
          <div className="calendar-modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: 10 }}>
              {modal.title}
            </h3>

            {/* ←←← НОВОЕ ПОЛЕ EMAIL */}
            <input
              type="email"
              placeholder={t('email') || "Email"}
              value={modalEmail}
              onChange={(e) => setModalEmail(e.target.value.trim())}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid rgba(168,85,247,0.45)',
                background: 'rgba(17,0,40,0.45)',
                color: '#fff',
                marginBottom: 16,
                fontSize: 15
              }}
            />

            {pendingTime && (
              <div style={{ marginTop: 8, marginBottom: 16 }}>
                <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 8 }}>
                  {t('calendar_modal_instruction')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {serviceList.map(s => (
                    <button
                      key={s.name}
                      onClick={() => {
                        setSelectedServices(prev =>
                          prev.includes(s.name)
                            ? prev.filter(x => x !== s.name)
                            : [...prev, s.name]
                        )
                      }}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 10,
                        fontSize: 15,
                        cursor: 'pointer',
                        textAlign: 'left',
                        background: selectedServices.includes(s.name)
                          ? 'rgba(150,80,255,0.35)'
                          : 'rgba(255,255,255,0.06)',
                        border: selectedServices.includes(s.name)
                          ? '1.5px solid rgba(150,80,255,0.65)'
                          : '1px solid rgba(255,255,255,0.12)',
                        color: '#fff',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: '.25s'
                      }}
                    >
                      <span>{renderServiceName(s.name)}</span>
                      <span style={{ fontSize: 13, opacity: 0.9 }}>
                        {(s.duration || 0)} min • {t('calendar_deposit')} {(s.deposit || 0)} €
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {modal.dateStr && <p style={{ margin: '6px 0', opacity: 0.9 }}>{modal.dateStr}</p>}
            {modal.timeStr && <p style={{ margin: '6px 0', fontWeight: 700 }}>{modal.timeStr}</p>}
            {modal.caption && <p style={{ margin: '6px 0', opacity: 0.95 }}>{modal.caption}</p>}

            <div style={{ marginTop: 14, textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={closeModal} style={{ borderRadius: 10, padding: '8px 14px', border: '1px solid rgba(148,163,184,0.6)', background: 'rgba(15,23,42,0.9)', color: '#e5e7eb', cursor: 'pointer' }}>
                {t('cancel')}
              </button>
              <button onClick={confirmBooking} style={{ borderRadius: 10, padding: '8px 14px', border: '1px solid rgba(168,85,247,0.45)', background: 'rgba(98,0,180,0.55)', color: '#fff', backdropFilter: 'blur(6px)', cursor: 'pointer' }}>
                {t('approve')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
