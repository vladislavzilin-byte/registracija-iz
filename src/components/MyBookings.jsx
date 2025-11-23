import { useEffect, useMemo, useState } from 'react'
import { format, isAfter, isBefore } from 'date-fns'
import { getBookings, saveBookings, getCurrentUser } from '../lib/storage'
import { useI18n } from '../lib/i18n'

function samePerson(user, b) {
  if (!user || !b) return false
  const phoneMatch =
    user.phone && b.userPhone && String(user.phone).trim() === String(b.userPhone).trim()
  const instaMatch =
    user.instagram &&
    b.userInstagram &&
    String(user.instagram).trim().toLowerCase() ===
      String(b.userInstagram).trim().toLowerCase()
  const nameMatch =
    user.name &&
    b.userName &&
    String(user.name).trim().toLowerCase() === String(b.userName).trim().toLowerCase()
  return phoneMatch || instaMatch || nameMatch
}

function formatDate(date) {
  try {
    return format(new Date(date), 'dd.MM.yyyy')
  } catch {
    return ''
  }
}
function formatTime(date) {
  try {
    return format(new Date(date), 'HH:mm')
  } catch {
    return ''
  }
}

export default function MyBookings() {
  const { t } = useI18n()
  const user = getCurrentUser()

  const [filter, setFilter] = useState('upcoming') // all | upcoming | past
  const [selected, setSelected] = useState(null) // бронирование для модалки отмены
  const [loading, setLoading] = useState(false)

  // если нет юзера — просим залогиниться
  if (!user) {
    return (
      <div className="card myb-card-center">
        <p style={{ textAlign: 'center', fontSize: 18, fontWeight: 600 }}>
          {t('login_or_register') || 'Prisijunkite arba užsiregistruokite, kad matytumėte savo rezervacijas.'}
        </p>
      </div>
    )
  }

  const allBookings = getBookings().filter((b) => samePerson(user, b))

  const now = new Date()

  const upcoming = allBookings.filter((b) => {
    const start = new Date(b.start)
    return isAfter(start, now) || +start === +now
  })

  const past = allBookings.filter((b) => {
    const start = new Date(b.start)
    return isBefore(start, now)
  })

  const visibleBookings = useMemo(() => {
    if (filter === 'upcoming') return upcoming.sort((a, b) => +new Date(a.start) - +new Date(b.start))
    if (filter === 'past') return past.sort((a, b) => +new Date(b.start) - +new Date(a.start))
    return allBookings.sort((a, b) => +new Date(b.start) - +new Date(a.start))
  }, [filter, allBookings.length])

  const handleCancel = (booking) => {
    setSelected(booking)
  }

  const confirmCancel = () => {
    if (!selected) return
    setLoading(true)

    const all = getBookings()
    const updated = all.map((b) =>
      b.id === selected.id
        ? {
            ...b,
            status: 'cancelled',
            cancelledAt: new Date().toISOString(),
          }
        : b
    )
    saveBookings(updated)
    setSelected(null)
    setLoading(false)
  }

  const closeModal = () => {
    if (loading) return
    setSelected(null)
  }

  const statusBadge = (status) => {
    const base = {
      padding: '4px 10px',
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 600,
      letterSpacing: 0.4,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid',
    }

    if (status === 'approved') {
      return {
        ...base,
        borderColor: 'rgba(34,197,94,0.6)',
        background: 'rgba(16,185,129,0.12)',
        color: '#bbf7d0',
      }
    }
    if (status === 'cancelled') {
      return {
        ...base,
        borderColor: 'rgba(248,113,113,0.6)',
        background: 'rgba(248,113,113,0.12)',
        color: '#fecaca',
      }
    }
    // pending / default
    return {
      ...base,
      borderColor: 'rgba(250,204,21,0.7)',
      background: 'rgba(234,179,8,0.14)',
      color: '#fef08a',
    }
  }

  const statusLabel = (status) => {
    if (status === 'approved') return t('status_approved') || 'Patvirtinta'
    if (status === 'cancelled') return t('status_cancelled') || 'Atšaukta'
    return t('status_pending') || 'Laukiama patvirtinimo'
  }

  const filterLabel = (key) => {
    if (key === 'all') return t('myb_filter_all') || 'Visos'
    if (key === 'upcoming') return t('myb_filter_upcoming') || 'Ateinančios'
    if (key === 'past') return t('myb_filter_past') || 'Praėjusios'
    return key
  }

  const filterBtnStyle = (key) => ({
    padding: '8px 14px',
    borderRadius: 999,
    border: key === filter ? '1.5px solid rgba(168,85,247,0.9)' : '1px solid rgba(148,163,184,0.45)',
    background:
      key === filter
        ? 'linear-gradient(135deg, rgba(129,140,248,0.35), rgba(168,85,247,0.35))'
        : 'rgba(15,23,42,0.7)',
    color: '#e5e7eb',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    backdropFilter: 'blur(10px)',
    boxShadow:
      key === filter
        ? '0 0 14px rgba(168,85,247,0.65)'
        : '0 0 8px rgba(15,23,42,0.8)',
    transition: 'all 0.22s ease',
    whiteSpace: 'nowrap',
  })

  const canCancel = (b) => {
    if (!b) return false
    const start = new Date(b.start)
    if (isBefore(start, now)) return false
    if (b.status === 'cancelled') return false
    return true
  }

  return (
    <div className="card myb-card-root">
      {/* СТИЛИ ТОЛЬКО ДЛЯ MyBookings */}
      <style>{`
        .myb-card-root {
          position: relative;
          min-height: 100vh;
          padding: 20px 24px 32px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .myb-top {
          display: flex;
          gap: 18px;
          align-items: stretch;
        }

        .myb-profile {
          flex: 0 0 260px;
          border-radius: 20px;
          border: 1px solid rgba(148,163,184,0.45);
          background: radial-gradient(circle at 0 0, rgba(129,140,248,0.18), transparent 60%),
                      rgba(15,23,42,0.95);
          padding: 16px 18px 18px;
          box-shadow:
            0 0 24px rgba(15,23,42,0.8),
            0 0 32px rgba(79,70,229,0.25);
          backdrop-filter: blur(16px);
        }

        .myb-profile-name {
          font-size: 18px;
          font-weight: 700;
          color: #f9fafb;
          margin-bottom: 4px;
        }

        .myb-profile-row {
          font-size: 13px;
          color: #cbd5f5;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .myb-chip-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
        }

        .myb-chip {
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
          color: #e5e7eb;
          border: 1px solid rgba(148,163,184,0.6);
          background: rgba(15,23,42,0.9);
        }

        .myb-filters {
          flex: 1;
          border-radius: 20px;
          border: 1px solid rgba(148,163,184,0.45);
          background: radial-gradient(circle at 100% 0, rgba(236,72,153,0.24), transparent 55%),
                      rgba(15,23,42,0.95);
          padding: 16px 18px;
          box-shadow:
            0 0 24px rgba(15,23,42,0.8),
            0 0 28px rgba(236,72,153,0.18);
          backdrop-filter: blur(16px);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 12px;
        }

        .myb-filters-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .myb-filters-title {
          font-size: 17px;
          font-weight: 600;
          color: #e5e7eb;
        }

        .myb-filters-sub {
          font-size: 13px;
          color: #9ca3af;
        }

        .myb-filter-buttons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .myb-list-wrapper {
          border-radius: 20px;
          border: 1px solid rgba(148,163,184,0.45);
          background:
            radial-gradient(circle at 50% 0, rgba(168,85,247,0.18), transparent 60%),
            rgba(15,23,42,0.96);
          padding: 16px 18px 20px;
          box-shadow:
            0 0 26px rgba(15,23,42,0.9),
            0 0 32px rgba(129,140,248,0.22);
          backdrop-filter: blur(18px);
        }

        .myb-list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          gap: 8px;
        }

        .myb-list-header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: #f9fafb;
        }

        .myb-count-pill {
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid rgba(129,140,248,0.65);
          background: rgba(15,23,42,0.9);
          font-size: 12px;
          color: #c7d2fe;
        }

        .myb-bookings-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 6px;
        }

        .myb-booking-card {
          border-radius: 16px;
          border: 1px solid rgba(148,163,184,0.55);
          background:
            linear-gradient(135deg, rgba(15,23,42,0.96), rgba(30,64,175,0.32));
          padding: 12px 12px 10px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .myb-booking-toprow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }

        .myb-booking-datetime {
          font-weight: 600;
          font-size: 14px;
          color: #e5e7eb;
        }

        .myb-booking-date {
          opacity: 0.9;
        }

        .myb-booking-services {
          font-size: 13px;
          color: #cbd5f5;
        }

        .myb-booking-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
        }

        .myb-booking-meta-left {
          font-size: 12px;
          color: #9ca3af;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .myb-price-pill {
          padding: 3px 8px;
          border-radius: 999px;
          background: rgba(15,23,42,0.9);
          border: 1px solid rgba(129,140,248,0.6);
          font-size: 12px;
          color: #c7d2fe;
        }

        .myb-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          margin-top: 4px;
        }

        .myb-btn-cancel {
          padding: 6px 12px;
          border-radius: 10px;
          border: 1px solid rgba(248,113,113,0.7);
          background: rgba(127,29,29,0.75);
          color: #fee2e2;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .myb-btn-disabled {
          opacity: 0.55;
          cursor: default;
        }

        .myb-empty {
          margin-top: 10px;
          font-size: 14px;
          color: #9ca3af;
          text-align: center;
        }

        /* МОДАЛКА ОТМЕНЫ */
        .myb-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15,23,42,0.80);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }

        .myb-modal {
          width: 90%;
          max-width: 420px;
          border-radius: 18px;
          border: 1px solid rgba(148,163,184,0.7);
          background:
            radial-gradient(circle at 0 0, rgba(129,140,248,0.25), transparent 60%),
            rgba(15,23,42,0.98);
          box-shadow:
            0 20px 50px rgba(0,0,0,0.7),
            0 0 30px rgba(129,140,248,0.5);
          padding: 18px 18px 16px;
          color: #e5e7eb;
        }

        .myb-modal h3 {
          margin: 0 0 8px 0;
          font-size: 18px;
          font-weight: 700;
          color: #f9fafb;
        }

        .myb-modal p {
          margin: 4px 0;
          font-size: 14px;
          color: #d1d5db;
        }

        .myb-modal-buttons {
          margin-top: 14px;
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }

        .myb-btn-secondary,
        .myb-btn-primary {
          padding: 8px 14px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .myb-btn-secondary {
          border: 1px solid rgba(148,163,184,0.7);
          background: rgba(15,23,42,0.95);
          color: #e5e7eb;
        }

        .myb-btn-primary {
          border: 1px solid rgba(248,113,113,0.9);
          background: linear-gradient(135deg, rgba(248,113,113,0.95), rgba(185,28,28,0.95));
          color: #fef2f2;
        }

        .myb-btn-primary[disabled] {
          opacity: 0.6;
          cursor: default;
        }

        .myb-card-center {
          padding: 32px 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        /* МОБИЛЬНАЯ АДАПТАЦИЯ */
        @media (max-width: 768px) {
          .myb-card-root {
            padding: 16px 12px 26px;
            gap: 12px;
          }
          .myb-top {
            flex-direction: column;
          }
          .myb-profile {
            flex: 1;
          }
          .myb-filters {
            flex: 1;
          }
          .myb-list-wrapper {
            padding: 12px 10px 14px;
          }
          .myb-booking-card {
            padding: 10px 10px 8px;
          }
          .myb-booking-toprow {
            flex-direction: column;
            align-items: flex-start;
          }
          .myb-booking-meta {
            flex-direction: column;
            align-items: flex-start;
          }
          .myb-actions {
            justify-content: flex-start;
          }

          /* отключаем iOS zoom */
          input, select, textarea, button {
            font-size: 16px !important;
          }
        }
      `}</style>

      {/* ВЕРХ: ПРОФИЛЬ + ФИЛЬТРЫ */}
      <div className="myb-top">
        <div className="myb-profile">
          <div className="myb-profile-name">
            {user.name || t('profile_default_name') || 'Mano paskyra'}
          </div>
          <div className="myb-profile-row">
            <span style={{ opacity: 0.7 }}>📞</span>
            <span>{user.phone || t('profile_no_phone') || 'Nenurodytas telefonas'}</span>
          </div>
          {user.instagram && (
            <div className="myb-profile-row">
              <span style={{ opacity: 0.7 }}>📸</span>
              <span>@{user.instagram}</span>
            </div>
          )}

          <div className="myb-chip-row">
            <div className="myb-chip">
              {t('myb_total') || 'Iš viso'}: {allBookings.length}
            </div>
            <div className="myb-chip">
              {t('myb_upcoming') || 'Ateinančios'}: {upcoming.length}
            </div>
            <div className="myb-chip">
              {t('myb_past') || 'Praėjusios'}: {past.length}
            </div>
          </div>
        </div>

        <div className="myb-filters">
          <div className="myb-filters-top">
            <div>
              <div className="myb-filters-title">
                {t('myb_title') || 'Jūsų rezervacijos'}
              </div>
              <div className="myb-filters-sub">
                {t('myb_subtitle') ||
                  'Čia matysite visas savo būsimas ir praėjusias rezervacijas.'}
              </div>
            </div>

            <div className="myb-filter-buttons">
              {['upcoming', 'all', 'past'].map((key) => (
                <button
                  key={key}
                  type="button"
                  style={filterBtnStyle(key)}
                  onClick={() => setFilter(key)}
                >
                  {filterLabel(key)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* СПИСОК БРОНЕЙ */}
      <div className="myb-list-wrapper">
        <div className="myb-list-header">
          <h2>{t('myb_list_title') || 'Rezervacijų sąrašas'}</h2>
          <div className="myb-count-pill">
            {t('myb_showing') || 'Rodoma'}: {visibleBookings.length}
          </div>
        </div>

        {visibleBookings.length === 0 ? (
          <div className="myb-empty">
            {t('myb_empty') || 'Šiuo metu neturite rezervacijų pagal pasirinktą filtrą.'}
          </div>
        ) : (
          <div className="myb-bookings-list">
            {visibleBookings.map((b) => {
              const servicesLabel =
                Array.isArray(b.services) && b.services.length
                  ? b.services.join(', ')
                  : t('myb_no_services') || 'Paslaugos nenurodytos'

              const priceLabel =
                typeof b.price === 'number'
                  ? `${b.price.toFixed(0)} €`
                  : b.price
                  ? `${b.price} €`
                  : t('myb_no_deposit') || 'Be avanso'

              return (
                <div key={b.id} className="myb-booking-card">
                  <div className="myb-booking-toprow">
                    <div>
                      <div className="myb-booking-datetime">
                        <span className="myb-booking-date">
                          {formatDate(b.start)}
                        </span>{' '}
                        •{' '}
                        <span>{formatTime(b.start)}–{formatTime(b.end)}</span>
                      </div>
                      <div className="myb-booking-services">
                        {servicesLabel}
                      </div>
                    </div>

                    <div style={statusBadge(b.status)}>{statusLabel(b.status)}</div>
                  </div>

                  <div className="myb-booking-meta">
                    <div className="myb-booking-meta-left">
                      <span>
                        {t('myb_created') || 'Sukurta'}:{' '}
                        {formatDate(b.createdAt || b.start)} {formatTime(b.createdAt || b.start)}
                      </span>
                      {b.durationMinutes && (
                        <span>
                          {t('myb_duration') || 'Trukmė'}: {b.durationMinutes} min
                        </span>
                      )}
                    </div>
                    <div className="myb-price-pill">
                      {t('myb_deposit') || 'Avansas'}: {priceLabel}
                    </div>
                  </div>

                  <div className="myb-actions">
                    <button
                      type="button"
                      className={
                        'myb-btn-cancel' + (canCancel(b) ? '' : ' myb-btn-disabled')
                      }
                      disabled={!canCancel(b)}
                      onClick={() => canCancel(b) && handleCancel(b)}
                    >
                      {b.status === 'cancelled'
                        ? t('myb_cancelled') || 'Jau atšaukta'
                        : t('myb_btn_cancel') || 'Atšaukti rezervaciją'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* МОДАЛКА ОТМЕНЫ */}
      {selected && (
        <div className="myb-modal-overlay" onClick={closeModal}>
          <div className="myb-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t('myb_cancel_title') || 'Atšaukti rezervaciją?'}</h3>
            <p>
              {t('myb_cancel_text') ||
                'Ar tikrai norite atšaukti šią rezervaciją?'}
            </p>
            <p style={{ fontSize: 13, opacity: 0.85, marginTop: 6 }}>
              {formatDate(selected.start)} {formatTime(selected.start)} –{' '}
              {formatTime(selected.end)}
            </p>
            {Array.isArray(selected.services) && selected.services.length > 0 && (
              <p style={{ fontSize: 13, opacity: 0.85 }}>
                {selected.services.join(', ')}
              </p>
            )}

            <div className="myb-modal-buttons">
              <button
                type="button"
                className="myb-btn-secondary"
                onClick={closeModal}
                disabled={loading}
              >
                {t('btn_cancel') || 'Atšaukti'}
              </button>
              <button
                type="button"
                className="myb-btn-primary"
                onClick={confirmCancel}
                disabled={loading}
              >
                {loading
                  ? t('myb_cancel_loading') || 'Atšaukiama...'
                  : t('myb_cancel_confirm') || 'Taip, atšaukti'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
