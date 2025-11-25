import React from 'react'

import { getLang, setLang } from './storage'
// src/lib/i18n.js
import { useLang } from './LangContext'

export const dict = {
  ru: {
    brand: 'IZ Booking',
    nav_calendar: 'Календарь',
    nav_my: 'Мои записи',
    nav_admin: 'Админ',
    login: 'Вход',
    register: 'Регистрация',
    name: 'Имя',
    instagram: 'Instagram',
    email_opt: 'Email (опционально)',
    phone: 'Телефон',
    phone_or_email: 'Телефон или Email',
    password: 'Пароль',
    logout: 'Выйти',
    my_profile: 'Мой профиль',
    my_bookings: 'Мои записи',
    you_have_x_active: 'У вас {n} активных запись(и)',
    all: 'Все',
    active: 'Активные',
    canceled: 'Отменённые',
    pending: 'Ожидает подтверждения',
    approved: 'Подтверждена',
    passed: 'Прошла',
    cancel: 'Отменить',
    no_records: 'Нет записей',
    only_future: 'Только будущие'
    // ← запятая не нужна на последнем элементе, но и с ней работает
  },
  lt: {
    brand: 'IZ Registracija',
    nav_calendar: 'Kalendorius',
    nav_my: 'Mano vizitai',
    nav_admin: 'Adminas',
    login: 'Prisijungti',
    register: 'Registruotis',
    name: 'Vardas',
    instagram: 'Instagram',
    email_opt: 'El. paštas (nebūtina)',
    phone: 'Telefonas',
    phone_or_email: 'Telefonas arba el. paštas',
    password: 'Slaptažodis',
    logout: 'Atsijungti',
    my_profile: 'Mano profilis',
    my_bookings: 'Mano vizitai',
    you_have_x_active: 'Turite {n} aktyvių vizitų',
    all: 'Visi',
    active: 'Aktyvūs',
    canceled: 'Atšaukti',
    pending: 'Laukia patvirtinimo',
    approved: 'Patvirtinta',
    passed: 'Įvyko',
    cancel: 'Atšaukti',
    no_records: 'Įrašų nėra',
    only_future: 'Tik būsimi'
  },
  en: {
    brand: 'IZ Booking',
    nav_calendar: 'Calendar',
    nav_my: 'My bookings',
    nav_admin: 'Admin',
    login: 'Login',
    register: 'Sign up',
    name: 'Name',
    instagram: 'Instagram',
    email_opt: 'Email (optional)',
    phone: 'Phone',
    phone_or_email: 'Phone or Email',
    password: 'Password',
    logout: 'Log out',
    my_profile: 'My profile',
    my_bookings: 'My bookings',
    you_have_x_active: 'You have {n} active booking(s)',
    all: 'All',
    active: 'Active',
    canceled: 'Canceled',
    pending: 'Pending approval',
    approved: 'Approved',
    passed: 'Completed',
    cancel: 'Cancel',
    no_records: 'No records',
    only_future: 'Only future'
  }
}   // ← ОДНА ЕДИНСТВЕННАЯ ЗАКРЫВАЮЩАЯ СКОБКА ДЛЯ dict

// ← После этого идёт функция — без лишних скобок!
export function useI18n() {
  const { lang } = useLang()

  const t = (key, vars = {}) => {
    let str = dict[lang]?.[key] || dict['ru'][key] || key

    for (const k in vars) {
      str = str.replaceAll(`{${k}}`, vars[k])
    }

    return str
  }

  return { t, lang }
}
