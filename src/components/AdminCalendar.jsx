
import { useMemo, useState } from 'react'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, isSameMonth, isSameDay, format } from 'date-fns'
import { getBookings, saveBookings, fmtDate, fmtTime } from '../lib/storage'
import { useI18n } from '../lib/i18n'

export default function AdminCalendar(){
  const { t } = useI18n()
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState(null)
  const bookings = getBookings()

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days = useMemo(()=>{
    const arr=[]; let d=gridStart; while(d<=gridEnd){ arr.push(d); d=addDays(d,1) } return arr
  }, [currentMonth])

  const dayList = (d) => bookings
    .filter(b => fmtDate(b.start) === fmtDate(d))
    .sort((a,b)=> new Date(a.start) - new Date(b.start))

  const counts = (d) => {
    const list = dayList(d)
    const c = { pending:0, approved:0, canceled:0 }
    list.forEach(b => {
      if(b.status==='pending') c.pending++
      else if(b.status==='approved') c.approved++
      else c.canceled++
    })
    return c
  }

  const approve = (id) => {
    const next = getBookings().map(b=> b.id===id ? { ...b, status:'approved', approvedAt:new Date().toISOString() } : b)
    saveBookings(next)
    setSelectedDate(new Date(selectedDate)) // trigger rerender
  }
  const reject = (id) => {
    const next = getBookings().map(b=> b.id===id ? { ...b, status:'canceled_admin', canceledAt:new Date().toISOString() } : b)
    saveBookings(next)
    setSelectedDate(new Date(selectedDate))
  }

  const exportDay = (d) => {
    const list = dayList(d)
    const head = ['Имя','Телефон','Instagram','Дата','Время','Статус']
    const rows = list.map(b=>[b.userName,b.userPhone,b.userInstagram,fmtDate(b.start),`${fmtTime(b.start)}–${fmtTime(b.end)}`,b.status])
    const csv = [head,...rows].map(r=>r.map(v=>`"${String(v||'').replaceAll('"','""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `iz-bookings-day-${format(d,'yyyy-MM-dd')}.csv`
    a.click()
  }

  return (
    <div className="card">
      <div style={{display:'flex',gap:8,alignItems:'center',justifyContent:'space-between'}}>
        <button className="ghost" onClick={()=>setCurrentMonth(addMonths(currentMonth,-1))}>←</button>
        <div className="badge">{format(currentMonth,'LLLL yyyy')}</div>
        <button className="ghost" onClick={()=>setCurrentMonth(addMonths(currentMonth,1))}>→</button>
      </div>

      <div className="hr" />

      <div className="grid">
        {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map((w,i)=>(<div key={i} className="muted" style={{textAlign:'center',fontWeight:600}}>{w}</div>))}
        {days.map((d,idx)=>{
          const inMonth=isSameMonth(d,monthStart)
          const c = counts(d)
          const color = c.approved? '🟢' : (c.pending? '🟡' : '⚫')
          return (
            <div key={idx} className="datebtn" onClick={()=>setSelectedDate(d)}
              style={{opacity:inMonth?1:.4}}>
              <div style={{fontWeight:600}}>{format(d,'d')}</div>
              <small className="muted">{color} {c.approved+c.pending+c.canceled || '—'}</small>
            </div>
          )
        })}
      </div>

      {selectedDate && (
        <div style={{marginTop:12}} className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div className="badge">📅 {fmtDate(selectedDate)}</div>
            <button className="ghost" onClick={()=>exportDay(selectedDate)}>📤 Экспорт дня</button>
          </div>
          <table className="table" style={{marginTop:8}}>
            <thead><tr><th>Время</th><th>Клиент</th><th>Instagram</th><th>Статус</th><th></th></tr></thead>
            <tbody>
              {dayList(selectedDate).map(b => (
                <tr key={b.id}>
                  <td>{fmtTime(b.start)}–{fmtTime(b.end)}</td>
                  <td>{b.userName} <small className="muted">({b.userPhone})</small></td>
                  <td>{b.userInstagram||'-'}</td>
                  <td>{b.status==='approved'?'🟢 Подтверждена':(b.status==='pending'?'🟡 Ожидает':'❌ Отменена')}</td>
                  <td style={{display:'flex',gap:6}}>
                    {b.status==='pending' && <button className="ok" onClick={()=>approve(b.id)}>Подтвердить</button>}
                    {(b.status==='pending' || b.status==='approved') && <button className="danger" onClick={()=>reject(b.id)}>Отменить</button>}
                  </td>
                </tr>
              ))}
              {dayList(selectedDate).length===0 && <tr><td colSpan="5"><small className="muted">Нет записей</small></td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
