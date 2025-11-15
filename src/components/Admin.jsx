import { useState, useMemo, useEffect } from 'react'
import {
  getSettings,
  saveSettings,
  getBookings,
  saveBookings,
  fmtDate,
  fmtTime,
  getCurrentUser,
} from '../lib/storage'
import { exportBookingsToCSV } from '../lib/export'
import { useI18n } from '../lib/i18n'

const ADMINS = ['irina.abramova7@gmail.com', 'vladislavzilin@gmail.com']

/* ==== ДЕФОЛТНЫЕ УСЛУГИ ==== */
const DEFAULT_SERVICES = [
  { name: 'Šukuosena', duration: 60, deposit: 50 },
  { name: 'Tresų nuoma', duration: 15, deposit: 25 },
  { name: 'Papuošalų nuoma', duration: 15, deposit: 10 },
  { name: 'Atvykimas', duration: 180, deposit: 50 },
  { name: 'Konsultacija', duration: 30, deposit: 10 },
]

/* ==== Цвета тегов ==== */
const serviceStyles = {
  'Šukuosena': {
    bg: 'rgba(99,102,241,0.16)',
    border: '1px solid rgba(129,140,248,0.8)',
  },
  'Tresų nuoma': {
    bg: 'rgba(56,189,248,0.16)',
    border: '1px solid rgba(56,189,248,0.8)',
  },
  'Papuošalų nuoma': {
    bg: 'rgba(245,158,11,0.14)',
    border: '1px solid rgba(245,158,11,0.9)',
  },
  Atvykimas: {
    bg: 'rgba(248,113,113,0.14)',
    border: '1px solid rgba(248,113,113,0.9)',
  },
  Konsultacija: {
    bg: 'rgba(34,197,94,0.14)',
    border: '1px solid rgba(34,197,94,0.9)',
  },
}

/* ==== HELPERS ==== */
const pad2 = (n) => String(n).padStart(2, '0')

function generateTimeList(stepMinutes = 5) {
  const arr = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += stepMinutes) {
      arr.push(`${pad2(h)}:${pad2(m)}`)
    }
  }
  return arr
}

function Admin() {
  const me = getCurrentUser()
  const isAdmin = me && (me.role === 'admin' || ADMINS.includes(me.email))

  if (!isAdmin) {
    return (
      <div className="card">
        <h3>Доступ запрещён</h3>
        <p className="muted">Эта страница доступна только администраторам.</p>
      </div>
    )
  }

  const { t } = useI18n()

  /* ==== STATE ==== */
  const [settings, setSettings] = useState(() => {
    const s = getSettings()
    if (!Array.isArray(s.serviceList) || !s.serviceList.length) {
      s.serviceList = [...DEFAULT_SERVICES]
      saveSettings(s)
    }
    return s
  })

  const [bookings, setBookings] = useState(getBookings())
  const [showSettings, setShowSettings] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [toast, setToast] = useState(null)

  const updateSettings = (patch) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    saveSettings(next)
  }

  /* ==== LISTEN PROFILE SYNC ==== */
  useEffect(() => {
    const handler = () => setBookings(getBookings())
    window.addEventListener('profileUpdated', handler)
    return () => window.removeEventListener('profileUpdated', handler)
  }, [])

  /* ==== СТАТИСТИКА ==== */
  const stats = useMemo(() => {
    const total = bookings.length
    const active = bookings.filter(
      (b) => b.status === 'approved' || b.status === 'pending'
    ).length
    const canceled = bookings.filter(
      (b) => b.status === 'canceled_client' || b.status === 'canceled_admin'
    ).length
    return { total, active, canceled }
  }, [bookings])

  /* ==== ФИЛЬТР ==== */
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()

    const arr = bookings.filter((b) => {
      const matchQ =
        !q ||
        b.userName?.toLowerCase().includes(q) ||
        b.userPhone?.toLowerCase().includes(q) ||
        b.userInstagram?.toLowerCase().includes(q)

      const matchStatus =
        statusFilter === 'all'
          ? true
          : b.status === statusFilter

      return matchQ && matchStatus
    })

    arr.sort((a, b) => new Date(a.start) - new Date(b.start))
    return arr
  }, [bookings, search, statusFilter])

  /* ==== UPDATE BOOKING ==== */
  const updateBooking = (id, updater) => {
    const all = getBookings()
    const next = all.map((b) => (b.id === id ? updater(b) : b))
    saveBookings(next)
    setBookings(next)
  }

  const cancelByAdmin = (id) => {
    if (!confirm('Отменить эту запись?')) return
    updateBooking(id, (b) => ({
      ...b,
      status: 'canceled_admin',
      canceledAt: new Date().toISOString(),
    }))
  }

  const approveByAdmin = (id) =>
    updateBooking(id, (b) => ({
      ...b,
      status: 'approved',
      approvedAt: new Date().toISOString(),
    }))

  const togglePaid = (id) =>
    updateBooking(id, (b) => ({ ...b, paid: !b.paid }))

  const handleExport = () => {
    const { name, count } = exportBookingsToCSV(filtered)
    setToast(`✅ ${t('export')} ${count} → ${name}`)
    setTimeout(() => setToast(null), 3500)
  }

  /* ==== УСЛУГИ ==== */
  const services = settings.serviceList || []

  const updateServiceField = (idx, field, value) => {
    const next = [...services]
    next[idx] = {
      ...next[idx],
      [field]:
        field === 'duration' || field === 'deposit'
          ? Number(value) || 0
          : value,
    }
    updateSettings({ serviceList: next })
  }

  const addService = () => {
    const next = [...services, { name: 'Новая услуга', duration: 60, deposit: 0 }]
    updateSettings({ serviceList: next })
  }

  const removeService = (idx) => {
    if (services.length <= 1) return
    const next = services.filter((_, i) => i !== idx)
    updateSettings({ serviceList: next })
  }

  const timeList = generateTimeList(5) // каждые 5 минут

  return (
    <div className="col" style={{ gap: 16 }}>
      {/* === РЕДАКТИРОВАТЬ НАСТРОЙКИ === */}
      <div style={{ width: '100%' }}>
        <div style={cardAurora}>
          <button
            onClick={() => setShowSettings((s) => !s)}
            style={headerToggle}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <Chevron open={showSettings} />
              <span style={{ fontWeight: 700 }}>Редактировать настройки</span>
            </span>
          </button>

          <div
            style={{
              maxHeight: showSettings ? 1500 : 0,
              overflow: 'hidden',
              transition: 'max-height .35s ease',
            }}
          >
            <div style={{ paddingTop: 14 }}>
              {/* ==== БАЗОВЫЕ НАСТРОЙКИ ==== */}
              <div className="row" style={{ gap: 12 }}>
                <div className="col">
                  <label style={labelStyle}>Имя мастера</label>
                  <input
                    style={inputGlass}
                    value={settings.masterName}
                    onChange={(e) =>
                      updateSettings({ masterName: e.target.value })
                    }
                  />
                </div>

                <div className="col">
                  <label style={labelStyle}>Телефон администратора</label>
                  <input
                    style={inputGlass}
                    value={settings.adminPhone}
                    onChange={(e) =>
                      updateSettings({ adminPhone: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* ==== ВРЕМЯ РАБОТЫ ==== */}
              <div
                className="row"
                style={{ gap: 12, marginTop: 12, marginBottom: 8 }}
              >
                <div className="col">
                  <label style={labelStyle}>Начало дня</label>
                  <select
                    style={inputGlass}
                    value={settings.workStart}
                    onChange={(e) =>
                      updateSettings({ workStart: e.target.value })
                    }
                  >
                    {timeList.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col">
                  <label style={labelStyle}>Конец дня</label>
                  <select
                    style={inputGlass}
                    value={settings.workEnd}
                    onChange={(e) =>
                      updateSettings({ workEnd: e.target.value })
                    }
                  >
                    {timeList.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col">
                  <label style={labelStyle}>Длительность слота (мин)</label>
                  <select
                    style={inputGlass}
                    value={settings.slotMinutes}
                    onChange={(e) =>
                      updateSettings({ slotMinutes: Number(e.target.value) })
                    }
                  >
                    {[5, 10, 15, 20, 30, 60].map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ==== УСЛУГИ ==== */}
              <div
                style={{
                  marginTop: 18,
                  paddingTop: 14,
                  borderTop: '1px solid rgba(148,85,247,0.35)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Услуги</div>
                    <div
                      style={{
                        fontSize: 12,
                        opacity: 0.75,
                        maxWidth: 450,
                      }}
                    >
                      Вы можете менять название, длительность и сумму аванса
                      каждой услуги.
                    </div>
                  </div>

                  <button type="button" style={btnPrimary} onClick={addService}>
                    + Добавить услугу
                  </button>
                </div>

                {/* Список услуг */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    marginTop: 6,
                  }}
                >
                  {services.map((s, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          'minmax(140px, 1.4fr) minmax(80px, .7fr) minmax(80px, .7fr) auto',
                        gap: 8,
                        alignItems: 'center',
                      }}
                    >
                      <input
                        style={inputGlass}
                        value={s.name}
                        onChange={(e) =>
                          updateServiceField(idx, 'name', e.target.value)
                        }
                        placeholder="Название"
                      />

                      <input
                        style={inputGlass}
                        type="number"
                        min="0"
                        value={s.duration}
                        onChange={(e) =>
                          updateServiceField(idx, 'duration', e.target.value)
                        }
                        placeholder="Минут"
                      />

                      <input
                        style={inputGlass}
                        type="number"
                        min="0"
                        value={s.deposit}
                        onChange={(e) =>
                          updateServiceField(idx, 'deposit', e.target.value)
                        }
                        placeholder="€"
                      />

                      <button
                        onClick={() => removeService(idx)}
                        style={{
                          borderRadius: 10,
                          padding: '8px 10px',
                          border: '1px solid rgba(248,113,113,0.7)',
                          background: 'rgba(127,29,29,0.6)',
                          color: '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* === КАРТОЧКИ ЗАПИСЕЙ === */}
      <div style={{ width: '100%' }}>
        <div style={cardAurora}>
          <div style={topBar}>
            <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>
              Все записи
            </div>
          </div>

          {/* Фильтр */}
          <div
            style={{
              display: 'flex',
              gap: 10,
              margin: '8px 0 12px 0',
              flexWrap: 'wrap',
            }}
          >
            <input
              style={{ ...inputGlass, flex: '1 1 260px' }}
              placeholder="Поиск…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div style={segmented}>
              {[
                { v: 'all', label: 'Все' },
                { v: 'pending', label: 'Ожидает' },
                { v: 'approved', label: 'Подтверждённые' },
                { v: 'canceled_client', label: 'Отменены клиентом' },
                { v: 'canceled_admin', label: 'Отменены админом' },
              ].map((it) => (
                <button
                  key={it.v}
                  onClick={() => setStatusFilter(it.v)}
                  style={{
                    ...segBtn,
                    ...(statusFilter === it.v ? segActive : {}),
                  }}
                >
                  {it.label}
                </button>
              ))}
            </div>

            <button style={{ ...btnPrimary, flex: '1' }} onClick={handleExport}>
              Экспорт
            </button>
          </div>

          <div className="badge" style={{ marginBottom: 10 }}>
            Всего: {stats.total} • Активных: {stats.active} • Отменено:{' '}
            {stats.canceled}
          </div>

           /* ==== УСЛУГИ ==== */
  const services = settings.serviceList || []

  const updateServiceField = (idx, field, value) => {
    const next = [...services]
    next[idx] = {
      ...next[idx],
      [field]:
        field === 'duration' || field === 'deposit'
          ? Number(value) || 0
          : value,
    }
    updateSettings({ serviceList: next })
  }

  const addService = () => {
    const next = [...services, { name: 'Новая услуга', duration: 60, deposit: 0 }]
    updateSettings({ serviceList: next })
  }

  const removeService = (idx) => {
    if (services.length <= 1) return
    const next = services.filter((_, i) => i !== idx)
    updateSettings({ serviceList: next })
  }

  const timeList = generateTimeList(5) // каждые 5 минут

  return (
    <div className="col" style={{ gap: 16 }}>
      {/* === РЕДАКТИРОВАТЬ НАСТРОЙКИ === */}
      <div style={{ width: '100%' }}>
        <div style={cardAurora}>
          <button
            onClick={() => setShowSettings((s) => !s)}
            style={headerToggle}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <Chevron open={showSettings} />
              <span style={{ fontWeight: 700 }}>Редактировать настройки</span>
            </span>
          </button>

          <div
            style={{
              maxHeight: showSettings ? 1500 : 0,
              overflow: 'hidden',
              transition: 'max-height .35s ease',
            }}
          >
            <div style={{ paddingTop: 14 }}>
              {/* ==== БАЗОВЫЕ НАСТРОЙКИ ==== */}
              <div className="row" style={{ gap: 12 }}>
                <div className="col">
                  <label style={labelStyle}>Имя мастера</label>
                  <input
                    style={inputGlass}
                    value={settings.masterName}
                    onChange={(e) =>
                      updateSettings({ masterName: e.target.value })
                    }
                  />
                </div>

                <div className="col">
                  <label style={labelStyle}>Телефон администратора</label>
                  <input
                    style={inputGlass}
                    value={settings.adminPhone}
                    onChange={(e) =>
                      updateSettings({ adminPhone: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* ==== ВРЕМЯ РАБОТЫ ==== */}
              <div
                className="row"
                style={{ gap: 12, marginTop: 12, marginBottom: 8 }}
              >
                <div className="col">
                  <label style={labelStyle}>Начало дня</label>
                  <select
                    style={inputGlass}
                    value={settings.workStart}
                    onChange={(e) =>
                      updateSettings({ workStart: e.target.value })
                    }
                  >
                    {timeList.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col">
                  <label style={labelStyle}>Конец дня</label>
                  <select
                    style={inputGlass}
                    value={settings.workEnd}
                    onChange={(e) =>
                      updateSettings({ workEnd: e.target.value })
                    }
                  >
                    {timeList.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col">
                  <label style={labelStyle}>Длительность слота (мин)</label>
                  <select
                    style={inputGlass}
                    value={settings.slotMinutes}
                    onChange={(e) =>
                      updateSettings({ slotMinutes: Number(e.target.value) })
                    }
                  >
                    {[5, 10, 15, 20, 30, 60].map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ==== УСЛУГИ ==== */}
              <div
                style={{
                  marginTop: 18,
                  paddingTop: 14,
                  borderTop: '1px solid rgba(148,85,247,0.35)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Услуги</div>
                    <div
                      style={{
                        fontSize: 12,
                        opacity: 0.75,
                        maxWidth: 450,
                      }}
                    >
                      Вы можете менять название, длительность и сумму аванса
                      каждой услуги.
                    </div>
                  </div>

                  <button type="button" style={btnPrimary} onClick={addService}>
                    + Добавить услугу
                  </button>
                </div>

                {/* Список услуг */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    marginTop: 6,
                  }}
                >
                  {services.map((s, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          'minmax(140px, 1.4fr) minmax(80px, .7fr) minmax(80px, .7fr) auto',
                        gap: 8,
                        alignItems: 'center',
                      }}
                    >
                      <input
                        style={inputGlass}
                        value={s.name}
                        onChange={(e) =>
                          updateServiceField(idx, 'name', e.target.value)
                        }
                        placeholder="Название"
                      />

                      <input
                        style={inputGlass}
                        type="number"
                        min="0"
                        value={s.duration}
                        onChange={(e) =>
                          updateServiceField(idx, 'duration', e.target.value)
                        }
                        placeholder="Минут"
                      />

                      <input
                        style={inputGlass}
                        type="number"
                        min="0"
                        value={s.deposit}
                        onChange={(e) =>
                          updateServiceField(idx, 'deposit', e.target.value)
                        }
                        placeholder="€"
                      />

                      <button
                        onClick={() => removeService(idx)}
                        style={{
                          borderRadius: 10,
                          padding: '8px 10px',
                          border: '1px solid rgba(248,113,113,0.7)',
                          background: 'rgba(127,29,29,0.6)',
                          color: '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* === КАРТОЧКИ ЗАПИСЕЙ === */}
      <div style={{ width: '100%' }}>
        <div style={cardAurora}>
          <div style={topBar}>
            <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>
              Все записи
            </div>
          </div>

          {/* Фильтр */}
          <div
            style={{
              display: 'flex',
              gap: 10,
              margin: '8px 0 12px 0',
              flexWrap: 'wrap',
            }}
          >
            <input
              style={{ ...inputGlass, flex: '1 1 260px' }}
              placeholder="Поиск…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div style={segmented}>
              {[
                { v: 'all', label: 'Все' },
                { v: 'pending', label: 'Ожидает' },
                { v: 'approved', label: 'Подтверждённые' },
                { v: 'canceled_client', label: 'Отменены клиентом' },
                { v: 'canceled_admin', label: 'Отменены админом' },
              ].map((it) => (
                <button
                  key={it.v}
                  onClick={() => setStatusFilter(it.v)}
                  style={{
                    ...segBtn,
                    ...(statusFilter === it.v ? segActive : {}),
                  }}
                >
                  {it.label}
                </button>
              ))}
            </div>

            <button style={{ ...btnPrimary, flex: '1' }} onClick={handleExport}>
              Экспорт
            </button>
          </div>

          <div className="badge" style={{ marginBottom: 10 }}>
            Всего: {stats.total} • Активных: {stats.active} • Отменено:{' '}
            {stats.canceled}
          </div>
 
