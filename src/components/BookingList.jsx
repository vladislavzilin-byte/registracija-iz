import React from 'react'

export default function BookingList({ bookings, onApprove, onCancel, onCalendar }) {
  return (
    <div className="admin-booking-list">
      <div className="header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h3>Все записи</h3>
        <button onClick={onCalendar}>📅 Календарь</button>
      </div>

      {bookings.length === 0 && (
        <p style={{ opacity: 0.6 }}>Нет записей</p>
      )}

      <table className="table" style={{ width:'100%', borderCollapse:'collapse', marginTop:10 }}>
        <thead>
          <tr>
            <th>Дата</th>
            <th>Время</th>
            <th>Клиент</th>
            <th>Instagram</th>
            <th>Статус</th>
            <th>Действие</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id} style={{ borderBottom:'1px solid #333' }}>
              <td>{b.date}</td>
              <td>{b.time}</td>
              <td>{b.userName}</td>
              <td>{b.instagram}</td>
              <td>
                {b.status === 'pending' && '🟡 Ожидает'}
                {b.status === 'approved' && '🟢 Подтверждена'}
                {b.status === 'canceled_admin' && '🔴 Отменена'}
              </td>
              <td>
                {b.status === 'pending' && (
                  <>
                    <button onClick={() => onApprove(b.id)}>✅ Подтвердить</button>{' '}
                    <button onClick={() => onCancel(b.id)}>❌ Отменить</button>
                  </>
                )}
                {b.status === 'approved' && (
                  <button onClick={() => onCancel(b.id)}>❌ Отменить</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
