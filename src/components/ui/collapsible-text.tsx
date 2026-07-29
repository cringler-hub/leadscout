import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

// Zeigt Text standardmäßig auf 2 Zeilen gekürzt mit "Mehr/Weniger"-Toggle,
// solange der Text lang genug ist, dass sich das Ein-/Ausklappen überhaupt lohnt.
export function CollapsibleText({
  text,
  className,
  collapsedClassName,
  threshold = 110,
}: {
  text: string
  className?: string
  collapsedClassName?: string
  threshold?: number
}) {
  const [expanded, setExpanded] = useState(false)
  const isLong = text.length > threshold

  return (
    <div>
      <p className={cn(className, !expanded && isLong && (collapsedClassName ?? 'line-clamp-2'))}>{text}</p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-1 flex items-center gap-0.5 text-xs font-medium text-brand-600 hover:text-brand-700"
        >
          {expanded ? (
            <>
              Weniger <ChevronUp className="h-3 w-3" />
            </>
          ) : (
            <>
              Mehr <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>
      )}
    </div>
  )
}
