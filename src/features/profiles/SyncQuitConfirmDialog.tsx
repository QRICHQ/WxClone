import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { QuitAction, RunningAppInfo } from "@/types/wxclone"

export function SyncQuitConfirmDialog({
  open,
  action,
  runningApps,
  onCancel,
  onConfirm,
}: {
  open: boolean
  action: QuitAction
  runningApps: RunningAppInfo[]
  onCancel: () => void
  onConfirm: () => void
}) {
  const title =
    runningApps.length > 1 ? "退出正在运行的副本" : `退出 ${runningApps[0]?.name ?? "副本"}`
  const isDelete = action === "delete"

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {isDelete
              ? "删除会移除应用文件。请先退出正在运行的副本，确认后 WxClone 会自动退出它们再继续删除。"
              : "同步会替换应用文件。请先退出正在运行的副本，确认后 WxClone 会自动退出它们再继续同步。"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          {runningApps.map((app) => (
            <div key={app.bundle_id} className="rounded-md border bg-muted/50 px-3 py-2">
              <div className="text-sm font-medium">{app.name}</div>
              <div className="mt-1 truncate text-xs text-muted-foreground">
                {app.app_path}
              </div>
              <div className="mt-1 truncate text-xs text-muted-foreground">
                {app.bundle_id}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {isDelete ? "取消删除" : "取消同步"}
          </Button>
          <Button onClick={onConfirm}>{isDelete ? "退出并删除" : "退出并同步"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
