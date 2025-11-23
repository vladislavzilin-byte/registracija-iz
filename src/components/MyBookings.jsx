import { useEffect, useState } from 'react'
import { getBookings, getCurrentUser, saveBookings } from '../lib/storage'
import { format } from 'date-fns'
import { useI18n } from '../lib/i18n'

export default function MyBookings(){

  const { t } = useI18n()
  const [my, setMy] = useState([])
  const [modal, setModal] = useState(null) // modal: { id }
  const [busy, setBusy] = useState(false)

  useEffect(()=>{
    const u = getCurrentUser()
    if(!u) return setMy([])
    const all = getBookings()
    setMy(all.filter(b => b.userPhone === u.phone))
  },[])

  const openCancel = (id) => {
    if(busy) return
    setModal({ id })
  }

  const closeModal = () => {
    if(busy) return
    setModal(null)
  }

  const cancelBooking = () => {
    if(!modal) return
    setBusy(true)

    setTimeout(()=>{
      const all = getBookings()
      const updated = all.map(b =>
        b.id === modal.id ? { ...b, status:'cancelled' } : b
      )
      saveBookings(updated)

      const u = getCurrentUser()
      setMy(updated.filter(b => b.userPhone === u.phone))

      setBusy(false)
      setModal(null)
    },600)
  }

  return (
    <div className="mybookings-card">

      {/* ========================= */}
      {/*         GLOBAL CSS        */}
      {/* ========================= */}
      <style>{`

        .mybookings-card {
          position: relative;
          min-height: 100vh;
        }

        /* CARD style for each booking */
        .booking-item {
          border: 1px solid rgba(168,85,247,0.28);
          background: rgba(22, 18, 38, 0.92);
          backdrop-filter: blur(16px);
          padding: 16px 18px;
          border-radius: 16px;
          margin-bottom: 16px;
          color: #fff;
          box-shadow: 0 0 18px rgba(150,70,255,0.18);
          transition: .25s;
        }

        .booking-title {
          font-size: 17px;
          font-weight: 600;
          margin-bottom: 6px;
          color: #e4d8ff;
        }

        .booking-row {
          font-size: 14px;
          opacity: .9;
          margin-bottom: 4px;
        }

        .booking-status {
          margin-top: 6px;
          padding: 6px 10px;
          border-radius: 8px;
          width: fit-content;
          font-size: 13px;
          font-weight: 600;
        }

        .status-pending {
          background: rgba(255,215,0,0.15);
          color: #ffe57a;
          border: 1px solid rgba(255,215,0,0.35);
        }

        .status-approved {
          background: rgba(0,255,165,0.18);
          color: #6affd0;
          border: 1px solid rgba(0,255,165,0.35);
        }

        .status-cancelled {
          background: rgba(255,0,70,0.18);
          color: #ff9cae;
          border: 1px solid rgba(255,0,70,0.40);
        }


        /* CANCEL BUTTON */
        .cancel-btn {
          margin-top: 12px;
          width: 100%;
          padding: 10px 14px;
          border-radius: 12px;
          border: 1px solid rgba(255,120,140,0.35);
          background: rgba(255,0,70,0.20);
          font-size: 15px;
          color: #ffccd5;
          cursor: pointer;
          backdrop-filter: blur(8px);
          transition: .25s;
        }
        .cancel-btn:hover {
          background: rgba(255,0,70,0.32);
        }


        /* ============= MODAL ============= */

        .modal-backdrop {
          position: fixed !important;
          inset: 0;
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(14px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          animation: modalFadeIn .25s ease;
        }

        .modal-box {
          width: 90%;
          max-width: 420px;
          background: rgba(17,0,40,0.85);
          border: 1px solid rgba(168,85,247,0.45);
          border-radius: 18px;
          padding: 22px;
          color: #fff;
          box-shadow: 0 0 26px rgba(150,70,255,0.35);
          animation: modalFadeIn .28s ease;
        }

        @keyframes modalFadeIn {
          0% { opacity:0; transform: scale(.94); }
          100% { opacity:1; transform: scale(1); }
        }

        .modal-btns {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 18px;
        }

        .btn-cancel {
          padding: 8px 14px;
          border-radius: 10px;
          border: 1px solid rgba(148,163,184,0.6);
          background: rgba(15,23,42,0.9);
          color: #e5e7eb;
        }

        .btn-ok {
          padding: 8px 14px;
          border-radius: 10px;
          border: 1px solid rgba(168,85,247,0.55);
          background: rgba(98,0,180,0.55);
          color: #fff;
          backdrop-filter: blur(8px);
        }

        /* iOS zoom fix */
        @media(max-width:768px){
          input, button {
            font-size: 16px !important;
          }
        }

      `}</style>


      <h2 style={{color:'#fff', fontSize:26, marginBottom:20}}>
        {t('my_bookings') || 'Jūsų rezervacijos'}
      </h2>


      {/* LIST OF BOOKINGS */}
      {my.length === 0 && (
        <p style={{color:'#ccc'}}>Nėra rezervacijų.</p>
      )}

      {my.map(b => (
        <div key={b.id} className="booking-item">

          <div className="booking-title">
            {format(new Date(b.start),'dd.MM.yyyy')} · {format(new Date(b.start),'HH:mm')}
          </div>

          <div className="booking-row">
            Trukmė: <b>{b.durationMinutes} min</b>
          </div>

          <div className="booking-row">
            Avansas: <b>{b.price} €</b>
          </div>

          <div className={
            "booking-status " +
            (b.status==='pending' ? 'status-pending' :
             b.status==='approved' ? 'status-approved' :
             'status-cancelled')
          }>
            {b.status}
          </div>

          {b.status !== 'cancelled' && (
            <button className="cancel-btn" onClick={()=>openCancel(b.id)}>
              {t('cancel_booking') || 'Atšaukti vizitą'}
            </button>
          )}

        </div>
      ))}


      {/* ========================= */}
      {/*          MODAL            */}
      {/* ========================= */}

      {modal && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>

            <h3 style={{marginTop:0}}>
              Atšaukti rezervaciją?
            </h3>

            <p style={{opacity:.9}}>
              Ar tikrai norite atšaukti vizitą?
            </p>

            <div className="modal-btns">
              <button className="btn-cancel" onClick={closeModal}>
                Ne
              </button>

              <button className="btn-ok" onClick={cancelBooking}>
                {busy ? '...' : 'Taip'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
