// src/lib/LangContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react'
import { getLang, setLang } from './storage'

const LangContext = createContext()

export const LangProvider = ({ children }) => {
  const [lang, setLangState] = useState(getLang() || 'ru')

  // Синхронизация при открытии в другой вкладке
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'iz.lang') {
        setLangState(getLang())
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  const changeLang = (newLang) => {
    setLang(newLang)         // сохраняем в localStorage
    setLangState(newLang)     // обновляем состояние
  }

  return (
    <LangContext.Provider value={{ lang, setLang: changeLang }}>
      {children}
    </LangContext.Provider>
  )
}

// Хук для использования в любом компоненте
export const useLang = () => {
  const context = useContext(LangContext)
  if (!context) {
    throw new Error('useLang must be used within LangProvider')
  }
  return context
}