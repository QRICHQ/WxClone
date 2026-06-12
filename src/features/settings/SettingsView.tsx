import { FolderOpen, Loader2, RefreshCw, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import type { AppSettings } from "@/types/wxclone"

export function SettingsView({
  settings,
  appVersion,
  setSettings,
  busyKeys,
  onSave,
  onRefresh,
  onCheckUpdate,
  onChooseSource,
}: {
  settings: AppSettings
  appVersion: string
  setSettings: (settings: AppSettings) => void
  busyKeys: string[]
  onSave: () => Promise<void>
  onRefresh: () => Promise<void>
  onCheckUpdate: () => Promise<void>
  onChooseSource: (callback: (path: string) => void) => void
}) {
  const isChooseSourceBusy = busyKeys.includes("choose-source")
  const isRefreshBusy = busyKeys.includes("refresh")
  const isSaveBusy = busyKeys.includes("settings-save")
  const isCheckUpdateBusy = busyKeys.includes("check-update")

  return (
    <>
      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold tracking-normal">基础设置</h2>
          <p className="text-sm text-muted-foreground">
            创建弹窗会默认复用这里的值，再自动追加序号。
          </p>
        </div>

        <Separator className="my-5" />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label>创建位置</Label>
            <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground">
              固定为 /Applications
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="source-path">源应用路径</Label>
            <div className="flex gap-2">
              <Input
                id="source-path"
                value={settings.source_path}
                onChange={(event) =>
                  setSettings({ ...settings, source_path: event.currentTarget.value })
                }
                placeholder="/Applications/WeChat.app"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  onChooseSource((path) => setSettings({ ...settings, source_path: path }))
                }
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
            <Label htmlFor="base-name">基础名字</Label>
            <Input
              id="base-name"
              value={settings.base_name}
              onChange={(event) =>
                setSettings({ ...settings, base_name: event.currentTarget.value })
              }
              placeholder="微信"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="base-bundle">基础 Bundle ID</Label>
            <Input
              id="base-bundle"
              value={settings.base_bundle_id}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  base_bundle_id: event.currentTarget.value,
                })
              }
              placeholder="net.maclub.wechat"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => void onRefresh()} disabled={isRefreshBusy}>
            {isRefreshBusy ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : (
              <RefreshCw data-icon="inline-start" />
            )}
            重新载入
          </Button>
          <Button onClick={() => void onSave()} disabled={isSaveBusy}>
            {isSaveBusy ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : (
              <Save data-icon="inline-start" />
            )}
            保存设置
          </Button>
        </div>
      </section>

      <section className="flex items-center justify-between gap-4 rounded-lg border bg-card px-5 py-4 shadow-sm">
        <div className="min-w-0">
          <div className="text-sm font-medium">当前版本</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {appVersion ? `v${appVersion}` : "读取中"}
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => void onCheckUpdate()}
          disabled={isCheckUpdateBusy}
        >
          {isCheckUpdateBusy ? (
            <Loader2 className="animate-spin" data-icon="inline-start" />
          ) : (
            <RefreshCw data-icon="inline-start" />
          )}
          检查更新
        </Button>
      </section>
    </>
  )
}
