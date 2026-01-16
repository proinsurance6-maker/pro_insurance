'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from './input';

interface DatePickerProps {
  value: string; // YYYY-MM-DD format
  onChange: (date: string) => void; // Returns YYYY-MM-DD format
  name?: string;
  required?: boolean;
  className?: string;
  placeholder?: string;
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const MONTH_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function DatePicker({ value, onChange, name, required, className, placeholder }: DatePickerProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [displayValue, setDisplayValue] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const calendarRef = useRef<HTMLDivElement>(null);

  // Convert YYYY-MM-DD to DD-MMM-YYYY display format
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        const day = date.getDate().toString().padStart(2, '0');
        const month = MONTHS[date.getMonth()];
        const year = date.getFullYear();
        setDisplayValue(`${day}-${month}-${year}`);
        setSelectedDate(date);
        setViewMonth(date.getMonth());
        setViewYear(date.getFullYear());
      }
    } else {
      setDisplayValue('');
      setSelectedDate(null);
    }
  }, [value]);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
    };

    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCalendar]);

  const handleDateSelect = (day: number) => {
    const newDate = new Date(viewYear, viewMonth, day);
    const yyyy = newDate.getFullYear();
    const mm = String(newDate.getMonth() + 1).padStart(2, '0');
    const dd = String(newDate.getDate()).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    setShowCalendar(false);
  };

  const handleToday = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    setShowCalendar(false);
  };

  const handleClear = () => {
    onChange('');
    setShowCalendar(false);
  };

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(viewMonth, viewYear);
    const firstDay = getFirstDayOfMonth(viewMonth, viewYear);
    const days = [];

    // Previous month's days
    const prevMonthDays = getDaysInMonth(viewMonth - 1, viewYear);
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push(
        <button
          key={`prev-${i}`}
          type="button"
          className="w-8 h-8 text-xs text-gray-400 hover:bg-gray-100 rounded"
          onClick={() => {
            const newMonth = viewMonth === 0 ? 11 : viewMonth - 1;
            const newYear = viewMonth === 0 ? viewYear - 1 : viewYear;
            setViewMonth(newMonth);
            setViewYear(newYear);
          }}
        >
          {prevMonthDays - i}
        </button>
      );
    }

    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = 
        day === new Date().getDate() &&
        viewMonth === new Date().getMonth() &&
        viewYear === new Date().getFullYear();
      
      const isSelected = 
        selectedDate &&
        day === selectedDate.getDate() &&
        viewMonth === selectedDate.getMonth() &&
        viewYear === selectedDate.getFullYear();

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => handleDateSelect(day)}
          className={`w-8 h-8 text-xs rounded transition ${
            isSelected
              ? 'bg-blue-600 text-white font-bold'
              : isToday
              ? 'bg-blue-100 text-blue-700 font-semibold'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          {day}
        </button>
      );
    }

    // Next month's days to fill the grid
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    const remainingDays = totalCells - (firstDay + daysInMonth);
    for (let i = 1; i <= remainingDays; i++) {
      days.push(
        <button
          key={`next-${i}`}
          type="button"
          className="w-8 h-8 text-xs text-gray-400 hover:bg-gray-100 rounded"
          onClick={() => {
            const newMonth = viewMonth === 11 ? 0 : viewMonth + 1;
            const newYear = viewMonth === 11 ? viewYear + 1 : viewYear;
            setViewMonth(newMonth);
            setViewYear(newYear);
          }}
        >
          {i}
        </button>
      );
    }

    return days;
  };

  const generateYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 50; i <= currentYear + 10; i++) {
      years.push(i);
    }
    return years;
  };

  return (
    <div className="relative" ref={calendarRef}>
      <Input
        type="text"
        name={name}
        value={displayValue}
        onClick={() => setShowCalendar(!showCalendar)}
        onChange={() => {}} // Read-only, controlled by calendar
        placeholder={placeholder || 'DD-MMM-YYYY'}
        required={required}
        className={`cursor-pointer ${className}`}
        readOnly
      />
      
      {showCalendar && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-72">
          {/* Month and Year Dropdowns */}
          <div className="flex gap-2 mb-3">
            <select
              value={viewMonth}
              onChange={(e) => setViewMonth(parseInt(e.target.value))}
              className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-blue-400"
            >
              {MONTH_FULL.map((month, index) => (
                <option key={month} value={index}>{month}</option>
              ))}
            </select>
            <select
              value={viewYear}
              onChange={(e) => setViewYear(parseInt(e.target.value))}
              className="w-24 px-2 py-1 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-blue-400"
            >
              {generateYears().map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Calendar Grid */}
          <div className="mb-3">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                <div key={day} className="w-8 h-6 text-xs font-semibold text-gray-600 flex items-center justify-center">
                  {day}
                </div>
              ))}
            </div>
            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1">
              {renderCalendar()}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-between pt-2 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
