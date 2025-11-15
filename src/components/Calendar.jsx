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

const SERVICE_PRICES = {
  "Šukuosena": 50,
  "Tresų nuoma": 25,
  "Papuošalų nuoma": 10,
  "Atvykimas": 50,
  "Konsultacija": 10,
}

const SERVICE_DURATIONS = {
  "Šukuosena": 60,      // 1 час
  "Tresų nuoma": 15,    // 15 мин
  "Papuošalų nuoma": 15,// 15 мин
  "Atvykimas": 120,     // 2 часа
  "Konsultacija": 30,   // 30 мин
}

function dayISO(d){ return new Date(d).toISOString().slice(0,10) }
function toDateOnly(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()) }

export default function Calendar(){
  const { t } = useI18n()
  const settings = getSettings()

  // -------------------------
  // KAINAS — accordion state
  // -------------------------
  const [openPrices, setOpenPrices] = useState(false)

  // Автоматическое открытие Kainas из App.jsx (toggle)
  useEffect(() => {
    const handler = () => {
      setOpenPrices(prev => !prev)
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
  const [pendingTime, setPendingTime] = useState(null)
  const [selectedServices, setSelectedServices] = useState([])

  const [hoverIdx, setHoverIdx] = useState(-1)
  const [animDir, setAnimDir] = useState(0)
  const touchStartX = useRef(null)

  const today = toDateOnly(new Date())
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
  }, [currentMonth])

  const bookings = getBookings()

  const slotsForDay = (d) => {
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

  const isTaken = (t) => {
    const storedTaken = bookings.some(
      b =>
        (b.status === 'approved' || b.status === 'pending') &&
        isSameMinute(b.start, t)
    )
    const isProc = processingISO && isSameMinute(processingISO, t)
    const isLocal = bookedISO.some(x => isSameMinute(x, t))
    return storedTaken || isProc || isLocal
  }

  const openTimeModal = (tSel) => {
    if (toDateOnly(tSel) < today) {
      alert(t('cannot_book_past') || 'Нельзя записываться на прошедшие даты')
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

    const end = new Date(tSel)
    end.setMinutes(end.getMinutes() + settings.slotMinutes)

    setPendingTime(tSel)
    setSelectedServices([])

    setModal({
      title: t('booked_success'),
      dateStr: format(tSel, 'dd.MM.yyyy'),
      timeStr: format(tSel, 'HH:mm') + ' – ' + format(end, 'HH:mm'),
      caption: t('wait_confirmation') + ' ' + t('details_in_my'),
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

  const tSel = pendingTime

  if (toDateOnly(tSel) < today) {
    alert(t('cannot_book_past') || 'Нельзя записываться на прошедшие даты')
    return
  }
  if (isTaken(tSel)) {
    alert(t('already_booked'))
    return
  }

  // 🔢 считаем цену
  const totalPrice = selectedServices.reduce(
    (sum, s) => sum + (SERVICE_PRICES[s] || 0),
    0
  )

  // ⏱ считаем длительность
  let durationMinutes = selectedServices.reduce(
    (sum, s) => sum + (SERVICE_DURATIONS[s] || 0),
    0
  )
  // fallback — если что-то пошло не так
  if (durationMinutes === 0) durationMinutes = settings.slotMinutes

  setBusy(true)
  setProcessingISO(new Date(tSel))

  const end = new Date(tSel)
  end.setMinutes(end.getMinutes() + durationMinutes)

  const newB = {
    id: id(),
    userPhone: user.phone,
    userName: user.name,
    userInstagram: user.instagram || '',
    start: tSel,
    end,
    status: 'pending',
    createdAt: new Date().toISOString(),
    services: selectedServices,
    price: totalPrice,          // 💰 цена
    durationMinutes,            // ⏱ длительность
  }

  setTimeout(() => {
    saveBookings([...bookings, newB])
    setBookedISO(prev => [...prev, new Date(tSel)])
    setBusy(false)
    setProcessingISO(null)
    setPendingTime(null)
    setSelectedServices([])
    closeModal()
  }, 600)
}

  const closeModal = () => setModal(null)

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

  const isToday = (d) => isSameDay(toDateOnly(d), today)

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

    // DOTS for past dates — FIXED
    if(isPast){
      base.position = "relative"
    }

    return base
  }

  return (
    <div className="card" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>

      <style>{`
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

        @media(max-width: 500px){
          .grid { gap: 6px !important; }
          .muted { font-size: 13px !important; }
        }
      `}</style>

      {/* ------------------------- */}
      {/*         KAINAS           */}
      {/* ------------------------- */}

      <div
        id="kainas-section"
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
        {/* Заголовок */}
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

        {/* Кнопка-аккордеон */}
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
            e.currentTarget.style.borderColor = "rgba(210, 120, 255, 0.55)"
            e.currentTarget.style.boxShadow =
              "0 0 22px rgba(200, 110, 255, 0.48)"
            e.currentTarget.style.background = "rgba(30, 24, 50, 0.92)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(180, 90, 255, 0.32)"
            e.currentTarget.style.boxShadow = openPrices
              ? "0 0 20px rgba(180, 90, 255, 0.35)"
              : "0 0 12px rgba(180, 90, 255, 0.15)"
            e.currentTarget.style.background = "rgba(22,22,35,0.90)"
          }}
        >
          {/* Стрелка слева */}
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

          {/* Текст */}
          <span style={{ fontSize: 17, color: "#fff" }}>Žiūrėti kainas</span>
        </div>

        {/* Контент аккордеона */}
        <div
          style={{
            maxHeight: openPrices ? 2000 : 0,
            overflow: "hidden",
            transition: "max-height .4s ease",
            marginTop: openPrices ? 20 : 0,
            border: openPrices ? "1px solid rgba(180, 100, 255, 0.35)" : "none",
            borderRadius: 16,
            padding: openPrices ? "18px 18px 4px" : "0 18px",
            background: "radial-gradient(circle at 0 0, rgba(110,60,255,0.25), transparent 55%), rgba(10,8,20,0.96)",
          }}
        >
          <p
            style={{
              margin: "0 0 14px 0",
              fontSize: 16,
              color: "#e7ddff",
              lineHeight: 1.4,
            }}
          >
            Kainos gali keistis priklausomai nuo darbo apimties, plaukų ilgio ir
            papildomų paslaugų. Tikslią sumą visada patikslinsiu prieš pradedant
            darbą.
          </p>

          <div style={{ marginTop: 10 }}>
            {[
              {
                price: "80–130 €",
                title: "Šukuosenos",
                text: "Kaina priklauso nuo plaukų ilgio, tankio ir šukuosenos sudėtingumo.",
              },
              {
                price: "25 €",
                title: "Konsultacija",
                text: "Aptariame jūsų norus, idėjas, plaukų būklę. Trukmė 30–60 min.",
              },
              {
                price: "50 € užstatas + 100 €",
                title: "Plaukų tresų nuoma",
                text: "Užstatas grąžinamas, kai per 3–4 d. grąžinate tresus.",
              },
              {
                price: "Iki 20 €",
                title: "Papuošalų nuoma",
                text: "Smeigtukai, segtukai, aksesuarai šukuosenai.",
              },
              {
                price: "130 €",
                title: "Atvykimas Klaipėdoje",
                text: "Atvykstu su savo priemonėmis. Važiavimo laikas įtraukiamas į paslaugos trukmę.",
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

            {/* ------------------------- */}
      {/*   NAVIGATION + MONTH     */}
      {/* ------------------------- */}

      <style>{`
        @keyframes spin { to{ transform: rotate(360deg); } }
        @keyframes fadeSlideLeft {
          from { opacity:0; transform: translateY(6px); }
          to { opacity:1; transform: translateY(0); }
        }

        .modal-backdrop {
          position: fixed; inset: 0; background: rgba(0,0,0,0.55);
          display:flex; align-items:center; justify-content:center; z-index: 9999;
          backdrop-filter: blur(2px);
        }
        .modal {
          background: rgba(17, 0, 40, 0.65);
          border: 1px solid rgba(168,85,247,0.35);
          border-radius: 16px; padding: 20px; color: #fff;
          box-shadow: 0 8px 32px rgba(120,0,255,0.35);
          min-width: 280px;
          animation: fadeSlideLeft .25s ease both;
        }
        .loader {
          width: 18px; height: 18px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.25);
          border-top-color: rgba(168,85,247,0.9);
          animation: spin .8s linear infinite;
          display:inline-block; vertical-align:middle;
        }

        /* past-day mark: small dot */
        .datebtn.past::after {
          content: '';
          display:block;
          width:6px; height:6px; border-radius:50%;
          background: rgba(150,150,170,0.4);
          margin:6px auto 0;
        }
      `}</style>

      {/* NAVIGATION */}
      <div style={{display:'flex',gap:16,alignItems:'center',justifyContent:'center',marginBottom:12}}>
        <button
          style={navBtnStyle}
          onClick={goPrev}
          onMouseDown={e=>e.currentTarget.style.background='rgba(31,0,63,0.7)'}
          onMouseUp={e=>e.currentTarget.style.background='rgba(31,0,63,0.55)'}
        >
          ←
        </button>

        <div
          style={centerPillStyle}
          className={animDir<0 ? 'month-enter-right' : animDir>0 ? 'month-enter-left' : ''}
        >
          {monthLabel}
        </div>

        <button
          style={navBtnStyle}
          onClick={goNext}
          onMouseDown={e=>e.currentTarget.style.background='rgba(31,0,63,0.7)'}
          onMouseUp={e=>e.currentTarget.style.background='rgba(31,0,63,0.55)'}
        >
          →
        </button>
      </div>

      <div className="hr" />

      {/* GRID */}
      <div className={animDir<0 ? 'month-enter-right' : animDir>0 ? 'month-enter-left' : ''}>
        <div className="grid">
          {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map((w,i)=>(
            <div key={i} className="muted" style={{textAlign:'center',fontWeight:600}}>{w}</div>
          ))}

          {days.map((d,idx)=>{
            const inMonth = isSameMonth(d,monthStart)
            const active  = isSameDay(d,selectedDate)
            const isPast = toDateOnly(d) < today
            const disabled = isPast || toDateOnly(d) > toDateOnly(maxDate)

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
      </div>

      <div className="hr" />

      {/* ------------------------- */}
      {/*          SLOTS            */}
      {/* ------------------------- */}

      <div>
        <div className="badge">
          {t('slots_for')} {format(selectedDate,'dd.MM.yyyy')}
        </div>

        <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:8}}>
          {slotsForDay(selectedDate).map(ti=>{
            const taken = isTaken(ti)
            const isProcessing = processingISO && isSameMinute(processingISO, ti)
            const isLocal = bookedISO.some(x => isSameMinute(x, ti))
            const disabledLike = taken || busy || isProcessing

            let label = format(ti,'HH:mm')
            if(isProcessing) label = t('processing')
            else if(taken || isLocal) label = t('reserved_label')

            return (
              <button
                key={ti.toISOString()}
                disabled={disabledLike}
                onClick={()=>openTimeModal(ti)}
                style={{
                  borderRadius:10,
                  padding:'8px 12px',
                  border: '1px solid ' + (
                    disabledLike
                      ? 'rgba(180,180,200,0.25)'
                      : 'rgba(168,85,247,0.45)'
                  ),
                  background: disabledLike
                    ? 'rgba(255,255,255,0.04)'
                    : 'rgba(98,0,180,0.18)',
                  color:'#fff',
                  cursor: disabledLike ? 'default' : 'pointer',
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

      {/* ------------------------- */}
      {/*          MODAL            */}
      {/* ------------------------- */}

      {modal && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h3 style={{marginTop:0}}>{modal.title}</h3>

            {pendingTime && (
              <div style={{ marginTop: 12, marginBottom: 18, textAlign: 'center' }}>
                <div style={{ fontSize: 18, marginBottom: 12, fontWeight: 500 }}>
                  Какие услуги вы хотите выбрать?
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    "Šukuosena",
                    "Tresų nuoma",
                    "Papuošalų nuoma",
                    "Atvykimas",
                    "Konsultacija"
                  ].map(service => (
                    <button
                      key={service}
                      onClick={() => {
                        setSelectedServices(prev => (
                          prev.includes(service)
                            ? prev.filter(s => s !== service)
                            : [...prev, service]
                        ))
                      }}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 10,
                        fontSize: 16,
                        cursor: 'pointer',
                        background: selectedServices.includes(service)
                          ? 'rgba(150,80,255,0.35)'
                          : 'rgba(255,255,255,0.06)',
                        border: selectedServices.includes(service)
                          ? '1.5px solid rgba(150,80,255,0.65)'
                          : '1px solid rgba(255,255,255,0.12)',
                        color: '#fff',
                        transition: '.25s'
                      }}
                    >
                      {service}
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

            <div style={{marginTop:14, textAlign:'right'}}>
              <button
                onClick={confirmBooking}
                style={{
                  borderRadius:10,
                  padding:'8px 14px',
                  border:'1px solid rgba(168,85,247,0.45)',
                  background:'rgba(98,0,180,0.18)',
                  color:'#fff',
                  backdropFilter:'blur(6px)',
                  cursor:'pointer'
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
