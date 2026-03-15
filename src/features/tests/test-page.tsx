import { cn } from '@/lib/utils'
import { Slider as SliderPrimitive } from 'radix-ui'
import { useState } from 'react'

export function TestPage() {
  const [value, setValue] = useState(0)

  return (
    <div className="relative isolate">
      <div className="bg-muted absolute inset-x-0 top-1/2 h-4 w-full -translate-y-1/2 rounded-full" />
      <div
        className="bg-primary absolute inset-x-0 top-1/2 h-4 -translate-y-1/2 rounded-full"
        style={{ width: `calc((100%/16) + ${100 * (value / 8)}%)` }}
      />

      <div className="relative grid grid-cols-8 gap-6">
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            onClick={() => setValue(index)}
            className="bg-muted flex aspect-square w-full cursor-pointer items-center justify-center rounded-full"
          >
            asdfasdf
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0 h-full">
        <SliderPrimitive.Root
          min={0}
          max={7}
          step={1}
          value={[value]}
          onValueChange={([value]) => setValue(value)}
          className={cn(
            'relative flex h-full w-full shrink-0 touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col [&>span]:aspect-square [&>span]:h-full'
          )}
        >
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            className="border-primary ring-ring/50 pointer-events-auto block aspect-square h-full min-h-full shrink-0 cursor-grab rounded-full border bg-white shadow-sm transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden active:cursor-grabbing disabled:pointer-events-none disabled:opacity-50"
          />
        </SliderPrimitive.Root>
      </div>
    </div>
  )
}
