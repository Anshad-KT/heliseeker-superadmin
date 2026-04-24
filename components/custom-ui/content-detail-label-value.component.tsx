import { JSX } from "react"

import { TruncatedText } from "@/components/ui/truncated-text"

export const LabelAndValueComponent = ({
  label,
  value,
  noSpan,
}: {
  label: string
  value: string | JSX.Element | undefined | null | number
  noSpan?: boolean
}) => {
  const hasValue = value !== undefined && value !== null && value !== ""
  const isPrimitive = typeof value === "string" || typeof value === "number"

  if (noSpan) {
    return (
      <div className="space-y-2">
        <span className="text-sm font-semibold text-primary">{label}:</span>
        {hasValue ? (
          <div className="text-sm border rounded p-4 text-purple-one max-w-full whitespace-pre-wrap break-words">
            {isPrimitive ? String(value) : value}
          </div>
        ) : (
          <span className="text-gray-400">N/A</span>
        )}
      </div>
    )
  }

  return (
    <div className="flex min-w-0 items-start gap-2">
      <span className="text-sm font-semibold text-primary shrink-0">{label}:</span>
      {hasValue ? (
        isPrimitive ? (
          <TruncatedText value={value} className="text-sm font-medium text-purple-one" />
        ) : (
          <span className="text-sm font-medium text-purple-one min-w-0 break-words">{value}</span>
        )
      ) : (
        <span className="text-gray-400">N/A</span>
      )}
    </div>
  )
}
