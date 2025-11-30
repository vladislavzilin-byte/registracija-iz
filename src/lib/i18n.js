// src/lib/i18n.js
import React from 'react';
import { useLang } from './LangContext';

/* ============================================================
   🌍 DICTIONARY
============================================================ */
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

  /* ============================================================
       MY BOOKINGS (MB)
  ============================================================ */
  mb_title: 'Мои записи',
  mb_profile_title: 'Профиль',
  mb_edit_profile: 'Редактировать профиль',
  mb_save: 'Сохранить',
  mb_cancel: 'Отмена',

  mb_filters_all: 'Все',
  mb_filters_active: 'Активные',
  mb_filters_history: 'История',

  mb_error_contact: 'Введите телефон или email',
  mb_error_email: 'Некорректный email',
  mb_error_phone: 'Некорректный телефон',

  mb_status_confirmed_paid: 'Бронирование подтверждено • Оплачено',
  mb_status_confirmed_unpaid: 'Бронирование подтверждено • Ожидает оплаты',
  mb_status_pending_paid: 'Ожидает подтверждения • Оплачено',
  mb_status_pending_unpaid: 'Ожидает подтверждения • Не оплачено',
  mb_status_canceled_client: 'Отменено клиентом',
  mb_status_canceled_admin: 'Отменено администратором',

  mb_receipt_number: '№ квитанции:',
  mb_deposit: 'Аванс',
  mb_profile_updated: 'Данные обновлены',
  mb_booking_approved_toast: 'Ваша запись подтверждена!',

  mb_payment_choose_method: 'Выберите способ оплаты',
  mb_payment_error: 'Ошибка оплаты',
  mb_payment_link_error: 'Не удалось получить ссылку на оплату',

  mb_bank_details: 'Банковские реквизиты',
  mb_bank_receiver: 'Получатель',
  mb_bank_purpose: 'Назначение платежа',

  mb_close: 'Закрыть',

  /* ============================================================
       RECEIPT
  ============================================================ */
  receipt_title: 'Квитанция',
  receipt_subtitle: 'Платёжный документ',
  receipt_booking_id: 'Номер записи',
  receipt_client: 'Клиент',
  receipt_phone: 'Телефон',
  receipt_email_label: 'Email:',
  receipt_service: 'Услуга',
  receipt_service_list: 'Перечень услуг',
  receipt_price: 'Цена',
  receipt_duration: 'Длительность',
  receipt_total: 'Итоговая сумма',
  receipt_paid: 'Оплачено',
  receipt_unpaid: 'Не оплачено',
  receipt_payment_status: 'Статус оплаты',
  receipt_date: 'Дата',
  receipt_time: 'Время',
  receipt_staff: 'Специалист',
  receipt_signature: 'Подпись',
  receipt_generated: 'Квитанция сгенерирована автоматически.',
  receipt_contact_hint: 'Сканируйте QR-код, чтобы сохранить контакт.',
  receipt_qr_hint: 'QR-код визитки',
  receipt_footer_text:
    'Эта квитанция сформирована автоматически и действует без подписи. Вы можете сохранить её как PDF через меню печати браузера.',

  /* ============================================================
       ADMIN
  ============================================================ */
  master_name: 'Имя мастера',
  admin_phone: 'Телефон администратора',
  day_start: 'Начало дня',
  day_end: 'Конец дня',
  slot_minutes: 'Шаг слотов (мин)',
  finished: 'Завершённые',
  total: 'Всего',
  total_active: 'Активных',
  total_canceled: 'Отменённых',
  approve: 'Подтвердить',
  admin_access_denied_title: 'Доступ запрещён',
  admin_access_denied_text: 'Эта страница доступна только администраторам.',
  admin_settings_title: 'Редактировать настройки',

  admin_services_title: 'Услуги',
  admin_services_subtitle: 'Название, длительность, депозит',
  admin_services_add_button: 'Добавить услугу',
  admin_services_new_service: 'Новая услуга',

  admin_bookings_title: 'Все записи',
  admin_prev_page: '← Назад',
  admin_next_page: 'Вперёд →',
  admin_page_info: 'Страница {page} из {totalPages} ({count} записей)',
  admin_day_count: '{n} записей',

  admin_status_confirmed: 'Подтверждено',
  admin_status_unconfirmed: 'Неподтверждено',

  admin_time_from: 'Время от',
  admin_time_to: 'Время до',
  admin_download_receipt: 'Скачать квитанцию',
  admin_receipt_number_short: '№ квитанции:',
  admin_mark_unpaid_button: 'Снять оплату',
  admin_mark_paid_button: 'Пометить оплаченной',

  admin_confirm_cancel: 'Отменить эту запись?',
  admin_toast_canceled: 'Запись отменена',
  admin_toast_approved: 'Запись подтверждена',
  admin_toast_payment_updated: 'Статус оплаты обновлён',

  /* ============================================================
       FINANCE
  ============================================================ */
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
  finance_balance_caption: 'Доходы минус расходы ({percent}%)',
  finance_period_prefix: 'Период',

  finance_pdf_title: 'Финансовый отчёт',
  finance_pdf_subtitle: 'Финансовая сводка',
  finance_pdf_intro: 'Расчёт за период. Расходы: {percent}%.',
  finance_export_pdf_button: 'Экспорт PDF',
  finance_year_suffix: ' год',

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
  month_11: 'Декабрь',
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

  /* ========== MyBookings ========== */
  mb_title: 'Mano vizitai',
  mb_profile_title: 'Profilis',
  mb_edit_profile: 'Redaguoti profilį',
  mb_save: 'Išsaugoti',
  mb_cancel: 'Atšaukti',

  mb_filters_all: 'Visi',
  mb_filters_active: 'Aktyvūs',
  mb_filters_history: 'Istorija',

  mb_error_contact: 'Įveskite telefoną arba el. paštą',
  mb_error_email: 'Neteisingas el. paštas',
  mb_error_phone: 'Neteisingas telefono numeris',

  mb_status_confirmed_paid: 'Vizitas patvirtintas • Apmokėta',
  mb_status_confirmed_unpaid: 'Vizitas patvirtintas • Laukia apmokėjimo',
  mb_status_pending_paid: 'Laukia patvirtinimo • Apmokėta',
  mb_status_pending_unpaid: 'Laukia patvirtinimo • Neapmokėta',
  mb_status_canceled_client: 'Atšaukta kliento',
  mb_status_canceled_admin: 'Atšaukta administratoriaus',

  mb_receipt_number: 'Kvito Nr.:',
  mb_deposit: 'Avansas',
  mb_profile_updated: 'Duomenys atnaujinti',
  mb_booking_approved_toast: 'Jūsų vizitas patvirtintas!',

  mb_payment_choose_method: 'Pasirinkite mokėjimo būdą',
  mb_payment_error: 'Mokėjimo klaida',
  mb_payment_link_error: 'Nepavyko gauti mokėjimo nuorodos',

  mb_bank_details: 'Banko duomenys',
  mb_bank_receiver: 'Gavėjas',
  mb_bank_purpose: 'Paskirtis',

  mb_close: 'Uždaryti',

  /* ========== Receipt ========== */
  receipt_title: 'Kvitas',
  receipt_subtitle: 'Mokėjimo dokumentas',
  receipt_booking_id: 'Rezervacijos numeris',
  receipt_client: 'Klientas',
  receipt_phone: 'Telefonas',
  receipt_email_label: 'El. paštas:',
  receipt_service: 'Paslauga',
  receipt_service_list: 'Paslaugų sąrašas',
  receipt_price: 'Kaina',
  receipt_duration: 'Trukmė',
  receipt_total: 'Suma',
  receipt_paid: 'Apmokėta',
  receipt_unpaid: 'Neapmokėta',
  receipt_payment_status: 'Mokėjimo būsena',
  receipt_date: 'Data',
  receipt_time: 'Laikas',
  receipt_staff: 'Specialistas',
  receipt_signature: 'Parašas',
  receipt_generated: 'Kvitas sugeneruotas automatiškai.',
  receipt_contact_hint: 'Nuskenuokite QR kodą ir išsaugokite kontaktą.',
  receipt_qr_hint: 'Vizitinės QR kodas',
  receipt_footer_text:
    'Šis kvitas sugeneruotas automatiškai ir galioja be parašo. Galite jį išsaugoti kaip PDF per naršyklės spausdinimo meniu.',

  /* ========== Admin ========== */
  master_name: 'Meistrės vardas',
  admin_phone: 'Administratoriaus telefonas',
  day_start: 'Dienos pradžia',
  day_end: 'Dienos pabaiga',
  slot_minutes: 'Laiko žingsnis (min)',
  finished: 'Įvykę',
  total: 'Iš viso',
  total_active: 'Aktyvūs',
  total_canceled: 'Atšaukti',
  approve: 'Patvirtinti',
  admin_access_denied_title: 'Prieiga uždrausta',
  admin_access_denied_text: 'Šis puslapis prieinamas tik administratoriui.',
  admin_settings_title: 'Redaguoti nustatymus',
  admin_services_title: 'Paslaugos',
  admin_services_subtitle: 'Pavadinimas, trukmė, avansas',
  admin_services_add_button: 'Pridėti paslaugą',
  admin_services_new_service: 'Nauja paslauga',

  admin_bookings_title: 'Visi vizitai',
  admin_prev_page: '← Atgal',
  admin_next_page: 'Pirmyn →',
  admin_page_info: 'Puslapis {page} iš {totalPages} ({count} įrašų)',
  admin_day_count: '{n} įrašai',

  admin_status_confirmed: 'Patvirtinta',
  admin_status_unconfirmed: 'Nepatvirtinta',

  admin_time_from: 'Laikas nuo',
  admin_time_to: 'Laikas iki',
  admin_download_receipt: 'Atsisiųsti kvitą',
  admin_receipt_number_short: 'Kvito Nr.:',
  admin_mark_unpaid_button: 'Nuimti apmokėjimą',
  admin_mark_paid_button: 'Pažymėti apmokėta',

  admin_confirm_cancel: 'Atšaukti šį vizitą?',
  admin_toast_canceled: 'Vizitas atšauktas',
  admin_toast_approved: 'Vizitas patvirtintas',
  admin_toast_payment_updated: 'Apmokėjimo būsena atnaujinta',

  /* ========== Finance ========== */
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
  finance_export_pdf_button: 'Eksportuoti PDF',
  finance_year_suffix: ' metai',

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
  month_11: 'Gruodis',
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
  pending: 'Pending',
  approved: 'Approved',
  passed: 'Completed',
  cancel: 'Cancel',
  no_records: 'No records',
  only_future: 'Only future',

  /* ========== MyBookings ========== */
  mb_title: 'My bookings',
  mb_profile_title: 'Profile',
  mb_edit_profile: 'Edit profile',
  mb_save: 'Save',
  mb_cancel: 'Cancel',

  mb_filters_all: 'All',
  mb_filters_active: 'Active',
  mb_filters_history: 'History',

  mb_error_contact: 'Phone or email required',
  mb_error_email: 'Invalid email',
  mb_error_phone: 'Invalid phone number',

  mb_status_confirmed_paid: 'Booking confirmed • Paid',
  mb_status_confirmed_unpaid: 'Booking confirmed • Awaiting payment',
  mb_status_pending_paid: 'Pending approval • Paid',
  mb_status_pending_unpaid: 'Pending approval • Unpaid',
  mb_status_canceled_client: 'Canceled by client',
  mb_status_canceled_admin: 'Canceled by admin',

  mb_receipt_number: 'Receipt №:',
  mb_deposit: 'Deposit',
  mb_profile_updated: 'Profile updated',
  mb_booking_approved_toast: 'Your booking is approved!',

  mb_payment_choose_method: 'Choose payment method',
  mb_payment_error: 'Payment error',
  mb_payment_link_error: 'Couldn’t get payment link',

  mb_bank_details: 'Bank details',
  mb_bank_receiver: 'Receiver',
  mb_bank_purpose: 'Purpose',

  mb_close: 'Close',

  /* ========== Receipt ========== */
  receipt_title: 'Receipt',
  receipt_subtitle: 'Payment document',
  receipt_booking_id: 'Booking ID',
  receipt_client: 'Client',
  receipt_phone: 'Phone',
  receipt_email_label: 'Email:',
  receipt_service: 'Service',
  receipt_service_list: 'Service list',
  receipt_price: 'Price',
  receipt_duration: 'Duration',
  receipt_total: 'Total',
  receipt_paid: 'Paid',
  receipt_unpaid: 'Unpaid',
  receipt_payment_status: 'Payment status',
  receipt_date: 'Date',
  receipt_time: 'Time',
  receipt_staff: 'Specialist',
  receipt_signature: 'Signature',
  receipt_generated: 'This receipt was generated automatically.',
  receipt_contact_hint: 'Scan the QR code to save the contact.',
  receipt_qr_hint: 'Business card QR code',
  receipt_footer_text:
    'This receipt is generated automatically and valid without a signature. You may save it as a PDF from the browser print menu.',

  /* ========== Admin ========== */
  master_name: 'Master name',
  admin_phone: 'Admin phone',
  day_start: 'Day start',
  day_end: 'Day end',
  slot_minutes: 'Slot minutes',
  finished: 'Finished',
  total: 'Total',
  total_active: 'Active',
  total_canceled: 'Canceled',
  approve: 'Approve',
  admin_access_denied_title: 'Access denied',
  admin_access_denied_text: 'This page is available to admins only.',
  admin_settings_title: 'Edit settings',
  admin_services_title: 'Services',
  admin_services_subtitle: 'Name, duration, deposit',
  admin_services_add_button: 'Add service',
  admin_services_new_service: 'New service',

  admin_bookings_title: 'All bookings',
  admin_prev_page: '← Back',
  admin_next_page: 'Next →',
  admin_page_info: 'Page {page} of {totalPages} ({count} records)',
  admin_day_count: '{n} records',

  admin_status_confirmed: 'Confirmed',
  admin_status_unconfirmed: 'Unconfirmed',

  admin_time_from: 'Time from',
  admin_time_to: 'Time to',
  admin_download_receipt: 'Download receipt',
  admin_receipt_number_short: 'Receipt №:',
  admin_mark_unpaid_button: 'Mark unpaid',
  admin_mark_paid_button: 'Mark paid',

  admin_confirm_cancel: 'Cancel this booking?',
  admin_toast_canceled: 'Booking canceled',
  admin_toast_approved: 'Booking approved',
  admin_toast_payment_updated: 'Payment status updated',

  /* ========== Finance ========== */
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
  finance_export_pdf_button: 'Export PDF',
  finance_year_suffix: 'year',

  finance_table_date: 'Date',
  finance_table_time: 'Time',
  finance_table_desc: 'Description',
  finance_table_amount: 'Amount',
  finance_table_expense: 'Expense',
  finance_table_receipt: 'Receipt',

  finance_manual_add_title: 'Add manual entry',
  finance_manual_add_subtitle: 'Example: tips, cash, extra services.',
  finance_placeholder_amount: 'Amount €',
  finance_placeholder_desc: 'Description (optional)',
  finance_manual_add_button: 'Add',

  finance_history_title: 'History',
  finance_history_subtitle: 'All records for the selected period',
  finance_confirm_delete: 'Delete this entry? Booking will not be affected.',
  finance_edit_btn_title: 'Edit entry',
  finance_receipt_btn_title: 'Download receipt',
  finance_delete_btn_title: 'Delete',

  finance_prompt_desc: 'Description:',
  finance_prompt_amount: 'Amount €:',
  finance_prompt_time: 'Time (e.g. 10:00 – 18:00):',

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
  month_11: 'December',
},

}; // END dict

/* ============================================================
   HOOK
============================================================ */

export function useI18n() {
  const { lang } = useLang();

  const t = (key, vars = {}) => {
    let str = dict[lang]?.[key] ?? dict['ru'][key] ?? key;

    if (typeof vars === 'object') {
      Object.keys(vars).forEach(k => {
        str = str.replaceAll(`{${k}}`, vars[k]);
      });
    }
    return str;
  };

  return { t, lang };
}
