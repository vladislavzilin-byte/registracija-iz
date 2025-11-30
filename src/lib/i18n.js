// src/lib/i18n.js
import React from 'react';
import { getLang, setLang } from './storage';
import { useLang } from './LangContext';

export const dict = {
/* ============================================================
     🇷🇺 RUSSIAN
  ============================================================ */
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
    you_have_x_active: 'У вас {n} активных запись(ей)',
    all: 'Все',
    active: 'Активные',
    canceled: 'Отменённые',
    pending: 'Ожидает подтверждения',
    approved: 'Подтверждена',
    passed: 'Прошла',
    cancel: 'Отменить',
    no_records: 'Нет записей',
    only_future: 'Только будущие',

    /* ------------------ Финансы ------------------ */
    finance_mode_month: 'Месяц',
    finance_mode_year: 'Год',
    finance_mode_range: 'Период',
    finance_expense_percent_label: 'Процент расходов:',
    search_placeholder: 'Поиск...',

    finance_title: 'Финансы',
    finance_subtitle: 'Доходы от бронирований и ручных записей',

    finance_system_title: 'Система',
    finance_manual_title: 'Ручные',
    finance_expenses_title: 'Расходы ({percent}%)',
    finance_balance_title: 'Баланс',

    finance_system_caption: 'Доходы из системы',
    finance_manual_caption: 'Ручные добавленные доходы',
    finance_expenses_caption: 'Автоматически рассчитанные расходы',
    finance_balance_caption: 'Поступления минус расходы ({percent}%)',

    finance_period_prefix: 'Период',

    finance_pdf_title: 'Финансовый отчёт',
    finance_pdf_subtitle: 'Финансовая сводка',
    finance_pdf_intro: 'Расчёт за период. Расходы: {percent}%.',

    finance_table_date: 'Дата',
    finance_table_time: 'Время',
    finance_table_desc: 'Описание',
    finance_table_amount: 'Сумма',
    finance_table_expense: 'Расходы',
    finance_table_receipt: 'Чек',

    finance_manual_add_title: 'Добавить ручную запись',
    finance_manual_add_subtitle: 'Например: чаевые, наличные или доп. услуги.',
    finance_placeholder_amount: 'Сумма €',
    finance_placeholder_desc: 'Описание (опционально)',
    finance_manual_add_button: 'Добавить запись',

    finance_history_title: 'История',
    finance_history_subtitle: 'Все записи за выбранный период',

    finance_confirm_delete: 'Удалить эту запись? Бронирование не будет затронуто.',
    finance_edit_btn_title: 'Редактировать запись',
    finance_receipt_btn_title: 'Скачать чек',
    finance_delete_btn_title: 'Удалить',

    finance_prompt_desc: 'Описание:',
    finance_prompt_amount: 'Сумма €:',
    finance_prompt_time: 'Время (например 10:00 – 18:00):',

    /* ------------------ Месяцы ------------------ */
    month_0: 'Январь',
    month_1: 'Февраль',
    month_2: 'Март',
    month_3: 'Апрель',
    month_4: 'Май',
    month_5: 'Июнь',
    month_6: 'Июль',
    month_7: 'Август',
    month_8: 'Сентябрь',
    month_9: 'Октябрь',
    month_10: 'Ноябрь',
    month_11: 'Декабрь'
  },

  /* ============================================================
       🇱🇹 LITHUANIAN
    ============================================================ */
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
    only_future: 'Tik būsimi',

    /* ------------------ Finansai ------------------ */
    finance_mode_month: 'Mėnuo',
    finance_mode_year: 'Metai',
    finance_mode_range: 'Laikotarpis',
    finance_expense_percent_label: 'Išlaidų procentas:',
    search_placeholder: 'Paieška...',

    finance_title: 'Finansai',
    finance_subtitle: 'Pajamos iš rezervacijų ir rankinių įrašų',

    finance_system_title: 'Sistema',
    finance_manual_title: 'Rankiniai',
    finance_expenses_title: 'Išlaidos ({percent}%)',
    finance_balance_title: 'Balansas',

    finance_system_caption: 'Pajamos iš sistemos',
    finance_manual_caption: 'Rankiniai įrašai',
    finance_expenses_caption: 'Automatinės išlaidos',
    finance_balance_caption: 'Pajamos minus išlaidos ({percent}%)',

    finance_period_prefix: 'Laikotarpis',

    finance_pdf_title: 'Finansų ataskaita',
    finance_pdf_subtitle: 'Finansų suvestinė',
    finance_pdf_intro: 'Ataskaita pagal laikotarpį. Išlaidos: {percent}%.',

    finance_table_date: 'Data',
    finance_table_time: 'Laikas',
    finance_table_desc: 'Aprašymas',
    finance_table_amount: 'Suma',
    finance_table_expense: 'Išlaidos',
    finance_table_receipt: 'Kvitas',

    finance_manual_add_title: 'Pridėti rankinį įrašą',
    finance_manual_add_subtitle: 'Pvz.: arbatpinigiai, grynieji, papildomos paslaugos.',
    finance_placeholder_amount: 'Suma €',
    finance_placeholder_desc: 'Aprašymas (nebūtina)',
    finance_manual_add_button: 'Pridėti',

    finance_history_title: 'Istorija',
    finance_history_subtitle: 'Visi įrašai pagal pasirinktą laikotarpį',

    finance_confirm_delete: 'Ištrinti šį įrašą? Rezervacijai tai neturės įtakos.',
    finance_edit_btn_title: 'Redaguoti',
    finance_receipt_btn_title: 'Atsisiųsti kvitą',
    finance_delete_btn_title: 'Ištrinti',

    finance_prompt_desc: 'Aprašymas:',
    finance_prompt_amount: 'Suma €:',
    finance_prompt_time: 'Laikas (pvz. 10:00 – 18:00):',

    /* ------------------ Mėnesiai ------------------ */
    month_0: 'Sausis',
    month_1: 'Vasaris',
    month_2: 'Kovas',
    month_3: 'Balandis',
    month_4: 'Gegužė',
    month_5: 'Birželis',
    month_6: 'Liepa',
    month_7: 'Rugpjūtis',
    month_8: 'Rugsėjis',
    month_9: 'Spalis',
    month_10: 'Lapkritis',
    month_11: 'Gruodis'
  },

  /* ============================================================
       🇬🇧 ENGLISH
    ============================================================ */
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
    only_future: 'Only future',

    /* ------------------ Finance ------------------ */
    finance_mode_month: 'Month',
    finance_mode_year: 'Year',
    finance_mode_range: 'Range',
    finance_expense_percent_label: 'Expense percent:',
    search_placeholder: 'Search...',

    finance_title: 'Finance',
    finance_subtitle: 'Income from bookings & manual entries',

    finance_system_title: 'System',
    finance_manual_title: 'Manual',
    finance_expenses_title: 'Expenses ({percent}%)',
    finance_balance_title: 'Balance',

    finance_system_caption: 'System income',
    finance_manual_caption: 'Manual entries',
    finance_expenses_caption: 'Auto-calculated expenses',
    finance_balance_caption: 'Income minus expenses ({percent}%)',

    finance_period_prefix: 'Period',

    finance_pdf_title: 'Finance Report',
    finance_pdf_subtitle: 'Finance summary',
    finance_pdf_intro: 'Period summary. Expenses: {percent}%.',

    finance_table_date: 'Date',
    finance_table_time: 'Time',
    finance_table_desc: 'Description',
    finance_table_amount: 'Amount',
    finance_table_expense: 'Expense',
    finance_table_receipt: 'Receipt',

    finance_manual_add_title: 'Add manual entry',
    finance_manual_add_subtitle: 'Example: tips, cash or extra services.',
    finance_placeholder_amount: 'Amount €',
    finance_placeholder_desc: 'Description (optional)',
    finance_manual_add_button: 'Add entry',

    finance_history_title: 'History',
    finance_history_subtitle: 'All records for selected period',

    finance_confirm_delete: 'Delete this entry? Booking will not be affected.',
    finance_edit_btn_title: 'Edit entry',
    finance_receipt_btn_title: 'Download receipt',
    finance_delete_btn_title: 'Delete',

    finance_prompt_desc: 'Description:',
    finance_prompt_amount: 'Amount €:',
    finance_prompt_time: 'Time (e.g. 10:00 – 18:00):',

    /* ------------------ Months ------------------ */
    month_0: 'January',
    month_1: 'February',
    month_2: 'March',
    month_3: 'April',
    month_4: 'May',
    month_5: 'June',
    month_6: 'July',
    month_7: 'August',
    month_8: 'September',
    month_9: 'October',
    month_10: 'November',
    month_11: 'December'
  }
};
/* ============================================================
   HOOK
============================================================ */

// Хук для использования переводов
export function useI18n() {
  const { lang } = useLang();

  const t = (key, vars = {}) => {
    let str = dict[lang]?.[key] ?? dict['ru'][key] ?? key;

    if (vars && typeof vars === 'object') {
      Object.keys(vars).forEach(k => {
        str = str.replaceAll(`{${k}}`, vars[k]);
      });
    }

    return str;
  };

  return { t, lang };
}
