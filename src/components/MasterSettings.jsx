import React, { useState } from 'react'

export default function MasterSettings({ settings, onChange }) {
  const [local, setLocal] = useState(settings || {
    name: 'IZ HAIR TREND',
    phone: '+37060128458',
    start: '04:00',
    end: '20:00',
    slot: 60
  })

  const handleChange = (field, value) => {
    const next = { ...local, [field]: value }
    setLocal(next)
    if (onChange) onChange(next)
  }

  return (
    <div className="settings-card">
      <h3>Настройки мастера</h3>
      <label>Имя мастера</label>
      <input
        value={local.name}
        onChange={e => handleChange('name', e.target.value)}
      />
      <label>Телефон администратора</label>
      <input
        value={local.phone}
        onChange={e => handleChange('phone', e.target.value)}
      />
      <label>Начало рабочего дня</label>
      <input
        type="time"
        value={local.start}
        onChange={e => handleChange('start', e.target.value)}
      />
      <label>Конец рабочего дня</label>
      <input
        type="time"
        value={local.end}
        onChange={e => handleChange('end', e.target.value)}
      />
      <label>Длительность слота (мин)</label>
      <input
        type="number"
        value={local.slot}
        onChange={e => handleChange('slot', e.target.value)}
      />
    </div>
  )
}
