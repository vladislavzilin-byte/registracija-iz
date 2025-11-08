
import { fmtDate, fmtTime } from './storage'

export function exportBookingsToCSV(bookings){
  const head=['Имя','Телефон','Instagram','Дата','Время','Статус','Отменено кем']
  const rows=bookings.map(b=>[
    b.userName||'',
    b.userPhone||'',
    b.userInstagram||'',
    fmtDate(b.start),
    `${fmtTime(b.start)}–${fmtTime(b.end)}`,
    b.status||'pending',
    b.status==='canceled_client'?'клиент':(b.status==='canceled_admin'?'администратор':'—')
  ])
  const csv=[head,...rows].map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n')
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'})
  const link=document.createElement('a')
  link.href=URL.createObjectURL(blob)
  const name=`iz-bookings-${new Date().toISOString().slice(0,10)}.csv`
  link.download=name
  document.body.appendChild(link); link.click(); link.remove()
  return { name, count: rows.length }
}
