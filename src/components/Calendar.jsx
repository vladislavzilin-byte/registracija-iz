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
// нормализация даты (без времени)
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

  // UI состояния
  const [hoverIdx, setHoverIdx] = useState(-1)
  const [animDir, setAnimDir] = useState(0) // -1 влево, +1 вправо
  const touchStartX = useRef(null)

  const today = toDateOnly(new Date())
  const minDate = today // запрещаем всё, что меньше today
  const maxDate = addMonths(new Date(), 24)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days = useMemo(()=>{
    const arr=[]; let d=new Date(gridStart); while(d<=gridEnd){ arr.push(new Date(d)); d=addDays(d,1) } return arr
  }, [currentMonth])

  const bookings = getBookings()

  const slotsForDay = (d) => {
    // если день в прошлом — нет слотов
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
    if(toDateOnly(d) < toDateOnly(minDate) || toDateOnly(d) > toDateOnly(maxDate)) return []
    return slots
  }

  const isTaken = (t) => {
    const storedTaken = bookings.some(b => (b.status==='approved' || b.status==='pending') && isSameMinute(b.start, t))
    const isProc = processingISO && isSameMinute(processingISO, t)
    const isLocal = bookedISO.some(x => isSameMinute(x, t))
    return storedTaken || isProc || isLocal
  }

  const book = (tSel) => {
    // защита: запретить запись на времена в прошлом
    if(toDateOnly(tSel) < today){
      alert(t('cannot_book_past') || 'Нельзя записываться на прошедшие даты')
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

  // Листание месяцев
  const goPrev = () => { setAnimDir(-1); setCurrentMonth(m => addMonths(m,-1)) }
  const goNext = () => { setAnimDir(+1); setCurrentMonth(m => addMonths(m, 1)) }

  // Свайп по месяцу
  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX }
  const onTouchEnd = (e) => {
    if(touchStartX.current == null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if(Math.abs(dx) > 50){
      if(dx > 0) goPrev(); else goNext();
    }
    touchStartX.current = null
  }

  // Метки
  const monthLabelRaw = format(currentMonth,'LLLL yyyy')
  const monthLabel = monthLabelRaw.charAt(0).toUpperCase()+monthLabelRaw.slice(1)

  // Стили (Aurora / Glass)
  const navBtnStyle = {
    width: 130, height: 46, borderRadius: 14,
    border: '1px solid rgba(168,85,247,0.40)',
    background: 'rgba(31, 0, 63, 0.55)',
    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
    color: '#fff', fontSize: 22, cursor: 'pointer', transition: '0.25s',
    boxShadow: '0 0 18px rgba(138,43,226,0.25)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none'
  }

  const centerPillStyle = {
    width: 130, height: 46, borderRadius: 14,
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    border: '1px solid rgba(168,85,247,0.40)',
    background: 'linear-gradient(145deg, rgba(66,0,145,0.55), rgba(20,0,40,0.60))',
    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
    color: '#fff', fontSize: 15, fontWeight: 600, textAlign: 'center',
    boxShadow: '0 0 18px rgba(138,43,226,0.25)', letterSpacing: '0.5px'
  }

  // UI хелперы
  const isToday = (d) => isSameDay(toDateOnly(d), today)
  const dateCellStyle = (d, idx, active, isPast) => {
    const base = {
      borderRadius: 12,
      padding: '10px 0',
      textAlign: 'center',
      transition: '0.2s',
      userSelect: 'none'
    }
    // Past dates — визуально затемнены
    if(isPast){
      base.opacity = 0.38
      base.filter = 'grayscale(30%)'
      base.color = 'rgba(220,220,220,0.9)'
    }

    // Aurora hover
    if(hoverIdx === idx && !isPast){
      base.boxShadow = '0 0 18px rgba(168,85,247,0.40)'
      base.background = 'rgba(98,0,180,0.18)'
      base.transform = 'translateY(-1px)'
    }
    // выбранная дата — фиолетовый glow
    if(active){
      base.boxShadow = '0 0 24px rgba(168,85,247,0.55), 0 0 0 1px rgba(168,85,247,0.55) inset'
      base.background = 'rgba(98,0,180,0.22)'
      base.fontWeight = 700
    }
    // сегодня — тонкий ободок
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
      <style>{`
        @keyframes fadeSlideLeft { from{opacity:.0; transform: translateX(12px)} to{opacity:1; transform: translateX(0)} }
        @keyframes fadeSlideRight{ from{opacity:.0; transform: translateX(-12px)} to{opacity:1; transform: translateX(0)} }
        @keyframes spin { to{ transform: rotate(360deg); } }
        .month-enter-left { animation: fadeSlideLeft .35s ease both; }
        .month-enter-right{ animation: fadeSlideRight .35s ease both; }

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
                className={'datebtn'+(active?' active':'') + (isPast ? ' past' : '')}
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

      {/* SLOTS */}
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
                className={(taken||isLocal)?'ghost':'ok'}
                onClick={()=>book(ti)}
                style={slotBtnStyle(disabledLike)}
                onMouseEnter={e=>{ if(!disabledLike) e.currentTarget.style.background='rgba(98,0,180,0.26)' }}
                onMouseLeave={e=>{ if(!disabledLike) e.currentTarget.style.background='rgba(98,0,180,0.18)' }}
              >
                {busy && isProcessing ? (<span className="loader" />) : label}
              </button>
            )
          })}
          {slotsForDay(selectedDate).length===0 && (
            <small className="muted">Нет доступных слотов</small>
          )}
        </div>
      </div>

      {/* MODAL */}
      {modal && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h3 style={{marginTop:0}}>{modal.title}</h3>
            {modal.dateStr && <p style={{margin:'6px 0', opacity:.9}}>{modal.dateStr}</p>}
            {modal.timeStr && <p style={{margin:'6px 0', fontWeight:700}}>{modal.timeStr}</p>}
            {modal.caption && <p style={{margin:'6px 0', opacity:.95}}>{modal.caption}</p>}
            <div style={{marginTop:14, textAlign:'right'}}>
              <button onClick={closeModal} style={{
                borderRadius:10, padding:'8px 14px',
                border:'1px solid rgba(168,85,247,0.45)',
                background:'rgba(98,0,180,0.18)', color:'#fff',
                backdropFilter:'blur(6px)', cursor:'pointer'
              }}>OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
