"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

type TruncatedTextProps = {
  value?: string | number | null
  placeholder?: string
  className?: string
  tooltipClassName?: string
  tooltipContentClassName?: string
}

export function TruncatedText({
  value,
  placeholder = "—",
  className,
  tooltipClassName,
  tooltipContentClassName,
}: TruncatedTextProps) {
  const text = value === null || value === undefined ? "" : String(value)
  const trimmed = text.trim()
  const display = trimmed ? text : placeholder

  if (!trimmed) {
    return <span className={cn("block min-w-0 truncate", className)}>{display}</span>
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("block min-w-0 truncate", className, tooltipClassName)} title={text}>
          {text}
        </span>
      </TooltipTrigger>
      <TooltipContent className={cn("max-w-[520px] whitespace-pre-wrap break-words", tooltipContentClassName)}>
        {text}
      </TooltipContent>
    </Tooltip>
  )
}

