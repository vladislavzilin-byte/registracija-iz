import React, { useEffect, useMemo, useState } from 'react'
import {
  getCurrentUser,
  getBookings,
  saveBookings,
  fmtDate,
  fmtTime,
  getUsers,
  saveUsers,
  setCurrentUser
} from '../lib/storage'
import { useI18n } from '../lib/i18n'

// Цвета для тегов услуг
const tagColors = {
  'Šukuosena': '#c084fc',
  'Tresų nuoma': '#60a5fa',
  'Papuošalų nuoma': '#f472b6',
  'Atvykimas': '#facc15',
  'Konsultacija': '#34d399'
}

// Реквизиты для банковского перевода
const BANK_DETAILS = {
  iban: 'LT00 0000 0000 0000 0000',
  receiver: 'IZ HAIR TREND',
  descriptionPrefix: 'Rezervacija'
}

export default function MyBookings() {
  const { t } = useI18n()
  const user = getCurrentUser()

  const [form, setForm] = useState({
    name: user?.name || '',
    instagram: user?.instagram || '',
    phone: user?.phone || '',
    email: user?.email || '',
    password: user?.password || ''
  })
  const [errors, setErrors] = useState({})
  const [filter, setFilter] = useState('all')
  const [confirmId, setConfirmId] = useState(null)
  const [version, setVersion] = useState(0)
  const [modal, setModal] = useState(false)
  const [approvedModal, setApprovedModal] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  // модалка оплаты
  const [paymentBooking, setPaymentBooking] = useState(null)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError] = useState('')

  const bookingsAll = getBookings()
  const all = bookingsAll
    .filter(b => user && b.userPhone === user.phone)
    .sort((a, b) => new Date(a.start) - new Date(b.start))

  const list = useMemo(() => {
    if (filter === 'active') {
      // активные = все не отменённые
      return all.filter(
        b =>
          b.status === 'approved' ||
          b.status === 'pending'
      )
    }
    if (filter === 'canceled') {
      return all.filter(
        b => b.status === 'canceled_client' || b.status === 'canceled_admin'
      )
    }
    return all
  }, [filter, version, bookingsAll.length])

  // пуш-окно если запись подтверждена
  useEffect(() => {
    const prev = JSON.parse(localStorage.getItem('prevBookings') || '[]')
    const approvedNow = all.find(
      b =>
        b.status === 'approved' &&
        !prev.find(p => p.id === b.id && p.status === 'approved')
    )
    if (approvedNow) {
      setApprovedModal(true)
      setTimeout(() => setApprovedModal(false), 2500)
    }
    localStorage.setItem('prevBookings', JSON.stringify(all))
  }, [all])

  const validate = () => {
    const e = {}
    if (!form.phone && !form.email) e.contact = 'Нужен телефон или email'
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Некорректный email'
    if (form.phone && !/^[+\d][\d\s\-()]{5,}$/.test(form.phone)) e.phone = 'Некорректный телефон'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const saveProfile = (ev) => {
    ev.preventDefault()
    if (!validate()) return

    const users = getUsers()
    const idx = users.findIndex(u =>
      (u.phone && u.phone === user.phone) ||
      (u.email && u.email === user.email)
    )

    const updated = { ...user, ...form }
    if (idx >= 0) users[idx] = updated
    else users.push(updated)
    saveUsers(users)
    setCurrentUser(updated)

    // обновляем записи пользователя
    const bookings = getBookings().map(b =>
      (b.userEmail === user.email || b.userPhone === user.phone)
        ? {
            ...b,
            userName: updated.name,
            userPhone: updated.phone,
            userInstagram: updated.instagram,
            userEmail: updated.email
          }
        : b
    )
    saveBookings(bookings)
    window.dispatchEvent(new Event('profileUpdated'))

    setModal(true)
    setTimeout(() => setModal(false), 2000)
  }

  const cancel = (id) => setConfirmId(id)
  const doCancel = () => {
    const id = confirmId
    const arr = getBookings().map(b =>
      b.id === id
        ? { ...b, status: 'canceled_client', canceledAt: new Date().toISOString() }
        : b
    )
    saveBookings(arr)
    setConfirmId(null)
    setVersion(v => v + 1)
  }

  // === ОПЛАТА ===
  const openPaymentModal = (booking) => {
    setPaymentBooking(booking)
    setPaymentError('')
    setPaymentLoading(false)
  }

  const closePaymentModal = () => {
    setPaymentBooking(null)
    setPaymentError('')
    setPaymentLoading(false)
  }

  const startPayment = async (method) => {
    if (!paymentBooking) return

    // банковский перевод — просто показываем реквизиты
    if (method === 'bank') return

    try {
      setPaymentLoading(true)
      setPaymentError('')

      const res = await fetch('/api/payments/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: paymentBooking.id,
          method
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Payment error')

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl
      } else {
        setPaymentError('Не удалось получить ссылку на оплату')
      }
    } catch (err) {
      console.error(err)
      setPaymentError(err.message || 'Payment error')
    } finally {
      setPaymentLoading(false)
    }
  }

  // === КВИТАНЦИЯ ===
  const downloadReceipt = (booking) => {
    try {
      const logoUrl = `${window.location.origin}/logo2.svg`
      const html = buildReceiptHtml(booking, logoUrl)
      const win = window.open('', '_blank')

      if (!win) return

      win.document.write(html)
      win.document.close()

      // Небольшая задержка, чтобы всё отрисовалось, и сразу Print → Save as PDF
      setTimeout(() => {
        win.focus()
        win.print()
      }, 300)
    } catch (e) {
      console.error(e)
      alert('Не удалось открыть квитанцию. Попробуйте отключить блокировщик всплывающих окон.')
    }
  }

  if (!user) {
    return (
      <div className="card">
        <b>{t('login_or_register')}</b>
      </div>
    )
  }

  const statusDot = (b) => {
    if (b.status === 'approved') {
      return (
        <span
          style={{
            ...dot,
            background: '#22c55e',
            boxShadow: '0 0 8px #22c55e'
          }}
        />
      )
    }
    if (b.status === 'pending') {
      return (
        <span
          style={{
            ...dot,
            background: '#facc15',
            boxShadow: '0 0 6px rgba(250,204,21,0.8)'
          }}
        />
      )
    }
    // отменённые / прочие
    return <span style={{ ...dot, background: '#9ca3af' }} />
  }

  const statusText = (b) => {
    if (b.status === 'approved') return '🟢 Бронирование подтверждено'
    if (b.status === 'pending') return '🟡 Ожидает подтверждения'
    if (b.status === 'canceled_client') return '❌ Отменена клиентом'
    if (b.status === 'canceled_admin') return '🔴 Отменена администратором'
    return b.status
  }

  const paymentStatusText = (b) =>
    b.paid ? '🟢 Apmokėta' : '🟡 Laukiama apmokėjimo'

  return (
    <div style={container}>

      {/* === ПРОФИЛЬ === */}
      <div style={outerCard}>
        <h3 style={{ margin: 0, padding: '10px 20px' }}>Профиль</h3>
        <div style={innerCard}>
          <div style={innerHeader} onClick={() => setShowProfile(!showProfile)}>
            <span
              style={{
                color: '#a855f7',
                transform: showProfile ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: '0.3s'
              }}
            >
              ▾
            </span>
            <span style={{ fontWeight: 600 }}>Редактировать профиль</span>
          </div>

          <div
            style={{
              ...profileBody,
              maxHeight: showProfile ? '900px' : '0',
              opacity: showProfile ? 1 : 0,
              padding: showProfile ? '20px' : '0 20px'
            }}
          >
            <form className="col" style={{ gap: 12 }} onSubmit={saveProfile}>
              <div>
                <label>Имя</label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label>Instagram</label>
                <input
                  value={form.instagram}
                  onChange={e =>
                    setForm({ ...form, instagram: e.target.value })
                  }
                />
              </div>
              <div>
                <label>Телефон</label>
                <input
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div>
                <label>Email</label>
                <input
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <label>Пароль</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e =>
                    setForm({ ...form, password: e.target.value })
                  }
                />
              </div>

              {errors.contact && (
                <div style={{ color: '#f87171' }}>{errors.contact}</div>
              )}

              <button type="submit" style={saveBtn}>
                💾 Сохранить
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* === МОИ ЗАПИСИ === */}
      <div style={bookingsCard}>
        <div style={bookingsHeader}>
          <h3 style={{ margin: 0 }}>Мои записи</h3>

          <div style={filterButtons}>
            <button
              style={filterBtn(filter === 'all')}
              onClick={() => setFilter('all')}
            >
              Все
            </button>
            <button
              style={filterBtn(filter === 'active')}
              onClick={() => setFilter('active')}
            >
              Активные
            </button>
            <button
              style={filterBtn(filter === 'canceled')}
              onClick={() => setFilter('canceled')}
            >
              Отменённые
            </button>
          </div>
        </div>

        <div className="mobile-list">
          {list.map(b => {
            const canCancel =
              (b.status === 'pending' || b.status === 'approved') &&
              new Date(b.end) > new Date()

            const canDownloadReceipt =
              b.status === 'approved' && new Date(b.end) > new Date()

            return (
              <div key={b.id} style={cardItem}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {statusDot(b)}
                  <b>{fmtDate(b.start)}</b>
                </div>

                <div style={{ opacity: 0.8, marginTop: 4 }}>
                  {fmtTime(b.start)} – {fmtTime(b.end)}
                </div>

                {/* Услуги */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 6,
                    marginTop: 8
                  }}
                >
                  {b.services?.map(s => (
                    <span
                      key={s}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 8,
                        background: 'rgba(255,255,255,0.08)',
                        border: `1px solid ${tagColors[s] || '#a855f7'}55`,
                        color: tagColors[s] || '#e5e7eb',
                        fontSize: 13
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>

                {/* Аванс */}
                {b.price && (
                  <div style={{ marginTop: 8, fontSize: 13 }}>
                    <span style={{ opacity: 0.8 }}>Avansas: </span>
                    <b>{b.price} €</b>
                  </div>
                )}

                {/* Статус бронирования */}
                <div style={{ marginTop: 6, fontSize: 13 }}>
                  <span style={{ fontWeight: 600 }}>Бронирование: </span>
                  <span>{statusText(b)}</span>
                </div>

                {/* Статус оплаты */}
                <div style={{ marginTop: 2, fontSize: 13 }}>
                  <span style={{ fontWeight: 600 }}>Оплата: </span>
                  <span>{paymentStatusText(b)}</span>
                </div>

                {/* Кнопка оплаты — только если ещё не оплачено */}
                {!b.paid &&
                  (b.status === 'pending' || b.status === 'approved') && (
                    <button
                      style={payBtn}
                      onClick={() => openPaymentModal(b)}
                    >
                      💳 Apmokėti
                    </button>
                  )}

                {/* Скачать квитанцию — после подтверждения брони */}
                {canDownloadReceipt && (
                  <button
                    style={receiptBtn}
                    onClick={() => downloadReceipt(b)}
                  >
                    📄 Скачать квитанцию
                  </button>
                )}

                {/* Отмена */}
                {canCancel && (
                  <button
                    style={cancelBtn}
                    onClick={() => cancel(b.id)}
                  >
                    Отменить
                  </button>
                )}
              </div>
            )
          })}

          {!list.length && (
            <small className="muted" style={{ opacity: 0.7 }}>
              {t('no_records')}
            </small>
          )}
        </div>
      </div>

      {/* ===== МОДАЛКИ ===== */}

      {modal && (
        <div style={modalBackdrop}>
          <div style={modalBox}>
            <h3>Данные обновлены</h3>
          </div>
        </div>
      )}

      {approvedModal && (
        <div style={modalBackdrop}>
          <div style={modalBox}>
            <h3 style={{ color: '#4ade80' }}>✅ Ваша запись подтверждена!</h3>
          </div>
        </div>
      )}

      {/* Подтверждение отмены */}
      {confirmId && (
        <div style={modalBackdrop}>
          <div style={modalBox}>
            <h3>Отменить запись?</h3>
            <button onClick={doCancel} style={cancelBtn}>
              Да
            </button>
            <button
              onClick={() => setConfirmId(null)}
              style={{ ...cancelBtn, background: 'rgba(80,80,120,0.4)' }}
            >
              Нет
            </button>
          </div>
        </div>
      )}

      {/* Модалка оплаты */}
      {paymentBooking && (
        <div style={modalBackdrop}>
          <div style={modalBox}>
            <h3>Выберите способ оплаты</h3>

            <p style={{ opacity: 0.9 }}>
              {fmtDate(paymentBooking.start)} •{' '}
              {fmtTime(paymentBooking.start)} – {fmtTime(paymentBooking.end)}
            </p>

            {paymentBooking.price && (
              <p>
                Avansas: <b>{paymentBooking.price} €</b>
              </p>
            )}

            {paymentError && (
              <div
                style={{
                  marginBottom: 8,
                  padding: 6,
                  borderRadius: 8,
                  background: 'rgba(127,29,29,0.6)',
                  color: '#fecaca'
                }}
              >
                {paymentError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                disabled={paymentLoading}
                style={payOptionBtn}
                onClick={() => startPayment('paypal')}
              >
                PayPal
              </button>
              <button
                disabled={paymentLoading}
                style={payOptionBtn}
                onClick={() => startPayment('paysera')}
              >
                Paysera
              </button>
              <button
                disabled={paymentLoading}
                style={payOptionBtn}
                onClick={() => startPayment('bank')}
              >
                Banko pavedimas
              </button>
            </div>

            {/* Реквизиты */}
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
              <b>Banko duomenys:</b>
              <br />
              Gavėjas: {BANK_DETAILS.receiver}
              <br />
              IBAN: {BANK_DETAILS.iban}
              <br />
              Paskirtis: {BANK_DETAILS.descriptionPrefix}{' '}
              #{paymentBooking.id.slice(0, 6)}
            </div>

            <button
              onClick={closePaymentModal}
              style={{ ...cancelBtn, marginTop: 14 }}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

/* ====== HTML для квитанции ====== */

function buildReceiptHtml(booking, logoUrl) {
  const dateStr = fmtDate(booking.start)
  const timeStr = `${fmtTime(booking.start)} – ${fmtTime(booking.end)}`
  const services = Array.isArray(booking.services)
    ? booking.services.join(', ')
    : ''
  const avansas = booking.price || 0

  const bookingStatus =
    booking.status === 'approved'
      ? 'Бронирование подтверждено'
      : booking.status === 'pending'
      ? 'Ожидает подтверждения'
      : booking.status === 'canceled_client'
      ? 'Отменена клиентом'
      : booking.status === 'canceled_admin'
      ? 'Отменена администратором'
      : booking.status

  const paymentStatus = booking.paid ? 'Apmokėta' : 'Laukiama apmokėjimo'

  const payUrl = `https://izhairtrend.lt/pay?to=bank&sum=${encodeURIComponent(
    avansas
  )}&id=${encodeURIComponent(booking.id)}`

  const vcard = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'FN:Irina Žilina',
    'ORG:IZ HAIR TREND',
    'TEL:+37060128458',
    'EMAIL:info@izhairtrend.lt',
    'URL:https://izhairtrend.lt',
    'ADR:;;Sodo g. 2a;Klaipėda;;;',
    'NOTE:Šukuosenų meistrė',
    'X-SOCIALPROFILE;type=instagram:https://instagram.com/irinazilina.hairtrend',
    'END:VCARD'
  ].join('\n')

  const payQrSrc =
    'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' +
    encodeURIComponent(payUrl)

  const vcardQrSrc =
    'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' +
    encodeURIComponent(vcard)

  return `
<!DOCTYPE html>
<html lang="lt">
<head>
<meta charset="UTF-8" />
<title>Kvitancija</title>
<style>
  body {
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #0b0714;
    color: #111827;
    padding: 32px;
  }
  .wrapper {
    max-width: 720px;
    margin: 0 auto;
    background: #f9fafb;
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(15,23,42,0.55);
    padding: 28px 32px 32px;
  }
  .logo {
    text-align: center;
    margin-bottom: 20px;
  }
  .logo img {
    max-width: 220px;
    height: auto;
  }
  h1 {
    font-size: 22px;
    text-align: center;
    margin: 0 0 8px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #4b5563;
  }
  .sub {
    text-align: center;
    font-size: 13px;
    color: #6b7280;
    margin-bottom: 20px;
  }
  .section {
    margin-bottom: 14px;
  }
  .section-title {
    font-size: 13px;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin-bottom: 4px;
  }
  .box {
    border-radius: 12px;
    border: 1px solid #e5e7eb;
    background: #ffffff;
    padding: 10px 12px;
    font-size: 14px;
  }
  .grid {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 12px;
  }
  .label {
    color: #6b7280;
    font-size: 13px;
  }
  .value {
    font-weight: 600;
    color: #111827;
  }
  .status-row {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-size: 14px;
  }
  .status-pill {
    padding: 4px 10px;
    border-radius: 999px;
    background: #ecfdf5;
    color: #15803d;
    font-weight: 600;
    font-size: 13px;
  }
  .status-pill.pending {
    background: #fffbeb;
    color: #92400e;
  }
  .status-pill.cancel {
    background: #fef2f2;
    color: #b91c1c;
  }
  .qr-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0,1fr));
    gap: 12px;
    margin-top: 8px;
  }
  .qr-card {
    border-radius: 12px;
    border: 1px solid #e5e7eb;
    background: #ffffff;
    padding: 10px 10px 12px;
    text-align: center;
  }
  .qr-card img {
    width: 160px;
    height: 160px;
  }
  .qr-title {
    font-size: 13px;
    margin-top: 6px;
    color: #374151;
    font-weight: 600;
  }
  .qr-desc {
    font-size: 11px;
    color: #6b7280;
    margin-top: 2px;
  }
  .footer {
    margin-top: 16px;
    font-size: 11px;
    color: #9ca3af;
    text-align: center;
  }
  @media print {
    body {
      background: #ffffff;
      padding: 0;
    }
    .wrapper {
      box-shadow: none;
      border-radius: 0;
    }
  }
</style>
</head>
<body>
  <div class="wrapper">
    <div class="logo">
      <img src="${logoUrl}" alt="IZ HAIR TREND" />
    </div>
    <h1>AVANSO KVITAS</h1>
    <div class="sub">
      Ši kvitas patvirtina avanso gavimą už šukuosenų paslaugą.
    </div>

    <div class="section">
      <div class="section-title">Rezervacijos duomenys</div>
      <div class="box grid">
        <div>
          <div class="label">Data</div>
          <div class="value">${dateStr}</div>
        </div>
        <div>
          <div class="label">Laikas</div>
          <div class="value">${timeStr}</div>
        </div>
        <div>
          <div class="label">Paslaugos</div>
          <div class="value">${services || '—'}</div>
        </div>
        <div>
          <div class="label">Klientas</div>
          <div class="value">${booking.userName || ''}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Avansas</div>
      <div class="box status-row">
        <div>
          <div class="label">Suma</div>
          <div class="value">${avansas} €</div>
        </div>
        <div>
          <div class="label">Būklė</div>
          <div class="status-pill ${
            booking.status === 'approved'
              ? ''
              : booking.status === 'pending'
              ? 'pending'
              : 'cancel'
          }">${bookingStatus}</div>
        </div>
        <div>
          <div class="label">Apmokėjimas</div>
          <div class="status-pill ${
            booking.paid ? '' : 'pending'
          }">${paymentStatus}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">QR kodai</div>
      <div class="qr-grid">
        <div class="qr-card">
          <img src="${payQrSrc}" alt="Pay QR" />
          <div class="qr-title">QR apmokėjimui</div>
          <div class="qr-desc">Atidaro puslapį su apmokėjimo informacija.</div>
        </div>
        <div class="qr-card">
          <img src="${vcardQrSrc}" alt="Contact QR" />
          <div class="qr-title">Kontakto QR (vCard)</div>
          <div class="qr-desc">Įsiminkite Irina Žilina kontaktą telefone.</div>
        </div>
      </div>
    </div>

    <div class="footer">
      Kvitas sugeneruotas automatiškai iš rezervacijos sistemos izhairtrend.lt
    </div>
  </div>
</body>
</html>
`
}

/* ==== СТИЛИ КОМПОНЕНТА ==== */

const container = { paddingBottom: '40px' }
const dot = { width: 12, height: 12, borderRadius: '50%', display: 'inline-block' }

const outerCard = {
  background: 'rgba(15,10,25,0.9)',
  border: '1px solid rgba(168,85,247,0.3)',
  borderRadius: 14,
  color: '#fff',
  marginBottom: 24
}

const innerCard = {
  margin: '0 20px 20px',
  border: '1px solid rgba(168,85,247,0.2)',
  borderRadius: 12,
  background: 'rgba(20,10,35,0.8)'
}

const innerHeader = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '12px 16px',
  cursor: 'pointer',
  background: 'rgba(25,15,45,0.8)',
  borderBottom: '1px solid rgba(168,85,247,0.25)'
}

const profileBody = { overflow: 'hidden', transition: 'all 0.45s ease' }

const saveBtn = {
  marginTop: 10,
  width: '100%',
  padding: '10px 20px',
  borderRadius: 10,
  background: 'linear-gradient(180deg,#9333ea,#4c1d95)',
  color: '#fff',
  cursor: 'pointer'
}

const bookingsCard = { ...outerCard, padding: '18px' }
const bookingsHeader = { display: 'flex', justifyContent: 'space-between', marginBottom: 10 }
const filterButtons = { display: 'flex', gap: 8 }

const filterBtn = (active) => ({
  padding: '8px 18px',
  borderRadius: 10,
  background: active ? 'rgba(130,60,255,0.25)' : 'rgba(30,20,40,0.6)',
  border: '1px solid rgba(168,85,247,0.5)',
  color: '#fff',
  cursor: 'pointer'
})

const cardItem = {
  border: '1px solid rgba(168,85,247,0.25)',
  background: 'rgba(20,10,30,0.55)',
  padding: 14,
  borderRadius: 14,
  marginBottom: 12
}

const payBtn = {
  marginTop: 10,
  width: '100%',
  padding: '8px 10px',
  borderRadius: 10,
  background: 'rgba(50,180,80,0.25)',
  border: '1px solid #4ade80',
  color: '#4ade80',
  cursor: 'pointer'
}

const receiptBtn = {
  marginTop: 8,
  width: '100%',
  padding: '8px 10px',
  borderRadius: 10,
  background: 'rgba(129,140,248,0.18)',
  border: '1px solid rgba(129,140,248,0.8)',
  color: '#e5e7eb',
  cursor: 'pointer',
  fontSize: 13
}

const payOptionBtn = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 10,
  border: '1px solid rgba(148,163,184,0.7)',
  background: 'rgba(15,23,42,0.9)',
  color: '#e5e7eb',
  cursor: 'pointer',
  fontSize: 14
}

const cancelBtn = {
  marginTop: 10,
  padding: '8px 12px',
  borderRadius: 10,
  background: 'rgba(120,30,60,0.4)',
  border: '1px solid rgba(200,80,120,0.6)',
  color: '#fff',
  cursor: 'pointer'
}

const modalBackdrop = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 3000
}

const modalBox = {
  background: 'rgba(20,15,35,0.85)',
  borderRadius: 14,
  padding: '24px 32px',
  border: '1px solid rgba(168,85,247,0.3)',
  color: '#fff',
  textAlign: 'center',
  maxWidth: 420,
  width: '90%'
}
