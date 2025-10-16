"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useState, useMemo } from "react"

interface WeekDatePickerProps {
  value: string
  onChange: (date: string) => void
  availableDays: string[]
}

export function WeekDatePicker({ value, onChange, availableDays }: WeekDatePickerProps) {
  const [weekOffset, setWeekOffset] = useState(0)

  const weekDates = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Calculate the start of the week (Monday)
    const currentDay = today.getDay()
    const diff = currentDay === 0 ? -6 : 1 - currentDay // Adjust when day is Sunday
    const monday = new Date(today)
    monday.setDate(today.getDate() + diff + weekOffset * 7)

    const dates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      dates.push(date)
    }

    return dates
  }, [weekOffset])

  const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const getDayName = (date: Date) => {
    return date.toLocaleDateString("es-ES", { weekday: "short" })
  }

  const getMonthName = (date: Date) => {
    return date.toLocaleDateString("es-ES", { month: "short" })
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isPast = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  const isAvailable = (date: Date) => {
    const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase()
    return availableDays.includes(dayOfWeek) && !isPast(date)
  }

  const hasAvailableDaysInWeek = weekDates.some((date) => isAvailable(date))

  const getWeekLabel = () => {
    if (weekOffset === 0) return "Esta Semana"
    if (weekOffset === 1) return "Próxima Semana"
    const firstDay = weekDates[0]
    const lastDay = weekDates[6]
    return `${getMonthName(firstDay)} ${firstDay.getDate()} - ${getMonthName(lastDay)} ${lastDay.getDate()}`
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
          disabled={weekOffset === 0}
          className="h-8"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Anterior
        </Button>

        <div className="text-sm font-medium text-gray-700">{getWeekLabel()}</div>

        <Button type="button" variant="outline" size="sm" onClick={() => setWeekOffset(weekOffset + 1)} className="h-8">
          Siguiente
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {!hasAvailableDaysInWeek && (
        <div className="text-center text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md p-2">
          No available time slots this week. Try another week.
        </div>
      )}

      <div className="grid grid-cols-7 gap-2">
        {weekDates.map((date, index) => {
          const dateString = formatDate(date)
          const available = isAvailable(date)
          const selected = dateString === value
          const today = isToday(date)
          const past = isPast(date)

          return (
            <button
              key={index}
              type="button"
              onClick={() => available && onChange(dateString)}
              disabled={!available}
              className={`
                relative flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all
                ${
                  selected
                    ? "bg-red-600 border-red-600 text-white shadow-md"
                    : available
                      ? "bg-white border-gray-200 hover:border-red-300 hover:bg-red-50 cursor-pointer"
                      : "bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed"
                }
                ${today && !selected ? "ring-2 ring-red-400 ring-offset-1" : ""}
              `}
            >
              <div className={`text-xs font-medium ${selected ? "text-white" : "text-gray-500"}`}>
                {getDayName(date)}
              </div>
              <div
                className={`text-lg font-bold ${selected ? "text-white" : available ? "text-gray-900" : "text-gray-300"}`}
              >
                {date.getDate()}
              </div>
              {today && !selected && <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />}
              {available && !selected && !past && (
                <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-green-500 rounded-full" />
              )}
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-center gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-red-500 rounded-full" />
          <span>Hoy</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1 h-1 bg-green-500 rounded-full" />
          <span>Disponible</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-gray-300 rounded-full" />
          <span>No disponible</span>
        </div>
      </div>
    </div>
  )
}
