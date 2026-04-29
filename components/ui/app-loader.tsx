import { cn } from "@/lib/utils"

type AppLoaderProps = {
  label?: string
  className?: string
  imageClassName?: string
}

export function AppLoader({ label, className, imageClassName }: AppLoaderProps) {
  return (
    <div className={cn("flex items-center justify-center gap-3 text-muted-foreground", className)}>
      <img
        src="/loaders/group-loader.gif"
        alt=""
        aria-hidden="true"
        className={cn("h-12 w-12 object-contain", imageClassName)}
      />
      {label ? <span>{label}</span> : null}
    </div>
  )
}
