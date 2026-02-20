import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarsProps {
  count: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
}

export default function Stars({ count, max = 3, size = 'md' }: StarsProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  }

  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            sizeClasses[size],
            i < count
              ? 'fill-yellow-400 text-yellow-400'
              : 'fill-none text-gray-600'
          )}
        />
      ))}
    </div>
  )
}
