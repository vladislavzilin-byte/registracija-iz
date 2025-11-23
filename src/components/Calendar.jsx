import { useMemo, useState, useRef, useEffect } from 'react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, isSameMonth, isSameDay, format
} from 'date-fns'
import {
  getBookings, saveBookings, getSettings,
  getCurrentUser, id, isSameMinute
} from '../lib/storage'
import { useI18n } from '../lib/i18n'

function dayISO(d){ return new Date(d).toISOString().slice(0,10) }
function toDateOnly(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()) }

// дефолтные услуги на случай, если в settings ещё нет serviceList
const DEFAULT_SERVICES = [
  { name: 'Šukuosena', duration: 60, deposit: 50 },
  { name: 'Tresų nuoma', duration: 15, deposit: 25 },
  { name: 'Papuošalų nuoma', duration: 15, deposit: 10 },
  { name: 'Atvykimas', duration: 180, deposit: 50 },
  { name: 'Konsultacija', duration: 30, deposit: 10 }
]

export default function Calendar(){
  const { t } = useI18n()
  const settings = getSettings()

  // список услуг из настроек
  const serviceList =
    Array.isArray(settings.serviceList) && settings.serviceList.length
      ? settings.serviceList
      : DEFAULT_SERVICES

  // -------------------------
  // KAINAS — accordion state
  // -------------------------
  const [openPrices, setOpenPrices] = useState(false)

  // Автоматическое открытие Kainas из App.jsx
  useEffect(() => {
    const handler = () => {
      setOpenPrices(prev => !prev)   // ← переключение!
    }
    window.addEventListener("togglePrices", handler)
    return () => window.removeEventListener("togglePrices", handler)
  }, [])

  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [busy, setBusy] = useState(false)
  const [processingISO, setProcessingISO] = useState(null)
  const [bookedISO, setBookedISO] = useState([])
  const [modal, setModal] = useState(null)

  const [hoverIdx, setHoverIdx] = useState(-1)
  const [animDir, setAnimDir] = useState(0) // пока не используется, но оставим
  const touchStartX = useRef(null)

  // услуги, выбранные в модалке
  const [pendingTime, setPendingTime] = useState(null)
  const [selectedServices, setSelectedServices] = useState([])

  const today = toDateOnly(new Date())
  const now = new Date() // текущее время для сравнения слотов
  const minDate = today
  const maxDate = addMonths(new Date(), 24)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days = useMemo(()=>{
    const arr=[]; let d=new Date(gridStart); 
    while(d<=gridEnd){ arr.push(new Date(d)); d=addDays(d,1) } 
    return arr
  }, [currentMonth, gridStart, gridEnd])

  const bookings = getBookings()

  const slotsForDay = (d) => {
    // прошлые даты — вообще не показываем слоты
    if(toDateOnly(d) < today) return []

    const [sh, sm] = settings.workStart.split(':').map(Number)
    const [eh, em] = settings.workEnd.split(':').map(Number)
    const start = new Date(d); start.setHours(sh, sm, 0, 0)
    const end   = new Date(d); end.setHours(eh, em, 0, 0)
    const slots = []
    let cur = new Date(start)

    while(cur <= end){
      slots.push(new Date(cur))
      cur = new Date(cur.getTime() + settings.slotMinutes*60000)
    }

    const blocked = settings.blockedDates.includes(dayISO(d))
    if(blocked) return []
    if(toDateOnly(d) < minDate || toDateOnly(d) > maxDate) return []

    return slots
  }

  // проверка: занято ли ВРЕМЯ t существующими бронями (учитываем всю длительность)
  const isTaken = (t) => {
    const active = bookings.filter(
      b => b.status === 'approved' || b.status === 'pending'
    )

    const byBookings = active.some(b => {
      const bs = new Date(b.start)
      const be = new Date(b.end)
      return t >= bs && t < be     // попадает в интервал брони
    })

    const isProc = processingISO && isSameMinute(processingISO, t)
    const isLocal = bookedISO.some(x => isSameMinute(x, t))

    return byBookings || isProc || isLocal
  }

  // проверка: свободен ли весь интервал [start, start+duration]
  const isRangeFree = (start, durationMinutes) => {
    const end = new Date(start.getTime() + durationMinutes * 60000)
    const active = getBookings().filter(
      b => b.status === 'approved' || b.status === 'pending'
    )
    return !active.some(b => {
      const bs = new Date(b.start)
      const be = new Date(b.end)
      // пересечение интервалов
      return bs < end && be > start
    })
  }

  // helper: считаем общую длительность и залог по выбранным услугам
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

  // открываем модалку при клике по времени
  const openTimeModal = (tSel) => {
    // защита: прошлые даты и прошлое время (сегодня)
    if(
      toDateOnly(tSel) < today ||
      (isSameDay(tSel, now) && tSel < now)
    ){
      alert(t('cannot_book_past') || 'Нельзя записываться на прошедшее время')
      return
    }

    const user = getCurrentUser()
    if(!user) { alert(t('login_or_register')); return }
    if(isTaken(tSel)) { alert(t('already_booked')); return }

    const endPreview = new Date(tSel)
    endPreview.setMinutes(endPreview.getMinutes() + settings.slotMinutes)

    setPendingTime(tSel)
    setSelectedServices([])

    setModal({
      title: 'Kokias paslaugas norėtumėte pasirinkti?',
      dateStr: format(tSel,'dd.MM.yyyy'),
      timeStr: format(tSel,'HH:mm') + ' – ' + format(endPreview,'HH:mm'),
      caption: 'Trukmė ir suma priklauso nuo pasirinktų paslaugų.'
    })
  }

  const confirmBooking = () => {
    if (!pendingTime) return
    if (!selectedServices || selectedServices.length === 0) {
      alert('Pasirinkite bent vieną paslaugą.')
      return
    }
    const user = getCurrentUser()
    if (!user) {
      alert(t('login_or_register'))
      return
    }

    const start = pendingTime
    // ещё раз проверим «не прошлое»
    if (
      toDateOnly(start) < today ||
      (isSameDay(start, now) && start < now)
    ) {
      alert(t('cannot_book_past') || 'Нельзя записываться на прошедшее время')
      return
    }

    if (isTaken(start)) {
      alert(t('already_booked'))
      return
    }

    const { duration, price } = calcTotals(selectedServices)
    const durationMinutes = duration || settings.slotMinutes

    // проверяем, свободен ли весь интервал
    if (!isRangeFree(start, durationMinutes)) {
      alert(t('already_booked') || 'Šiuo metu jau yra rezervacija.')
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
      start,
      end,
      status: 'pending',
      createdAt: new Date().toISOString(),
      services: selectedServices,
      durationMinutes,
      price,
      paid: false
    }

    // локально отмечаем все слоты в интервале как занятые
    const newLocalSlots = []
    let cur = new Date(start)
    while (cur < end) {
      newLocalSlots.push(new Date(cur))
      cur = new Date(cur.getTime() + settings.slotMinutes * 60000)
    }

    setTimeout(()=>{
      const current = getBookings()
      saveBookings([ ...current, newB ])
      setBookedISO(prev => [...prev, ...newLocalSlots])
      setBusy(false)
      setProcessingISO(null)
      setPendingTime(null)
      setSelectedServices([])
      setModal(null)
    }, 600)
  }

  const closeModal = () => {
    if (busy) return
    setModal(null)
    setPendingTime(null)
    setSelectedServices([])
  }

  const goPrev = () => { setAnimDir(-1); setCurrentMonth(m => addMonths(m,-1)) }
  const goNext = () => { setAnimDir(+1); setCurrentMonth(m => addMonths(m, 1)) }

  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX }
  const onTouchEnd = (e) => {
    if(touchStartX.current == null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if(Math.abs(dx) > 50){
      if(dx > 0) goPrev(); else goNext();
    }
    touchStartX.current = null
  }

  const monthLabelRaw = format(currentMonth,'LLLL yyyy')
  const monthLabel = monthLabelRaw.charAt(0).toUpperCase()+monthLabelRaw.slice(1)

  const navBtnStyle = {
    width: 130, height: 46, borderRadius: 14,
    border: '1px solid rgba(168,85,247,0.40)',
    background: 'rgba(31, 0, 63, 0.55)',
    backdropFilter: 'blur(8px)',
    color: '#fff', fontSize: 22, cursor: 'pointer',
    display:'flex', alignItems:'center', justifyContent:'center'
  }

  const centerPillStyle = {
    width: 130, height: 46, borderRadius: 14,
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    border: '1px solid rgba(168,85,247,0.40)',
    background: 'linear-gradient(145deg, rgba(66,0,145,0.55), rgba(20,0,40,0.60))',
    backdropFilter: 'blur(8px)',
    color: '#fff', fontWeight: 600
  }

  const dateCellStyle = (d, idx, active, isPast) => {
    const base = {
      borderRadius: 12,
      padding: '10px 0',
      textAlign: 'center',
      transition: '0.2s',
      position: 'relative'
    }

    if(isPast){
      base.opacity = 0.45
      base.filter = "grayscale(30%)"
    }

    if(hoverIdx === idx && !isPast){
      base.boxShadow = '0 0 18px rgba(168,85,247,0.40)'
      base.background = 'rgba(98,0,180,0.18)'
    }

    if(active){
      base.boxShadow = '0 0 24px rgba(168,85,247,0.55)'
      base.background = 'rgba(98,0,180,0.22)'
      base.fontWeight = 700
    }

    if(isPast){
      base.position = "relative"
    }

    return base
  }

  return (
    <div className="card" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>

      <style>{`
        /* Точка под прошлыми днями */
        .past-day-dot::after {
          content: '';
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(200,200,255,0.4);
          position: absolute;
          left: 50%;
          bottom: 4px;
          transform: translateX(-50%);
        }

.slots-title {
  width: 100%;
  text-align: center;

  /* рамка и фон — как раньше у badge */
  border: 1px solid rgba(168,85,247,0.25);
  background: rgba(255,255,255,0.03);
  border-radius: 12px;

  /* уменьшенный текст на 25% */
  font-size: 14px;
  font-weight: 600;

  padding: 8px 0;
  color: #dbe0ff;
  letter-spacing: 0.4px;

  backdrop-filter: blur(6px);
}

.flash-date {
  color: #ffffff;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 8px;

  /* эффект подсветки */
  animation: flashGlow 2.4s infinite ease-in-out;
}

@keyframes flashGlow {
  0%   { text-shadow: 0 0 0px rgba(168,85,247,0.0); }
  50%  { text-shadow: 0 0 10px rgba(168,85,247,0.65); }
  100% { text-shadow: 0 0 0px rgba(168,85,247,0.0); }
}


        /* Кнопка слота времени — базовый класс */
        .time-slot-btn {
          position: relative;
        }

        /* Приглушённый стиль для прошедших слотов */
        .time-past {
          opacity: 0.55;
          filter: grayscale(35%);
        }

        /* Мобильная адаптация календаря + навигации */
        @media(max-width: 600px){
          .calendar-nav {
            display: flex;
            width: 100%;
            gap: 8px;
            align-items: center;
            justify-content: space-between;
            flex-wrap: nowrap;
          }

          .calendar-nav button {
            flex: 1;
            width: auto !important;
            height: 40px !important;
            font-size: 18px !important;
          }

          .calendar-nav .month-pill {
            flex: 2;
            width: auto !important;
            height: 40px !important;
            font-size: 16px !important;
          }

          .grid { gap: 6px !important; }
          .muted { font-size: 13px !important; }
        }

        /* Немного стабилизируем поведение на тач-экранах */
        html, body, .card, button {
          touch-action: manipulation;
        }

        @keyframes spin { to{ transform: rotate(360deg); } }
        .modal-backdrop {
          position: fixed; inset: 0; background: rgba(0,0,0,0.55);
          display:flex; align-items:center; justify-content:center; z-index: 9999;
          backdrop-filter: blur(2px);
        }
        .modal {
          background: rgba(17, 0, 40, 0.85);
          border: 1px solid rgba(168,85,247,0.35);
          border-radius: 16px; padding: 20px; color: #fff;
          box-shadow: 0 8px 32px rgba(120,0,255,0.35);
          min-width: 280px;
        }
        /* ============================================
   MOBILE FIX: центрирование + отключение зума
   ============================================ */
@media (max-width: 768px) {

  /* Центрирование модалки */
  .modal-backdrop {
    position: fixed !important;
    inset: 0 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 16px;
  }

  .modal {
    width: 100%;
    max-width: 420px;
    border-radius: 18px;
    margin: 0 auto !important;
    transform: none !important;
    position: relative !important;
  }
/* ==============================================
   МОБИЛЬНАЯ МОДАЛКА — 100% стабильный фикс
   ============================================== */
@media (max-width: 768px) {

  /* Фон modalki */
  .modal-backdrop {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    background: rgba(0,0,0,0.55) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 0 !important;
    margin: 0 !important;
    z-index: 999999 !important;
    backdrop-filter: blur(2px);
  }

  /* сама модалка */
.modal {
  position: fixed !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  width: 90vw !important;
  max-width: 420px !important;
  margin: 0 !important;
  border-radius: 18px !important;
}

  /* отключаем iOS zoom */
  input, select, textarea, button {
    font-size: 16px !important;
  }
}
        .loader {
          width: 18px; height: 18px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.25);
          border-top-color: rgba(168,85,247,0.9);
          animation: spin .8s linear infinite;
          display:inline-block; vertical-align:middle;
        }
      `}</style>

      {/* ------------------------- */}
      {/*         KAINAS           */}
      {/* ------------------------- */}

      <div
        style={{
          width: "100%",
          border: "1px solid rgba(170, 90, 255, 0.22)",
          background:
            "linear-gradient(180deg, rgba(18,18,30,0.96) 0%, rgba(12,12,22,0.92) 100%)",
          borderRadius: 20,
          padding: "22px 24px 26px",
          marginTop: 0,
          marginBottom: 32,
          backdropFilter: "blur(22px)",
          boxShadow: "0 0 28px rgba(170, 90, 255, 0.18)",
        }}
      >
        <h2
          style={{
            margin: "0 0 18px 0",
            fontSize: 25,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: "0.3px",
          }}
        >
          Kainas
        </h2>

        <div
          onClick={() => setOpenPrices(!openPrices)}
          style={{
            border: "1px solid rgba(180, 90, 255, 0.32)",
            background: "rgba(22, 22, 35, 0.90)",
            borderRadius: 16,
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            cursor: "pointer",
            transition: ".28s ease",
            boxShadow: openPrices
              ? "0 0 20px rgba(180, 90, 255, 0.35)"
              : "0 0 12px rgba(180, 90, 255, 0.15)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(210, 120, 255, 0.55)";
            e.currentTarget.style.boxShadow =
              "0 0 22px rgba(200, 110, 255, 0.48)";
            e.currentTarget.style.background = "rgba(30, 24, 50, 0.92)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(180, 90, 255, 0.32)";
            e.currentTarget.style.boxShadow = openPrices
              ? "0 0 20px rgba(180, 90, 255, 0.35)"
              : "0 0 12px rgba(180, 90, 255, 0.15)";
            e.currentTarget.style.background = "rgba(22,22,35,0.90)";
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            style={{
              transform: openPrices ? "rotate(180deg)" : "rotate(0deg)",
              transition: "0.25s ease",
              fill: "#e3b8ff",
              filter: "drop-shadow(0 0 4px rgba(200,120,255,0.55))",
            }}
          >
            <path d="M7 10l5 5 5-5z" />
          </svg>

          <span style={{ fontSize: 17, color: "#fff" }}>Žiūrėti kainas</span>
        </div>

        <div
          style={{
            maxHeight: openPrices ? 2000 : 0,
            overflow: "hidden",
            transition: "max-height .55s cubic-bezier(.25,.8,.25,1)",
            marginTop: openPrices ? 20 : 0,
            opacity: openPrices ? 1 : 0,
          }}
        >
          <div
            style={{
              border: "1px solid rgba(170, 90, 255, 0.22)",
              background: "rgba(15,15,28,0.90)",
              borderRadius: 18,
              padding: "22px 20px",
              backdropFilter: "blur(16px)",
              boxShadow: "0 0 20px rgba(150, 70, 255, 0.18)",
              animation: openPrices ? "fadeIn .45s ease" : "none",
            }}
          >
            <style>
              {`
                @keyframes fadeIn {
                  0% { opacity: 0; transform: translateY(6px); }
                  100% { opacity: 1; transform: translateY(0); }
                }
              `}
            </style>

            {[
              {
                price: "80–130 €",
                title: "Šukuosenos kaina",
                text: "Priklauso nuo darbo apimties",
              },
              {
                price: "25 €",
                title: "Konsultacija",
                text: "Užtrunkame nuo 30 min. iki valandos",
              },
              {
                price: "50 € užstatas / 100 €",
                title: "Plaukų Tresų nuoma",
                text:
                  "Grąžinti reikia per 3/4 d. Grąžinate plaukus, grąžину užstatą",
              },
              {
                price: "Iki 20 €",
                title: "Papuošalų nuoma",
                text: "",
              },
              {
                price: "130 €",
                title: "Atvykimas Klaipėdoje",
                text:
                  "Daiktų kraustymai, važiavimai — per тą laiką galiu priimti kitą klientę.",
              },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  border: "1px solid rgba(150, 80, 255, 0.28)",
                  borderRadius: 16,
                  padding: "16px 18px",
                  marginBottom: 16,
                  background: "rgba(22, 18, 38, 0.92)",
                  boxShadow: "0 0 12px rgba(150, 70, 255, 0.18)",
                }}
              >
                <p style={{ margin: 0, fontSize: 18, color: "#fff" }}>
                  <b>{item.price}</b>
                </p>
                <p style={{ margin: "4px 0 0 0", color: "#d6caff" }}>
                  {item.title}
                </p>
                {item.text && (
                  <p style={{ margin: "3px 0 0 0", color: "#a898ce" }}>
                    {item.text}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* NAVIGATION + MONTH */}
      <div
        className="calendar-nav"
        style={{
          display:'flex',
          gap:12,
          alignItems:'center',
          justifyContent:'center',
          marginBottom:12,
          flexWrap:'wrap'
        }}
      >
        <button
          style={navBtnStyle}
          onClick={goPrev}
        >
          ←
        </button>

        <div className="month-pill" style={centerPillStyle}>
          {monthLabel}
        </div>

        <button
          style={navBtnStyle}
          onClick={goNext}
        >
          →
        </button>
      </div>

      <div className="hr" />

      {/* CALENDAR GRID */}
      <div className="grid">
        {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map((w,i)=>(
          <div
            key={i}
            className="muted"
            style={{textAlign:'center',fontWeight:600}}
          >
            {w}
          </div>
        ))}

        {days.map((d,idx)=>{
          const inMonth = isSameMonth(d,monthStart)
          const active  = isSameDay(d,selectedDate)
          const isPast = toDateOnly(d) < today
          const disabled = isPast || toDateOnly(d) > maxDate

          return (
            <div
              key={idx}
              className={
                'datebtn' +
                (active ? ' active' : '') +
                (isPast ? ' past-day-dot' : '')
              }
              onMouseEnter={()=>setHoverIdx(idx)}
              onMouseLeave={()=>setHoverIdx(-1)}
              onClick={()=>!disabled && setSelectedDate(d)}
              style={{
                ...dateCellStyle(d, idx, active, isPast),
                opacity: inMonth ? 1 : 0.4,
                cursor: disabled ? 'default' : 'pointer'
              }}
            >
              {format(d,'d')}
            </div>
          )
        })}
      </div>

      <div className="hr" />

      {/* SLOTS */}
      <div>
 <div className="slots-title">
  {t('slots_for')} <span className="flash-date">{format(selectedDate,'dd.MM.yyyy')}</span>
</div>


        <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:8}}>
          {slotsForDay(selectedDate).map(ti=>{
            const taken = isTaken(ti)
            const isProcessing = processingISO && isSameMinute(processingISO, ti)
            const isLocal = bookedISO.some(x => isSameMinute(x, ti))
            const disabledLike = taken || busy || isProcessing

            // прошедшее время СЕГОДНЯ
            const isPastTime =
              isSameDay(ti, now) && ti < now

            let label = format(ti,'HH:mm')
            if(isProcessing) label = t('processing')
            else if(taken || isLocal) label = t('reserved_label')

            return (
              <button
                key={ti.toISOString()}
                disabled={disabledLike || isPastTime}
                onClick={()=>openTimeModal(ti)}
                className={
                  'time-slot-btn ' +
                  (isPastTime ? 'time-past' : '')
                }
                style={{
                  borderRadius:10,
                  padding:'8px 12px',
                  border: '1px solid ' + (
                    disabledLike || isPastTime
                      ? 'rgba(180,180,200,0.25)'
                      : 'rgba(168,85,247,0.45)'
                  ),
                  background: (disabledLike || isPastTime)
                    ? 'rgba(255,255,255,0.04)'
                    : 'rgba(98,0,180,0.18)',
                  color:'#fff',
                  cursor: (disabledLike || isPastTime) ? 'default' : 'pointer',
                  backdropFilter:'blur(6px)',
                  transition:'0.2s'
                }}
              >
                {busy && isProcessing
                  ? <span className="loader" />
                  : label}
              </button>
            )
          })}

          {slotsForDay(selectedDate).length === 0 && (
            <small className="muted">
              {t('no_slots') || 'Нет доступных слотов'}
            </small>
          )}
        </div>
      </div>

      {/* MODAL */}
      {modal && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h3 style={{marginTop:0, marginBottom: 10}}>
              {modal.title}
            </h3>

            {pendingTime && (
              <div style={{ marginTop: 8, marginBottom: 16 }}>
                <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 8 }}>
                  Pasirinkite vieną ar kelias paslaugas:
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
                      <span>{s.name}</span>
                     <span style={{ fontSize: 13, opacity: 0.9 }}>
  {s.duration || 0} min • Avansas {s.deposit || 0} €
</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {modal.dateStr && (
              <p style={{margin:'6px 0', opacity:.9}}>
                {modal.dateStr}
              </p>
            )}

            {modal.timeStr && (
              <p style={{margin:'6px 0', fontWeight:700}}>
                {modal.timeStr}
              </p>
            )}

            {modal.caption && (
              <p style={{margin:'6px 0', opacity:.95}}>
                {modal.caption}
              </p>
            )}

            <div style={{marginTop:14, textAlign:'right', display:'flex', justifyContent:'flex-end', gap:8}}>
              <button
                onClick={closeModal}
                style={{
                  borderRadius:10,
                  padding:'8px 14px',
                  border:'1px solid rgba(148,163,184,0.6)',
                  background:'rgba(15,23,42,0.9)',
                  color:'#e5e7eb',
                  cursor:'pointer'
                }}
              >
                Atšaukti
              </button>
              <button
                onClick={confirmBooking}
                style={{
                  borderRadius:10,
                  padding:'8px 14px',
                  border:'1px solid rgba(168,85,247,0.45)',
                  background:'rgba(98,0,180,0.55)',
                  color:'#fff',
                  backdropFilter:'blur(6px)',
                  cursor:'pointer'
                }}
              >
                Patvirtinti
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
