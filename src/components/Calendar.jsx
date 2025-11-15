import { useMemo, useState, useRef } from 'react'
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

export default function Calendar(){
  const { t } = useI18n()
  const settings = getSettings()

  // -------------------------
  // KAINAS — accordion state
  // -------------------------
  const [openPrices, setOpenPrices] = useState(false)

  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [busy, setBusy] = useState(false)
  const [processingISO, setProcessingISO] = useState(null)
  const [bookedISO, setBookedISO] = useState([])
  const [modal, setModal] = useState(null)

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
      b => (b.status==='approved' || b.status==='pending') && isSameMinute(b.start, t)
    )
    const isProc = processingISO && isSameMinute(processingISO, t)
    const isLocal = bookedISO.some(x => isSameMinute(x, t))
    return storedTaken || isProc || isLocal
  }

  const book = (tSel) => {
    if(toDateOnly(tSel) < today){
      alert(t('cannot_book_past') || 'Нельзя записываться на прошедшие даты')
      return
    }
    const user = getCurrentUser()
    if(!user) { alert(t('login_or_register')); return }
    if(isTaken(tSel)) { alert(t('already_booked')); return }

    setBusy(true)
    setProcessingISO(new Date(tSel))

    const end = new Date(tSel)
    end.setMinutes(end.getMinutes() + settings.slotMinutes)

    const newB = {
      id: id(),
      userPhone: user.phone,
      userName: user.name,
      userInstagram: user.instagram || '',
      start: tSel,
      end,
      status: 'pending',
      createdAt: new Date().toISOString()
    }

    setTimeout(()=>{
      saveBookings([ ...bookings, newB ])
      setBookedISO(prev => [...prev, new Date(tSel)])
      setBusy(false)
      setProcessingISO(null)

      setModal({
        title: t('booked_success'),
        dateStr: format(tSel,'dd.MM.yyyy'),
        timeStr: format(tSel,'HH:mm')+' – '+format(end,'HH:mm'),
        caption: t('wait_confirmation')+' '+t('details_in_my')
      })
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
  style={{
    border: "1px solid rgba(150, 80, 255, 0.25)",
    background: "rgba(10, 0, 25, 0.6)",
    borderRadius: 14,
    padding: "14px 20px 18px",
    marginBottom: 15,  // ← уменьшил расстояние
    marginTop: 0,      // ← убирает верхний “пустой воздух”
    backdropFilter: "blur(12px)",
  }}
>
        <h2 style={{ marginBottom: 12, fontSize: 26 }}>Kainas</h2>

        <div
          onClick={() => setOpenPrices(!openPrices)}
          style={{
            border: "1px solid rgba(150, 80, 255, 0.3)",
            padding: "12px 16px",
            borderRadius: 10,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 10,
            transition: "0.3s",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            style={{
              transform: openPrices ? "rotate(180deg)" : "rotate(0deg)",
              transition: "0.3s",
              fill: "#b980ff",
            }}
          >
            <path d="M7 10l5 5 5-5z" />
          </svg>

          <div style={{ fontSize: 18 }}>Žiūrėti kainas</div>
        </div>

        <div
          style={{
            maxHeight: openPrices ? 2000 : 0,
            overflow: "hidden",
            transition: "max-height .4s ease",
            marginTop: openPrices ? 16 : 0,
            border: openPrices ? "1px solid rgba(150, 80, 255, 0.2)" : "none",
            borderRadius: 12,
            padding: openPrices ? 20 : "0 20px",
            background: "rgba(15, 0, 35, 0.8)",
          }}
        >
          <div style={{ opacity: openPrices ? 1 : 0, transition: ".4s" }}>
            <p><b>80–130 €</b><br/>Šukuosenos kaina<br/>Priklauso nuo darbo apimties</p>

            <p><b>25 €</b><br/>Konsultacija<br/>Užtrunkame nuo 30 min. iki valandos</p>

            <p>
              <b>50 € užstatas</b><br/>
              <b>100 €</b><br/>
              Plaukų Tresų nuoma<br/>
              Grąžinti reikia per 3/4 d. Grąžinate plaukus, grąžinu užstatą
            </p>

            <p><b>Iki 20 €</b><br/>Papuošalų nuoma</p>

            <p>
              <b>130 €</b><br/>Atvykimas Klaipėdoje<br/>
              Daiktų kraustymai, važiavimai — per tą laiką galiu priimti kitą klientę.
            </p>
          </div>
        </div>
      </div>

      {/* ------------------------- */}
      {/*   NAVIGATION + MONTH     */}
      {/* ------------------------- */}

      <style>{`
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
        .loader {
          width: 18px; height: 18px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.25);
          border-top-color: rgba(168,85,247,0.9);
          animation: spin .8s linear infinite;
          display:inline-block; vertical-align:middle;
        }
      `}</style>

      <div
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

        <div style={centerPillStyle}>
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

      {/* ------------------------- */}
      {/*       CALENDAR GRID       */}
      {/* ------------------------- */}

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
                onClick={()=>book(ti)}
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
                onClick={closeModal}
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

