// === FULL UPDATED Admin.jsx WITH 24-HOUR TIME FORMAT ===
// Paste this file directly into your project.

const ADMINS = ['irina.abramova7@gmail.com', 'vladislavzilin@gmail.com']

import { useState, useMemo, useEffect } from 'react'
import {
  getSettings,
  saveSettings,
  getBookings,
  saveBookings,
  getCurrentUser,
} from '../lib/storage'
import { exportBookingsToCSV } from '../lib/export'
import { useI18n } from '../lib/i18n'

// === дефолтные услуги ===
const DEFAULT_SERVICES = [
  { name: 'Šukuosena', duration: 60, deposit: 50 },
  { name: 'Tresų nuoma', duration: 15, deposit: 25 },
  { name: 'Papuošalų nuoma', duration: 15, deposit: 10 },
  { name: 'Atvykimas', duration: 180, deposit: 50 },
  { name: 'Konsultacija', duration: 30, deposit: 10 },
]

// === стили тегов услуг ===
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

/* ===== helpers ===== */
const pad2 = (n) => String(n).padStart(2, '0')

const toInputDate = (dateLike) => {
  const d = new Date(dateLike)
  if (isNaN(d)) return ''
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

// ALWAYS 24H FORMAT
const toInputTime = (dateLike) => {
  const d = new Date(dateLike)
  if (isNaN(d)) return ''
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

export default function Admin() {
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

  // === НАСТРОЙКИ ===
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

  useEffect(() => {
    const handler = () => setBookings(getBookings())
    window.addEventListener('profileUpdated', handler)
    return () => window.removeEventListener('profileUpdated', handler)
  }, [])

  // === СТАТИСТИКА ===
  const stats = useMemo(() => {
    const total = bookings.length
    const active = bookings.filter((b) => b.status === 'approved' || b.status === 'pending').length
    const canceled = bookings.filter((b) => b.status === 'canceled_client' || b.status === 'canceled_admin').length
    return { total, active, canceled }
  }, [bookings])

  // === ФИЛЬТР ===
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    const arr = bookings.filter((b) => {
      const matchQ = !q ||
        (b.userName?.toLowerCase().includes(q) ||
         b.userPhone?.toLowerCase().includes(q) ||
         b.userInstagram?.toLowerCase().includes(q))

      const matchStatus = statusFilter === 'all' ? true : b.status === statusFilter
      return matchQ && matchStatus
    })

    arr.sort((a, b) => new Date(a.start) - new Date(b.start))
    return arr
  }, [bookings, search, statusFilter])

  // === UPDATE BOOKING ===
  const updateBooking = (id, updater) => {
    const all = getBookings()
    const next = all.map((b) => (b.id === id ? updater(b) : b))
    saveBookings(next)
    setBookings(next)
  }

  const cancelByAdmin = (id) => {
    if (!confirm('Отменить эту запись?')) return
    updateBooking(id, (b) => ({ ...b, status: 'canceled_admin', canceledAt: new Date().toISOString() }))
  }

  const approveByAdmin = (id) => {
    updateBooking(id, (b) => ({ ...b, status: 'approved', approvedAt: new Date().toISOString() }))
  }

  const togglePaid = (id) => {
    updateBooking(id, (b) => ({ ...b, paid: !b.paid }))
  }

  const handleExport = () => {
    const { name, count } = exportBookingsToCSV(filtered)
    setToast(`✅ ${t('export')} ${count} → ${name}`)
    setTimeout(() => setToast(null), 3500)
  }

  const statusLabel = (b) =>
    b.status === 'approved'
      ? '🟢 ' + t('approved')
      : b.status === 'pending'
      ? '🟡 ' + t('pending')
      : b.status === 'canceled_client'
      ? '❌ ' + t('canceled_by_client')
      : '🔴 ' + t('canceled_by_admin')

  const services = settings.serviceList || []

  const updateServiceField = (index, field, value) => {
    const next = [...services]
    next[index] = {
      ...next[index],
      [field]: field === 'duration' || field === 'deposit' ? Number(value) || 0 : value,
    }
    updateSettings({ serviceList: next })
  }

  const addService = () => {
    updateSettings({ serviceList: [...services, { name: 'Новая услуга', duration: 60, deposit: 0 }] })
  }

  const removeService = (index) => {
    if (services.length <= 1) return
    updateSettings({ serviceList: services.filter((_, i) => i !== index) })
  }

  return (
    <div className="col" style={{ gap: 16 }}>

      {/* === НАСТРОЙКИ === */}
      <div style={{ width: '100%' }}>
        <div style={cardAurora}>
          <button onClick={() => setShowSettings((s) => !s)} style={headerToggle}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <Chevron open={showSettings} />
              <span style={{ fontWeight: 700 }}>Редактировать настройки</span>
            </span>
          </button>

          <div style={{ maxHeight: showSettings ? 1200 : 0, overflow: 'hidden', transition: 'max-height .35s ease' }}>
            <div style={{ paddingTop
