
import React, { useState } from 'react'
import { getUsers } from '../lib/storage'

export default function ForgotPasswordModal({ open, onClose }){
  const [phone,setPhone] = useState('')
  const [found,setFound] = useState(null)
  const [showPass,setShowPass] = useState(false)

  if(!open) return null

  const submit = e => {
    e.preventDefault()
    const u = getUsers().find(x => x.phone === phone)
    if(!u) setFound({error:'Пользователь не найден'})
    else setFound({password:u.password})
  }

  return (
    <div style={{
      position:'fixed', top:0, left:0, width:'100%', height:'100%',
      background:'rgba(0,0,0,0.65)', zIndex:9999,
      display:'flex', justifyContent:'center', alignItems:'center',
      animation:'fadeIn .3s'
    }}
      onClick={onClose}
    >
      <div style={{
        background:'#111', padding:20, borderRadius:16, minWidth:320,
        color:'#fff', boxShadow:'0 0 25px #000',
        animation:'scaleIn .3s'
      }} onClick={e=>e.stopPropagation()}>
        <h2 style={{margin:0, marginBottom:10}}>Восстановление пароля</h2>

        <form onSubmit={submit}>
          <input 
            style={{width:'100%',padding:'10px 12px',borderRadius:8,marginBottom:10}}
            value={phone}
            onChange={e=>setPhone(e.target.value)}
            placeholder="Ваш телефон"
          />
          <button style={{width:'100%',padding:'10px',borderRadius:8,background:'#6b46c1',color:'#fff',border:'none'}}>
            Найти
          </button>
        </form>

        {found?.password && (
          <div style={{marginTop:15,fontSize:16}}>
            <b>Ваш пароль:</b>
            <br/>
            <span style={{
              display:'inline-block',
              marginTop:8,
              fontSize:20,
              letterSpacing:3
            }}>
              {showPass ? found.password : '•'.repeat(found.password.length)}
            </span>
            <br/>
            <button 
              style={{marginTop:10,padding:'6px 10px',borderRadius:6,background:'#333',color:'#fff',border:'none'}}
              onClick={()=>setShowPass(!showPass)}
            >
              {showPass ? 'Скрыть' : 'Показать'}
            </button>
          </div>
        )}

        {found?.error && (
          <div style={{marginTop:15,color:'#ff5555',fontSize:16}}>
            {found.error}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes scaleIn { from{transform:scale(.7)} to{transform:scale(1)} }
      `}</style>
    </div>
  )
}
