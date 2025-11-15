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

  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [busy, setBusy] = useState(false)
  const [processingISO, setProcessingISO] = useState(null)
  const [bookedISO, setBookedISO] = useState([])
  const [modal, setModal] = useState(null)

  const [hoverIdx, setHoverIdx] = useState(-1)
  const [animDir, setAnimDir] = useState(0)
  const touchStartX = useRef(null)

  // === NEW: PRICE SECTION STATE ===
  const [showPriceList, setShowPriceList] = useState(false)

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

    if(settings.blockedDates.includes(dayISO(d))) return []
    if(toDateOnly(d) < toDateOnly(minDate) || toDateOnly(d) > toDateOnly(maxDate)) return []

    return slots
  }

  const isTaken = (t) => {
    const storedTaken = bookings.some(b =>
      (b.status==='approved' || b.status==='pending') && isSameMinute(b.start, t)
    )
    const isProc = processingISO && isSameMinute(processingISO, t)
    const isLocal = bookedISO.some(x => isSameMinute(x, t))
    return storedTaken || isProc || isLocal
  }

  const book = (tSel) => {
    if(toDateOnly(tSel) < today){
      alert(t('cannot_book_past'))
      return
    }

    const user = getCurrentUser()
    if(!user) { alert(t('login_or_register')); return }
    if(isTaken(tSel)) { alert(t('already_booked')); return }

    setBusy(true)
    setProcessingISO(new Date(tSel))
    const end = new Date(tSel); end.setMinutes(end.getMinutes() + settings.slotMinutes)

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
    if(Math.abs(dx) > 50){ if(dx > 0) goPrev(); else goNext() }
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
    boxShadow: '0 0 18px rgba(138,43,226,0.25)',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  }

  const centerPillStyle = {
    width: 130, height: 46, borderRadius: 14,
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    border: '1px solid rgba(168,85,247,0.40)',
    background: 'linear-gradient(145deg, rgba(66,0,145,0.55), rgba(20,0,40,0.60))',
    color: '#fff', fontSize: 15, fontWeight: 600
  }

  const isToday = (d) => isSameDay(toDateOnly(d), today)
  const dateCellStyle = (d, idx, active, isPast) => {
    const base = {
      borderRadius: 12,
      padding: '10px 0',
      textAlign: 'center',
      transition: '0.2s'
    }
    if(isPast){
      base.opacity = 0.38
      base.filter = 'grayscale(30%)'
    }
    if(hoverIdx === idx && !isPast){
      base.boxShadow = '0 0 18px rgba(168,85,247,0.40)'
      base.background = 'rgba(98,0,180,0.18)'
      base.transform = 'translateY(-1px)'
    }
    if(active){
      base.boxShadow = '0 0 24px rgba(168,85,247,0.55)'
      base.background = 'rgba(98,0,180,0.22)'
      base.fontWeight = 700
    }
    if(isToday(d) && !active){
      base.boxShadow = '0 0 0 1px rgba(168,85,247,0.45) inset'
    }
    return base
  }

  const slotBtnStyle = (disabledLike) => ({
    borderRadius: 10,
    padding: '8px 12px',
    border: '1px solid ' + (disabledLike ? 'rgba(180,180,200,0.25)' : 'rgba(168,85,247,0.45)'),
    background: disabledLike ? 'rgba(255,255,255,0.04)' : 'rgba(98,0,180,0.18)',
    color: '#fff',
    cursor: disabledLike ? 'default' : 'pointer',
    backdropFilter: 'blur(6px)',
    transition: '0.2s'
  })

  return (
    <div className="card" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      
      {/* ========= KAINAS SECTION ========= */}
      <div style={{ width: "100%", marginBottom: "25px" }}>
        <h2 style={{ color: "white", fontSize: "24px", paddingLeft: "6px" }}>Kainas</h2>

        <div
          style={{
            background: "rgb(20,15,35)",
            border: "1px solid rgba(150, 80, 255, 0.35)",
            padding: "18px",
            borderRadius: "10px",
            width: "100%",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "14px",
          }}
          onClick={() => setShowPriceList(!showPriceList)}
        >
          <span
            style={{
              color: "#b37bff",
              fontSize: "20px",
              transform: showPriceList ? "rotate(180deg)" : "rotate(0deg)",
              transition: "0.25s",
            }}
          >
            ▾
          </span>

          <span style={{ color: "white", fontSize: "16px" }}>
            Žiūrėti kainas
          </span>
        </div>

        {showPriceList && (
          <div
            style={{
              background: "rgba(20,10,40,0.8)",
              border: "1px solid rgba(160,80,255,0.3)",
              borderRadius: "14px",
              padding: "22px 26px",
              lineHeight: "1.55",
              fontSize: "17px",
              color: "white",
            }}
          >
            <div style={{ marginBottom: "16px" }}>
              <b>80–130 €</b><br />
              Šukuosenos kaina<br />
              <span style={{ opacity: 0.75 }}>Priklauso nuo darbo apimties</span>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <b>25 €</b><br />
              Konsultacija<br />
              <span style={{ opacity: 0.75 }}>
                Užtrunkame nuo 30 min. iki valandos
              </span>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <b>50 € užstatas</b><br />
              <b>100 €</b><br />
              Plaukų Tresų nuoma<br />
              <span style={{ opacity: 0.75 }}>
                Grąžinti reikia per 3/4 d. Grąžinate plaukus, grąžinu užstatą
              </span>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <b>Iki 20 €</b><br />
              Papuošalų nuoma
            </div>

            <div>
              <b>130 €</b><br />
              Atvykimas Klaipėdoje<br />
              <span style={{ opacity: 0.75 }}>
                Daiktų kraustymai, važinėjimai – per tą laiką galiu priimti kitą klientę.
              </span>
            </div>
          </div>
        )}
      </div>
      {/* ========= END KAINAS ========= */}



      {/* ==== NAVIGATION ==== */}
      <div style={{display:'flex',gap:16,alignItems:'center',justifyContent:'center',marginBottom:12}}>
        <button style={navBtnStyle} onClick={goPrev}>←</button>
        <div style={centerPillStyle}>{monthLabel}</div>
        <button style={navBtnStyle} onClick={goNext}>→</button>
      </div>

      <div className="hr" />

      {/* ==== GRID ==== */}
      <div>
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
                onMouseEnter={()=>setHoverIdx(idx)}
                onMouseLeave={()=>setHoverIdx(-1)}
                onClick={()=>!disabled&&setSelectedDate(d)}
                style={{
                  ...dateCellStyle(d, idx, active, isPast),
                  opacity: inMonth?1:.4,
                  cursor: disabled?'default':'pointer'
                }}
              >
                {format(d,'d')}
              </div>
            )
          })}
        </div>
      </div>

      <div className="hr" />

      {/* ==== TIME SLOTS ==== */}
      <div>
        <div className="badge">{t('slots_for')} {format(selectedDate,'dd.MM.yyyy')}</div>

        <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:8}}>
          {slotsForDay(selectedDate).map(ti=>{
            const taken = isTaken(ti)
            const disabledLike = taken || busy

            return (
              <button
                key={ti.toISOString()}
                disabled={disabledLike}
                onClick={()=>book(ti)}
                style={slotBtnStyle(disabledLike)}
              >
                {format(ti,'HH:mm')}
              </button>
            )
          })}
        </div>
      </div>

      {/* ==== MODAL ==== */}
      {modal && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h3>{modal.title}</h3>
            <p>{modal.dateStr}</p>
            <p><b>{modal.timeStr}</b></p>
            <p>{modal.caption}</p>

            <button onClick={closeModal} style={{
              marginTop:10, borderRadius:10, padding:'8px 14px',
              border:'1px solid rgba(168,85,247,0.45)',
              background:'rgba(98,0,180,0.18)', color:'#fff'
            }}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
