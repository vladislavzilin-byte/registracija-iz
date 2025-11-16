import React, { useEffect, useMemo, useState } from 'react'
import {
  getBookings,
  saveBookings,
  fmtDate,
  fmtTime
} from '../lib/storage'

export default function Admin() {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [version, setVersion] = useState(0)

  const bookings = getBookings().sort(
    (a, b) => new Date(a.start) - new Date(b.start)
  )

  // === Фильтрация и поиск ===
  const filtered = useMemo(() => {
    let list = bookings

    // фильтр по статусу
    if (filter === 'pending') list = list.filter(b => b.status === 'pending')
    if (filter === 'approved') list = list.filter(b => b.status === 'approved')
    if (filter === 'paid') list = list.filter(b => b.status === 'approved_paid')
    if (filter === 'canceled_client')
      list = list.filter(b => b.status === 'canceled_client')
    if (filter === 'canceled_admin')
      list = list.filter(b => b.status === 'canceled_admin')

    // поиск по имени, телефону, instagram
    if (search.trim().length > 0) {
      const q = search.toLowerCase()
      list = list.filter(b =>
        (b.userName && b.userName.toLowerCase().includes(q)) ||
        (b.userPhone && b.userPhone.includes(q)) ||
        (b.userInstagram && b.userInstagram.toLowerCase().includes(q))
      )
    }

    return list
  }, [filter, search, version])

  // === Обновить запись в базе ===
  const updateBooking = (id, data) => {
    const arr = getBookings().map(b =>
      b.id === id ? { ...b, ...data } : b
    )
    saveBookings(arr)
    setVersion(v => v + 1)
  }

  // === Метка оплаты ===
  const markPaid = (b) => {
    updateBooking(b.id, {
      status: 'approved_paid',
      paidAt: new Date().toISOString()
    })
  }

  // === Подтверждение ===
  const approveBooking = (b) => {
    updateBooking(b.id, {
      status: 'approved',
      approvedAt: new Date().toISOString()
    })
  }

  // === Отмена администратором ===
  const cancelAdmin = (b) => {
    updateBooking(b.id, {
      status: 'canceled_admin',
      canceledAt: new Date().toISOString()
    })
  }

  // === Статус-текст (как в MyBookings) ===
  const statusText = (b) => {
    if (b.status === 'approved_paid') return '🟢 Оплачено и подтверждено'
    if (b.status === 'approved') return '🟢 Бронирование подтверждено'
    if (b.status === 'pending') return '🟡 Ожидает подтверждения'
    if (b.status === 'canceled_client') return '❌ Отменена клиентом'
    if (b.status === 'canceled_admin') return '🔴 Отменена администратором'
    return b.status
  }

  // === Цвет индикатора ===
  const dotColor = (b) => {
    if (b.status === 'approved_paid') return '#4ade80'
    if (b.status === 'approved') return '#22c55e'
    if (b.status === 'pending') return '#facc15'
    return '#9ca3af'
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: 'white', marginBottom: 15 }}>Все записи</h2>

      {/* === Поиск === */}
      <input
        style={searchBox}
        placeholder="Поиск по имени, телефону или Instagram"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* === Фильтры === */}
      <div style={filterRow}>
        <button
          onClick={() => setFilter('all')}
          style={filterBtn(filter === 'all')}
        >Все</button>

        <button
          onClick={() => setFilter('pending')}
          style={filterBtn(filter === 'pending')}
        >Ожидает подтверждения</button>

        <button
          onClick={() => setFilter('approved')}
          style={filterBtn(filter === 'approved')}
        >Подтверждена</button>

        <button
          onClick={() => setFilter('paid')}
          style={filterBtn(filter === 'paid')}
        >Оплачена</button>

        <button
          onClick={() => setFilter('canceled_client')}
          style={filterBtn(filter === 'canceled_client')}
        >Отменено клиентом</button>

        <button
          onClick={() => setFilter('canceled_admin')}
          style={filterBtn(filter === 'canceled_admin')}
        >Отменено админом</button>
      </div>

            {/* === СПИСОК ЗАПИСЕЙ === */}
      <div style={{ marginTop: 20 }}>
        {filtered.map(b => (
          <div key={b.id} style={itemCard}>

            {/* Верхняя строка: дата, время */}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: dotColor(b),
                    boxShadow: `0 0 6px ${dotColor(b)}`,
                    display: 'inline-block'
                  }}
                />
                <b>{fmtDate(b.start)}</b>
              </div>

              <div style={{ opacity: 0.9 }}>
                {fmtTime(b.start)} – {fmtTime(b.end)}
              </div>
            </div>

            {/* Теги услуг */}
            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {b.services?.map(s => (
                <span
                  key={s}
                  style={{
                    padding: '5px 10px',
                    background: 'rgba(255,255,255,0.07)',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.18)',
                    fontSize: 13,
                    color: 'white'
                  }}
                >
                  {s}
                </span>
              ))}
            </div>

            {/* Клиент */}
            <div style={{ marginTop: 14 }}>
              <b>{b.userName}</b><br />
              <span style={{ opacity: 0.8 }}>{b.userPhone}</span>
              {b.userInstagram && (
                <div style={{ opacity: 0.8 }}>IG: {b.userInstagram}</div>
              )}
            </div>

            {/* Цена аванса */}
            <div style={{ marginTop: 14 }}>
              <div style={{ opacity: 0.8 }}>Avansas (€):</div>
              <input
                type="number"
                value={b.price || ''}
                onChange={(e) =>
                  updateBooking(b.id, { price: e.target.value })
                }
                style={{
                  marginTop: 4,
                  width: 120,
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'white'
                }}
              />
            </div>

            {/* Статус */}
            <div style={{ marginTop: 14, fontSize: 14 }}>
              <span style={{ fontWeight: 600 }}>Статус: </span>
              {statusText(b)}
            </div>

            {/* Кнопки действий */}
            <div style={{ marginTop: 18 }}>
              {/* Пометить оплаченной */}
              {(b.status === 'pending' || b.status === 'approved') && (
                <button
                  style={paidBtn}
                  onClick={() => markPaid(b)}
                >
                  Пометить оплаченной
                </button>
              )}

              {/* Подтвердить */}
              {b.status === 'pending' && (
                <button
                  style={approveBtn}
                  onClick={() => approveBooking(b)}
                >
                  Подтвердить
                </button>
              )}

              {/* Отменить */}
              {b.status !== 'canceled_admin' &&
                b.status !== 'canceled_client' &&
                b.status !== 'approved_paid' && (
                <button
                  style={cancelBtn}
                  onClick={() => cancelAdmin(b)}
                >
                  Отменить
                </button>
              )}
            </div>

          </div>
        ))}

        {!filtered.length && (
          <div style={{ opacity: 0.7, marginTop: 20 }}>Нет записей</div>
        )}
      </div>
    </div>
  )
}

/* === СТИЛИ и вспомогательные функции === */

const searchBox = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(255,255,255,0.08)',
  color: 'white',
  marginBottom: 16
}

const tabs = {
  display: 'flex',
  gap: 8,
  marginBottom: 10
}

const tab = (active) => ({
  padding: '10px 20px',
  borderRadius: 12,
  background: active ? 'rgba(140,68,255,0.35)' : 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.15)',
  color: '#fff',
  cursor: 'pointer',
  transition: '0.25s'
})

const exportBtn = {
  marginLeft: 'auto',
  padding: '10px 18px',
  borderRadius: 12,
  background: 'linear-gradient(90deg, #7c3aed, #6d28d9)',
  border: '1px solid rgba(255,255,255,0.2)',
  color: 'white',
  cursor: 'pointer'
}

const counters = {
  opacity: 0.75,
  fontSize: 13,
  marginBottom: 12
}

const itemCard = {
  marginTop: 16,
  background: 'rgba(18,12,28,0.85)',
  borderRadius: 16,
  padding: 18,
  border: '1px solid rgba(140,68,255,0.25)',
  boxShadow: '0 0 18px rgba(140,68,255,0.15)'
}

const paidBtn = {
  width: '100%',
  marginTop: 10,
  padding: '10px 14px',
  borderRadius: 10,
  cursor: 'pointer',
  background: 'rgba(50,200,120,0.25)',
  border: '1px solid #22c55e',
  color: '#22c55e',
  fontSize: 15
}

const approveBtn = {
  width: '100%',
  marginTop: 10,
  padding: '10px 14px',
  borderRadius: 10,
  cursor: 'pointer',
  background: 'linear-gradient(90deg,#7c3aed,#6d28d9)',
  border: '1px solid rgba(255,255,255,0.25)',
  color: 'white',
  fontSize: 15
}

const cancelBtn = {
  width: '100%',
  marginTop: 10,
  padding: '10px 14px',
  borderRadius: 10,
  cursor: 'pointer',
  background: 'rgba(120,30,60,0.45)',
  border: '1px solid rgba(200,80,120,0.5)',
  color: 'white',
  fontSize: 15
}

/* === ЦВЕТ ТОЧКИ СТАТУСА === */
function dotColor(b) {
  if (b.status === 'approved_paid') return '#4ade80'   // зелёный — оплачено
  if (b.status === 'approved') return '#22c55e'        // зелёный — подтверждено
  if (b.status === 'pending') return '#facc15'         // жёлтый — ожидает
  if (b.status === 'canceled_client') return '#f87171' // красный — клиент
  if (b.status === 'canceled_admin') return '#ef4444'  // красный — админ
  return '#9ca3af'
}

/* === ТЕКСТОВЫЕ СТАТУСЫ === */
function statusText(b) {
  if (b.status === 'approved_paid') return '🟢 Оплачено и подтверждено'
  if (b.status === 'approved') return '🟢 Бронирование подтверждено'
  if (b.status === 'pending') return '🟡 Ожидает подтверждения'
  if (b.status === 'canceled_client') return '❌ Отменено клиентом'
  if (b.status === 'canceled_admin') return '🔴 Отменено администратором'
  return b.status
}
