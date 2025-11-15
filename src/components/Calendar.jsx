// FULL UPDATED Calendar.jsx WITH PRICE WINDOW
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

  // === Prices ===
  const [showPrices, setShowPrices] = useState(true)
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
    const blocked = settings.blockedDates.includes(dayISO(d))
    if(blocked) return []
    if(toDateOnly(d) < minDate || toDateOnly(d) > toDateOnly(maxDate)) return []
    return slots
  }

  const isTaken = (t) => {
    const storedTaken = bookings.some(b => (b.status==='approved' || b.status==='pending') && isSameMinute(b.start, t))
    const isProc = processingISO && isSameMinute(processingISO, t)
    const isLocal = bookedISO.some(x => isSameMinute(x, t))
    return storedTaken || isProc || isLocal
  }

  const book = (tSel) => {
    if(toDateOnly(tSel) < today){ alert(t('cannot_book_past')); return }

    const user = getCurrentUser()
    if(!user) { alert(t('login_or_register')); return }
    if(isTaken(tSel)) { alert(t('already_booked')); return }

    setBusy(true)
    setProcessingISO(new Date(tSel))
    const end = new Date(tSel); end.setMinutes(end.getMinutes() + settings.slotMinutes)

    const newB = {
      id: id(), userPhone: user.phone, userName: user.name,
      userInstagram: user.instagram || '',
      start: tSel, end, status: 'pending', createdAt: new Date().toISOString()
    }

    setTimeout(()=>{
      saveBookings([...bookings, newB])
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
    if(Math.abs(dx) > 50){ dx > 0 ? goPrev() : goNext() }
    touchStartX.current = null
  }

  const monthLabelRaw = format(currentMonth,'LLLL yyyy')
  const monthLabel = monthLabelRaw.charAt(0).toUpperCase()+monthLabelRaw.slice(1)

  const navBtnStyle = {
    width: 130, height: 46, borderRadius: 14,
    border:'1px solid rgba(168,85,247,0.40)', background:'rgba(31,0,63,0.55)',
    color:'#fff', fontSize:22, cursor:'pointer'
  }

  const centerPillStyle = {
    width:130, height:46, borderRadius:14,
    border:'1px solid rgba(168,85,247,0.40)',
    background:'linear-gradient(145deg, rgba(66,0,145,0.55), rgba(20,0,40,0.60))',
    color:'#fff', fontSize:15, fontWeight:600,
    display:'flex', justifyContent:'center', alignItems:'center'
  }

  const isToday = (d) => isSameDay(toDateOnly(d), today)

  return (
    <div className="card" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>

      {/* ===================== PRICE SECTION ===================== */}
      {showPrices && (
        <div style={{ width:'100%', marginTop:20 }}>
          <h2 style={{ color:'white', fontSize:22, fontWeight:600, paddingLeft:14, marginBottom:10 }}>
            Kainas
          </h2>

          <div
            style={{ background:'rgb(20,15,35)', border:'1px solid rgba(150,80,255,0.35)', padding:'16px 18px', borderRadius:10,
              cursor:'pointer', display:'flex', alignItems:'center', gap:10, marginBottom:14 }}
            onClick={() => setShowPriceList(!showPriceList)}
          >
            <span style={{ color:'#b37bff', fontSize:20, transform:showPriceList?'rotate(180deg)':'rotate(0deg)', transition:'0.25s' }}>▾</span>
            <span style={{ color:'white', fontSize:16 }}>Žiūrėti kainas</span>
          </div>

          {showPriceList && (
            <div style={{ background:'rgba(20,10,40,0.8)', border:'1px solid rgba(160,80,255,0.3)', borderRadius:14,
              padding:'22px 26px', color:'white', fontSize:17, lineHeight:1.55 }}>

              <div style={{ marginBottom:16 }}>
                <b>80–130 €</b><br />Šukuosenos kaina<br />
                <span style={{ opacity:0.75 }}>Priklauso nuo darbo apimties</span>
              </div>

              <div style={{ marginBottom:16 }}>
                <b>25 €</b><br />Konsultacija<br />
                <span style={{ opacity:0.75 }}>30–60 min</span>
              </div>

              <div style={{ marginBottom:16 }}>
                <b>50 € užstatas</b><br />
                <b>100 €</b><br />Plaukų Tresų nuoma
              </div>

              <div style={{ marginBottom:16 }}>
                <b>Iki 20 €</b><br />Papuošalų nuoma
              </div>

              <div>
                <b>130 €</b><br />Atvykimas Klaipėdoje
              </div>
            </div>
          )}
        </div>
      )}
      {/* ===================== END PRICE SECTION ===================== */}

      <div style={{display:'flex', gap:16, alignItems:'center', justifyContent:'center', marginBottom:12}}>
        <button style={navBtnStyle} onClick={goPrev}>←</button>
        <div style={centerPillStyle}>{monthLabel}</div>
        <button style={navBtnStyle} onClick={goNext}>→
