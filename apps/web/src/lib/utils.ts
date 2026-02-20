import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function getEducationLevelLabel(level: string): string {
  const labels: Record<string, string> = {
    basic_school: 'Basic School (6-10)',
    junior_high: 'Junior High (11-14)',
    senior_high: 'Senior High (15-18)',
    undergraduate: 'Undergraduate',
    postgraduate: 'Postgraduate',
    researcher: 'Researcher',
  }
  return labels[level] || level
}

export function getEducationLevelColor(level: string): string {
  const colors: Record<string, string> = {
    basic_school: 'bg-green-500',
    junior_high: 'bg-blue-500',
    senior_high: 'bg-purple-500',
    undergraduate: 'bg-orange-500',
    postgraduate: 'bg-red-500',
    researcher: 'bg-pink-500',
  }
  return colors[level] || 'bg-gray-500'
}

// Alias for convenience
export const getLevelLabel = getEducationLevelLabel
