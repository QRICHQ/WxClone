import { AlertCircle, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ToastState } from "@/types/wxclone"

export function Toast({
  toast,
  onClose,
  onOpenUrl,
}: {
  toast: ToastState | null
  onClose: () => void
  onOpenUrl: (url: string) => Promise<void>
}) {
  if (!toast) return null

  const canOpen = Boolean(toast.actionUrl)

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[min(360px,calc(100vw-3rem))]">
      <div
        role={canOpen ? "button" : "status"}
        tabIndex={canOpen ? 0 : undefined}
        onClick={() => {
          if (toast.actionUrl) void onOpenUrl(toast.actionUrl)
        }}
        onKeyDown={(event) => {
          if (!toast.actionUrl) return
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            void onOpenUrl(toast.actionUrl)
          }
        }}
        className={cn(
          "flex items-start gap-3 rounded-lg border bg-card p-4 text-card-foreground shadow-lg",
          canOpen && "cursor-pointer transition hover:border-primary/50 hover:shadow-xl",
          toast.variant === "destructive" && "border-destructive/40",
        )}
      >
        <div
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground",
            toast.variant === "destructive" && "bg-destructive text-destructive-foreground",
          )}
        >
          {toast.variant === "destructive" ? (
            <AlertCircle className="size-4" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{toast.title}</div>
          {toast.description ? (
            <div className="mt-1 truncate text-sm text-muted-foreground">
              {toast.description}
            </div>
          ) : null}
          {toast.actionUrl ? (
            <div className="mt-2 text-xs font-medium text-primary">
              {toast.actionLabel ?? "打开链接"}
            </div>
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={(event) => {
            event.stopPropagation()
            onClose()
          }}
          className="h-8 px-2"
        >
          关闭
        </Button>
      </div>
    </div>
  )
}
