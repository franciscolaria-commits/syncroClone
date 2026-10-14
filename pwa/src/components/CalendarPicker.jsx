import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Check } from 'lucide-react';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAYS_OF_WEEK = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

export default function CalendarPicker({
  id,
  name,
  value,
  onChange,
  placeholder = "Toca para abrir calendario...",
  required = false,
  maxDate = new Date().toISOString().split('T')[0],
  minDate = "1920-01-01",
  theme = "emerald"
}) {
  const [isOpen, setIsOpen] = useState(false);

  const parseDate = (val) => {
    if (!val) return null;
    const parts = String(val).split('-');
    if (parts.length < 3) return null;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
    return { year: y, month: m, day: d };
  };

  const initial = parseDate(value);
  const today = new Date();
  
  const [viewYear, setViewYear] = useState(initial ? initial.year : 2000);
  const [viewMonth, setViewMonth] = useState(initial ? initial.month : today.getMonth());
  const [selectedDate, setSelectedDate] = useState(value || '');

  useEffect(() => {
    setSelectedDate(value || '');
    if (value) {
      const p = parseDate(value);
      if (p) {
        setViewYear(p.year);
        setViewMonth(p.month);
      }
    }
  }, [value]);

  const currentYear = today.getFullYear();
  const years = [];
  for (let y = currentYear; y >= 1930; y--) {
    years.push(y);
  }

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleSelectDay = (day) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const iso = `${viewYear}-${mm}-${dd}`;
    setSelectedDate(iso);
    if (onChange) {
      onChange(iso);
    }
  };

  const handleConfirm = () => {
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setSelectedDate('');
    if (onChange) {
      onChange('');
    }
  };

  const formatDisplay = (val) => {
    if (!val) return '';
    const p = parseDate(val);
    if (!p) return val;
    let age = today.getFullYear() - p.year;
    const m = today.getMonth() - p.month;
    if (m < 0 || (m === 0 && today.getDate() < p.day)) {
      age--;
    }
    const ageStr = age >= 0 && age < 120 ? ` (${age} años)` : '';
    return `${p.day} de ${MONTH_NAMES[p.month]} de ${p.year}${ageStr}`;
  };

  const isSelected = (day) => {
    if (!selectedDate) return false;
    const p = parseDate(selectedDate);
    return p && p.year === viewYear && p.month === viewMonth && p.day === day;
  };

  const isToday = (day) => {
    return (
      today.getFullYear() === viewYear &&
      today.getMonth() === viewMonth &&
      today.getDate() === day
    );
  };

  const isDayDisabled = (day) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const iso = `${viewYear}-${mm}-${dd}`;
    if (maxDate && iso > maxDate) return true;
    if (minDate && iso < minDate) return true;
    return false;
  };

  const activeColorClasses = theme === 'indigo'
    ? {
        badge: 'bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/40',
        ring: 'focus:border-indigo-500',
        btn: 'bg-indigo-600 hover:bg-indigo-500 text-white',
        icon: 'text-indigo-400'
      }
    : {
        badge: 'bg-emerald-500 text-black font-extrabold shadow-lg shadow-emerald-500/40',
        ring: 'focus:border-emerald-500',
        btn: 'bg-emerald-500 hover:bg-emerald-400 text-black font-bold',
        icon: 'text-emerald-400'
      };

  return (
    <div className="relative w-full">
      <input
        type="hidden"
        id={id}
        name={name || id}
        value={selectedDate}
        required={required}
      />

      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(true)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsOpen(true); }}
        className={`w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3 text-sm flex items-center justify-between cursor-pointer hover:border-zinc-700 transition-all select-none ${
          selectedDate ? 'text-zinc-100 font-medium' : 'text-zinc-500'
        }`}
      >
        <div className="flex items-center gap-2.5 truncate mr-2">
          <CalendarIcon className={`w-4 h-4 flex-shrink-0 ${activeColorClasses.icon}`} />
          <span className="truncate">
            {selectedDate ? formatDisplay(selectedDate) : placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {selectedDate && (
            <button
              type="button"
              onClick={handleClear}
              className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg hover:bg-zinc-800 transition-colors"
              title="Borrar fecha"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="text-[11px] font-semibold text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md">
            Abrir 📅
          </span>
        </div>
      </div>

      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center">
                  <CalendarIcon className={`w-4 h-4 ${activeColorClasses.icon}`} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white leading-tight">Seleccionar Fecha</h4>
                  <p className="text-[11px] text-zinc-400">Toca el día para seleccionarlo</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 bg-zinc-950/60 p-2 rounded-2xl border border-zinc-800/80">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-8 h-8 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition-colors flex-shrink-0"
                title="Mes anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 flex-1 justify-center">
                <select
                  value={viewMonth}
                  onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                  className="bg-zinc-900 text-zinc-200 text-xs font-semibold rounded-lg px-2.5 py-1.5 border border-zinc-800 outline-none focus:border-zinc-700 cursor-pointer"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={m} value={idx}>
                      {m}
                    </option>
                  ))}
                </select>

                <select
                  value={viewYear}
                  onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                  className="bg-zinc-900 text-zinc-200 text-xs font-semibold rounded-lg px-2.5 py-1.5 border border-zinc-800 outline-none focus:border-zinc-700 cursor-pointer"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="w-8 h-8 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition-colors flex-shrink-0"
                title="Mes siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {DAYS_OF_WEEK.map((d) => (
                <span key={d} className="text-[11px] font-bold text-zinc-500 py-1">
                  {d}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} className="h-9 w-full" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const selected = isSelected(day);
                const current = isToday(day);
                const disabled = isDayDisabled(day);

                return (
                  <button
                    key={day}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleSelectDay(day)}
                    className={`h-9 w-full rounded-xl text-xs flex items-center justify-center transition-all ${
                      disabled
                        ? 'text-zinc-700 cursor-not-allowed opacity-40'
                        : selected
                        ? activeColorClasses.badge
                        : current
                        ? 'border border-zinc-700 text-zinc-100 font-semibold bg-zinc-800/40 hover:bg-zinc-800'
                        : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-zinc-800 flex flex-col gap-2.5">
              {selectedDate ? (
                <div className="text-center text-xs text-zinc-300 bg-zinc-950/60 py-2 px-3 rounded-xl border border-zinc-800/60 truncate">
                  <span className="text-zinc-500 mr-1.5">Seleccionado:</span>
                  <span className="font-semibold text-white">{formatDisplay(selectedDate)}</span>
                </div>
              ) : (
                <div className="text-center text-xs text-zinc-500 py-1">
                  Ninguna fecha seleccionada
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold transition-colors text-center"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!selectedDate}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    selectedDate
                      ? `${activeColorClasses.btn} shadow-lg shadow-emerald-500/20`
                      : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
