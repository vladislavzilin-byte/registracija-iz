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
import { getSettings } from "../lib/storage";
// Цвета для тегов услуг
const tagColors = {
  'Šukuosena': '#c084fc',
  'Tresų nuoma': '#60a5fa',
  'Papuošalų nuoma': '#f472b6',
  'Atvykimas': '#facc15',
  'Konsultacija': '#34d399'
}
// грузим правильный ключ, тот что использует Admin.jsx
const settings = getSettings();

// теперь данные точно подставятся
const BANK_DETAILS = {
  receiver: settings.masterName || "—",
  iban: settings.adminIban || "—",
  descriptionPrefix: "Rezervacija",
};

// helper: бронь считается оплаченной,
// если флаг paid = true или старый статус 'approved_paid'
const isPaid = (b) => !!(b?.paid || b?.status === 'approved_paid')

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
  const [filter, setFilter] = useState('all') // all | active | history
  const [confirmId, setConfirmId] = useState(null)
  const [version, setVersion] = useState(0)
  const [modal, setModal] = useState(false)
  const [approvedModal, setApprovedModal] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  // модалка оплаты
  const [paymentBooking, setPaymentBooking] = useState(null)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError] = useState('')

// читаем брони при каждом рендере (обновление через version)
const bookingsAll = getBookings()
const all = bookingsAll
  .filter(b => user && b.userPhone === user.phone)
  .sort((a, b) => new Date(a.start) - new Date(b.start))

// === ФИЛЬТРЫ: Все / Активные / История ===
const list = useMemo(() => {
  const now = new Date()

  // АКТИВНЫЕ — только будущие и не отменённые
  if (filter === 'active') {
    return all.filter(b => {
      const end = new Date(b.end)
      const canceled =
        b.status === 'canceled_client' || b.status === 'canceled_admin'
      return end > now && !canceled
    })
  }

  // ИСТОРИЯ — только прошедшие записи (без отменённых)
  if (filter === 'history') {
    return all.filter(b => {
      const end = new Date(b.end)
      const canceled =
        b.status === 'canceled_client' || b.status === 'canceled_admin'
      return end < now && !canceled
    })
  }

  // ВСЕ
  return all
}, [filter, version, bookingsAll.length])

  // пуш-уведомление когда бронь подтверждена админом
  useEffect(() => {
    const prev = JSON.parse(localStorage.getItem('prevBookings') || '[]')
    const approvedNow = all.find(
      b =>
        (b.status === 'approved' || b.status === 'approved_paid') &&
        !prev.find(p =>
          p.id === b.id &&
          (p.status === 'approved' || p.status === 'approved_paid')
        )
    )
    if (approvedNow) {
      setApprovedModal(true)
      setTimeout(() => setApprovedModal(false), 2500)
    }
    localStorage.setItem('prevBookings', JSON.stringify(all))
  }, [all])

  // авто-синхронизация с админкой
  useEffect(() => {
    const onStorage = (e) => {
      if (!e.key || e.key === 'iz.bookings.v7') {
        setVersion(v => v + 1)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

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

  // === МОДАЛКА ОПЛАТЫ ===
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

    // банковский перевод — только инструкции, без реальной оплаты
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

  // === КВИТАНЦИЯ (HTML → печать → PDF пользователем) ===
  const downloadReceipt = (b) => {
    try {
      const win = window.open('', '_blank', 'width=700,height=900')
      if (!win) return

      const dateStr = fmtDate(b.start)
      const timeStr = `${fmtTime(b.start)} – ${fmtTime(b.end)}`
      const createdStr = b.createdAt
        ? new Date(b.createdAt).toLocaleString('lt-LT')
        : new Date(b.start).toLocaleString('lt-LT')
      const servicesStr = (b.services || []).join(', ') || '—'
      const paidLabel = isPaid(b) ? 'Оплачено' : 'Не оплачено'

      // vCard для QR-визитки
      const vcard = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        'N:Žilina;Irina;;;',
        'FN:Irina Žilina',
        'ORG:IZ HAIR TREND',
        'TEL;TYPE=CELL,VOICE:+37060128458',
        'EMAIL;TYPE=WORK:info@izhairtrend.lt',
        'URL:https://izhairtrend.lt',
        'ADR;TYPE=WORK:;;Sodo g. 2a;Klaipeda;;;LT',
        'NOTE:Šukuosenų meistrė',
        'END:VCARD'
      ].join('\n')

      const qrUrl =
        'https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=' +
        encodeURIComponent(vcard)

      const html = `<!doctype html>
<html>
<head>
  <meta charSet="utf-8" />
  <title>Квитанция #${b.id.slice(0, 6)}</title>
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0b0217;
      color: #f9fafb;
      margin: 0;
      padding: 24px;
    }
    .wrap {
      max-width: 640px;
      margin: 0 auto;
      border-radius: 16px;
      border: 1px solid rgba(168,85,247,0.5);
      background: radial-gradient(circle at top left, rgba(168,85,247,0.2), transparent 55%),
                  radial-gradient(circle at bottom right, rgba(56,189,248,0.15), transparent 60%),
                  rgba(15,23,42,0.95);
      padding: 24px 28px 28px;
    }
    .sub {
      font-size: 13px;
      opacity: 0.75;
    }
    .title {
      margin-top: 16px;
      font-size: 20px;
      font-weight: 700;
    }
    .top-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }
    .top-left {
      text-align: left;
    }
    .top-right {
      text-align: right;
      font-size: 12px;
      opacity: 0.9;
    }
    .section {
      margin-top: 16px;
      padding-top: 10px;
      border-top: 1px dashed rgba(148,163,184,0.5);
      font-size: 14px;
    }
    .row {
      display: flex;
      justify-content: space между;
      justify-content: space-between;
      gap: 12px;
      margin: 4px 0;
    }
    .label {
      opacity: 0.8;
    }
    .value {
      font-weight: 500;
      text-align: right;
    }
    .services {
      margin-top: 8px;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .tag {
      padding: 4px 10px;
      border-radius: 999px;
      border: 1px solid rgba(168,85,247,0.7);
      background: rgba(30,64,175,0.35);
      font-size: 12px;
    }
    .footer {
      margin-top: 18px;
      font-size: 11px;
      opacity: 0.75;
      line-height: 1.5;
    }
    .qr-label {
      font-size: 11px;
      margin-top: 4px;
      opacity: 0.8;
    }
  </style>
</head>
<body>
  <div class="wrap">

    <div class="top-row">
      <div class="top-left">
        <img src="/logo2.svg" style="height:100px; margin-bottom:6px;" />
        <div class="sub">Kvitancija už rezervaciją</div>
      </div>

      <div class="top-right">
        Nr.: <b>#${b.id.slice(0, 6)}</b><br/>
        Sukurta: ${createdStr}<br/>

        <img src="${qrUrl}" alt="IZ HAIR TREND vCard"
             style="
               margin-top:10px;
               border-radius:10px;
               border:1px solid rgba(148,163,184,0.6);
               padding:6px;
               background:rgba(15,23,42,0.9);
               width:90px;
               height:90px;
             "/>

        <div class="qr-label">
          Skenuokite ir išsaugokite kontaktą
        </div>
      </div>
    </div>

    <div class="title">Kvitancija</div>

    <div class="section">
      <div class="row">
        <div class="label">Klientas:</div>
        <div class="value">${b.userName || '-'}</div>
      </div>
      <div class="row">
        <div class="label">Telefonas:</div>
        <div class="value">${b.userPhone || '-'}</div>
      </div>
      <div class="row">
        <div class="label">El. paštas:</div>
        <div class="value">${b.userEmail || '-'}</div>
      </div>
    </div>

    <div class="section">
      <div class="row">
        <div class="label">Data:</div>
        <div class="value">${dateStr}</div>
      </div>
      <div class="row">
        <div class="label">Laikas:</div>
        <div class="value">${timeStr}</div>
      </div>
      <div class="row">
        <div class="label">Paslaugos:</div>
        <div class="value">${servicesStr}</div>
      </div>
      <div class="services">
        ${(b.services || []).map(s => `<span class="tag">${s}</span>`).join('')}
      </div>
    </div>

    <div class="section">
      <div class="row">
        <div class="label">Avansas:</div>
        <div class="value">${b.price ? `${b.price} €` : '—'}</div>
      </div>
      <div class="row">
        <div class="label">Mokėjimo būsena:</div>
        <div class="value">${paidLabel}</div>
      </div>
    </div>

    <div class="footer">
      Ši kvitancija sugeneruota internetu ir galioja be parašo.<br/>
      Jei reikia, galite ją išsisaugoti kaip PDF: naršyklėje pasirinkite "Spausdinti" → "Save as PDF".
    </div>
  </div>

  <script>
    window.focus();
    setTimeout(function(){
      window.print();
    }, 400);
  </script>
</body>
</html>`

      win.document.open()
      win.document.write(html)
      win.document.close()
    } catch (e) {
      console.error('Receipt error', e)
    }
  }

  if (!user) {
    return (
      <div className="card">
        <b>{t('login_or_register')}</b>
      </div>
    )
  }

  // === ЛАМПОЧКИ СТАТУСОВ ===
  const lamp = (color) => ({
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: color,
    boxShadow: `0 0 8px ${color}`,
    display: 'inline-block'
  })

  const statusDot = (b) => {
    const paid = isPaid(b)

    if (b.status === 'approved' || b.status === 'approved_paid') {
      // зелёная если оплачено, оранжевая если ещё ждём оплату
      return <span style={lamp(paid ? '#22c55e' : '#f97316')} />
    }

    if (b.status === 'pending') {
      return <span style={lamp('#facc15')} />
    }

    // отменённые / прочее
    return <span style={lamp('#6b7280')} />
  }

  const statusText = (b) => {
    const paid = isPaid(b)

    if (b.status === 'approved' || b.status === 'approved_paid') {
      if (paid) return 'Бронирование подтверждено • Оплачено'
      return 'Бронирование подтверждено • Ожидает оплаты'
    }

    if (b.status === 'pending') {
      return paid
        ? 'Ожидает подтверждения • Оплачено'
        : 'Ожидает подтверждения • Не оплачено'
    }

    if (b.status === 'canceled_client') return 'Отменено клиентом'
    if (b.status === 'canceled_admin') return 'Отменено администратором'

    return b.status
  }

  return (
    <div style={container}>

      {/* ==== MOBILE NO-ZOOM PATCH ==== */}
      <style
  dangerouslySetInnerHTML={{
    __html: `
      @media (max-width: 768px) {
        input, select, textarea, button {
          font-size: 16px !important;
        }
      }
    `
  }}
/>

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
                  onChange={e =>
                    setForm({ ...form, phone: e.target.value })
                  }
                />
              </div>
              <div>
                <label>Email</label>
                <input
                  value={form.email}
                  onChange={e =>
                    setForm({ ...form, email: e.target.value })
                  }
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
              style={filterBtn(filter === 'history')}
              onClick={() => setFilter('history')}
            >
              История
            </button>
          </div>
        </div>

        <div className="mobile-list">
          {list.map(b => {
            const canCancel =
              (b.status === 'pending' ||
                b.status === 'approved' ||
                b.status === 'approved_paid') &&
              new Date(b.end) > new Date()
            const paid = isPaid(b)
            const shortId = b.id.slice(0, 6)

            return (
              <div key={b.id} style={cardItem}>
                {/* HEADER: дата + лампочка + квитанция справа */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10
                    }}
                  >
                    {statusDot(b)}
                    <b>{fmtDate(b.start)}</b>
                  </div>

                  {paid && (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: 3
                      }}
                    >
                      <button
                        type="button"
                        style={receiptBtn}
                        onClick={() => downloadReceipt(b)}
                      >
                        🧾 Скачать квитанцию
                      </button>
                      <div
                        style={{
                          fontSize: 11,
                          opacity: 0.75
                        }}
                      >
                        Nr. kvitancii: <b>#{shortId}</b>
                      </div>
                    </div>
                  )}
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

          {/* СТАТУСЫ В ВИДЕ БЕЙДЖЕЙ */}
<div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
  {/* Статус подтверждения */}
  <span
    style={{
      padding: '4px 10px',
      borderRadius: 8,
      fontSize: 13,
      border: '1px solid rgba(255,255,255,0.15)',
      background:
        b.status === 'approved' || b.status === 'approved_paid'
          ? 'rgba(168,85,247,0.25)'          // фиолетовый
          : b.status === 'pending'
          ? 'rgba(250,204,21,0.25)'          // жёлтый
          : 'rgba(107,114,128,0.25)',         // серый
      color:
        b.status === 'approved' || b.status === 'approved_paid'
          ? '#d8b4fe'
          : b.status === 'pending'
          ? '#fde047'
          : '#d1d5db'
    }}
  >
    {b.status === 'approved' || b.status === 'approved_paid'
      ? 'Бронирование подтверждено'
      : b.status === 'pending'
      ? 'Ожидает подтверждения'
      : 'Отменено'}
  </span>

  {/* Статус оплаты */}
  <span
    style={{
      padding: '4px 10px',
      borderRadius: 8,
      fontSize: 13,
      border: '1px solid rgba(255,255,255,0.15)',
      background: isPaid(b)
        ? 'rgba(34,197,94,0.25)' // зелёный
        : 'rgba(239,68,68,0.25)', // красный
      color: isPaid(b) ? '#4ade80' : '#fca5a5'
    }}
  >
    {isPaid(b) ? 'Оплачено' : 'Не оплачено'}
  </span>
</div>

                {/* Оплата — только если ещё не оплачено */}
                {(b.status === 'pending' ||
                  b.status === 'approved' ||
                  b.status === 'approved_paid') &&
                  !paid && (
                    <button
                      style={payBtn}
                      onClick={() => openPaymentModal(b)}
                    >
                      💳 Apmokėti
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
              {fmtDate(paymentBooking.start)} • {fmtTime(paymentBooking.start)} –{' '}
              {fmtTime(paymentBooking.end)}
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

            {/* Реквизиты (без QR) */}
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
              <b>Banko duomenys:</b>
              <br />
           Gavėjas: {BANK_DETAILS.receiver || '—'}
<br />
IBAN: {BANK_DETAILS.iban || '—'}
              <br />
              Paskirtis: {BANK_DETAILS.descriptionPrefix} #{paymentBooking.id.slice(0, 6)}
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

/* ==== СТИЛИ ==== */

const container = { paddingBottom: '40px' }

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
  padding: '6px 10px',
  borderRadius: 8,
  border: '1px solid rgba(148,163,184,0.7)',
  background: 'rgba(15,23,42,0.9)',
  color: '#e5e7eb',
  fontSize: 12,
  cursor: 'pointer',
  whiteSpace: 'nowrap'
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
