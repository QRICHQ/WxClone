import { AlertCircle, FolderOpen, Loader2 } from "lucide-react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { appPathFor, hasCloneWriteBusy } from "@/domain/profiles"
import type { CloneProfile } from "@/types/wxclone"

export function CreateProfileDialog({
  open,
  setOpen,
  draft,
  updateDraft,
  createError,
  busyKeys,
  onCreate,
  onChooseSource,
}: {
  open: boolean
  setOpen: (open: boolean) => void
  draft: CloneProfile | null
  updateDraft: (patch: Partial<CloneProfile>) => void
  createError: string
  busyKeys: string[]
  onCreate: () => Promise<void>
  onChooseSource: (callback: (path: string) => void) => void
}) {
  const isCreateBusy = busyKeys.includes("create")
  const isChooseSourceBusy = busyKeys.includes("choose-source")
  const isCloneWriteBusy = hasCloneWriteBusy(busyKeys)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>创建微信副本</DialogTitle>
          <DialogDescription>
            默认值来自设置，可以在创建前自定义修改。
          </DialogDescription>
        </DialogHeader>

        {draft ? (
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="create-name">名字</Label>
                <Input
                  id="create-name"
                  value={draft.name}
                  onChange={(event) => updateDraft({ name: event.currentTarget.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="create-bundle">Bundle ID</Label>
                <Input
                  id="create-bundle"
                  value={draft.bundle_id}
                  onChange={(event) =>
                    updateDraft({ bundle_id: event.currentTarget.value })
                  }
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="create-source">源应用路径</Label>
              <div className="flex gap-2">
                <Input
                  id="create-source"
                  value={draft.source_path}
                  onChange={(event) => updateDraft({ source_path: event.currentTarget.value })}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onChooseSource((path) => updateDraft({ source_path: path }))}
                  disabled={isChooseSourceBusy}
                >
                  {isChooseSourceBusy ? (
                    <Loader2 className="animate-spin" data-icon="inline-start" />
                  ) : (
                    <FolderOpen data-icon="inline-start" />
                  )}
                  选择
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label>创建位置</Label>
              <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground">
                固定为 /Applications
              </div>
            </div>
            <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              输出路径：{appPathFor(draft)}
            </div>
          </div>
        ) : null}

        {createError ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>存在冲突</AlertTitle>
            <AlertDescription>{createError}</AlertDescription>
          </Alert>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isCreateBusy}>
            取消
          </Button>
          <Button onClick={() => void onCreate()} disabled={isCloneWriteBusy || !draft}>
            {isCreateBusy ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : null}
            创建配置
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
