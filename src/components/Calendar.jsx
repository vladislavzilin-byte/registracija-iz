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

  const today = toDateOnly(new Date())
  const minDate = today
  const maxDate = addMonths(new Date(), 24)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days = useMemo(()=>{
    const arr=[]
    let d=new Date(gridStart)
    while(d<=gridEnd){
      arr.push(new Date(d))
      d=addDays(d,1)
    }
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
      b => (b.status === 'approved' || b.status === 'pending') && isSameMinute(b.start, t)
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
    if(!user){
      alert(t('login_or_register'))
      return
    }

    if(isTaken(tSel)){
      alert(t('already_booked'))
      return
    }

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
      saveBookings([...bookings, newB])
      setBookedISO(prev => [...prev, new Date(tSel)])
      setBusy(false)
      setProcessingISO(null)

      setModal({
        title: t('booked_success'),
        dateStr: format(tSel,'dd.MM.yyyy'),
        timeStr: format(tSel,'HH:mm') + " – " + format(end,'HH:mm'),
        caption: t('wait_confirmation') + " " + t('details_in_my')
      })
    }, 600)
  }

  const closeModal = () => setModal(null)

  const goPrev = () => { setAnimDir(-1); setCurrentMonth(m => addMonths(m,-1)) }
  const goNext = () => { setAnimDir(+1); setCurrentMonth(m => addMonths(m, 1)) }

  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX }
  const onTouchEnd = (e) => {
    if(!touchStartX.current) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if(Math.abs(dx) > 50){
      if(dx > 0) goPrev(); else goNext();
    }
    touchStartX.current = null
  }

  const monthLabelRaw = format(currentMonth,'LLLL yyyy')
  const monthLabel = monthLabelRaw.charAt(0).toUpperCase() + monthLabelRaw.slice(1)

  const navBtnStyle = {
    padding: "12px 34px",
    borderRadius: 14,
    background: "rgba(31, 0, 63, 0.55)",
    border: "1px solid rgba(168,85,247,0.35)",
    color: "#fff",
    cursor: "pointer"
  }

  return (
    <div>

      {/* ───── KAINAS БЛОК ───── */}
      <div className="card" style={{marginBottom:20}}>
        <div className="card-title">Kainas</div>

        <details className="accordion">
          <summary>Žiūrėti kainas</summary>

          <div style={{padding:"16px", lineHeight:"1.6"}}>
            <strong>80–130 €</strong><br/>
            Šukuosenos kaina<br/>
            Priklauso nuo darbo apimties<br/><br/>

            <strong>25 €</strong><br/>
            Konsultacija<br/>
            Užtrunkame nuo 30 min. iki valandos<br/><br/>

            <strong>50 € užstatas<br/>100 €</strong><br/>
            Plaukų Tresų nuoma<br/>
            Grąžinti reikia per 3/4 d. Grąžinate plaukus, grąžinu užstatą<br/><br/>

            <strong>Iki 20 €</strong><br/>
            Papuošalų nuoma<br/><br/>

            <strong>130 €</strong><br/>
            Atvykimas Klaipėdoje<br/>
            Daiktų kraustymai, važinėjimai – per tą laiką galiu priimti kitą klientę.
          </div>
        </details>
      </div>

      {/* ───── КАЛЕНДАРЬ СТАРОГО ДИЗАЙНА ───── */}
      <div className="card" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        
        {/* Navigation */}
        <div style={{display:'flex', justifyContent:'space-between', marginBottom:12}}>
          <button style={navBtnStyle} onClick={goPrev}>←</button>
          <div style={{padding:"12px 34px", borderRadius:14, border:"1px solid rgba(168,85,247,0.35)"}}>
            {monthLabel}
          </div>
          <button style={navBtnStyle} onClick={goNext}>→</button>
        </div>

        {/* Grid */}
        <div className="grid">
          {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map((w,i)=>(
            <div key={i} className="muted" style={{textAlign:'center',marginBottom:6}}>
              {w}
            </div>
          ))}

          {days.map((d,idx)=>{

            const inMonth = isSameMonth(d,monthStart)
            const active = isSameDay(d,selectedDate)
            const isPast = toDateOnly(d) < today
            const disabled = isPast || toDateOnly(d) > maxDate

            return (
              <div
                key={idx}
                onClick={()=>!disabled && setSelectedDate(d)}
                style={{
                  opacity: inMonth ? 1 : .4,
                  padding:"8px 0",
                  margin:"4px",
                  textAlign:"center",
                  borderRadius:10,
                  cursor: disabled ? "default" : "pointer",
                  background: active ? "rgba(168,85,247,0.25)" : "transparent",
                  border: active ? "1px solid rgba(168,85,247,0.45)" : "1px solid transparent"
                }}
              >
                {format(d,'d')}
              </div>
            )
          })}
        </div>

        <div className="hr" />

        {/* Slots */}
        <div>
          <div className="badge">{t('slots_for')} {format(selectedDate,'dd.MM.yyyy')}</div>
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
                    padding:"8px 14px",
                    borderRadius:10,
                    border:"1px solid rgba(168,85,247,0.45)",
                    background: disabledLike ? "rgba(255,255,255,0.04)" : "rgba(98,0,180,0.18)",
                    color:"#fff",
                    cursor: disabledLike ? "default" : "pointer"
                  }}
                >
                  {busy && isProcessing ? <span className="loader"/> : label}
                </button>
              )
            })}

            {slotsForDay(selectedDate).length===0 && (
              <small className="muted">Нет доступных слотов</small>
            )}
          </div>
        </div>

      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" onClick={(e)=>e.stopPropagation()}>
            <h3>{modal.title}</h3>
            <p>{modal.dateStr}</p>
            <p><strong>{modal.timeStr}</strong></p>
            <p>{modal.caption}</p>
            <button style={{marginTop:10}} onClick={closeModal}>OK</button>
          </div>
        </div>
      )}

    </div>
  )
}
