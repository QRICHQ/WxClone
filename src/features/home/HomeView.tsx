import { FolderSync, Loader2, Play, Plus, RefreshCw, Trash2 } from "lucide-react"

import { AppIcon } from "@/components/app/AppIcon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  appPathFor,
  hasCloneWriteBusy,
  profileBusyKey,
  SOURCE_HINT,
} from "@/domain/profiles"
import type { CloneProfile, EnvironmentInfo } from "@/types/wxclone"

export function HomeView({
  environment,
  profiles,
  enabledCount,
  busyKeys,
  sourceIconPath,
  profileIconPaths,
  onRefresh,
  onCreate,
  onSyncAll,
  onLaunch,
  onSync,
  onDelete,
  onToggleEnabled,
}: {
  environment: EnvironmentInfo | null
  profiles: CloneProfile[]
  enabledCount: number
  busyKeys: string[]
  sourceIconPath: string | null
  profileIconPaths: Record<string, string | null>
  onRefresh: () => Promise<void>
  onCreate: () => void
  onSyncAll: () => Promise<void>
  onLaunch: (profile: CloneProfile) => Promise<void>
  onSync: (profile: CloneProfile) => Promise<void>
  onDelete: (profile: CloneProfile) => Promise<void>
  onToggleEnabled: (profile: CloneProfile, enabled: boolean) => void
}) {
  const isRefreshBusy = busyKeys.includes("refresh")
  const isSyncAllBusy = busyKeys.includes("sync-all")
  const isCloneWriteBusy = hasCloneWriteBusy(busyKeys)

  return (
    <>
      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <AppIcon large iconPath={sourceIconPath} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold tracking-normal">当前微信源应用</h2>
                {environment?.source_exists ? (
                  <Badge>已找到</Badge>
                ) : (
                  <Badge variant="destructive">未找到</Badge>
                )}
                {environment?.source_version ? (
                  <Badge variant="secondary">版本 {environment.source_version}</Badge>
                ) : null}
              </div>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {environment?.source_path ?? SOURCE_HINT}
              </p>
              {environment?.source_bundle_id ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {environment.source_bundle_id}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => void onRefresh()}
              disabled={isRefreshBusy}
            >
              {isRefreshBusy ? (
                <Loader2 className="animate-spin" data-icon="inline-start" />
              ) : (
                <RefreshCw data-icon="inline-start" />
              )}
              刷新
            </Button>
            <Button variant="outline" onClick={onCreate} disabled={isCloneWriteBusy}>
              <Plus data-icon="inline-start" />
              创建
            </Button>
            <Button
              onClick={() => void onSyncAll()}
              disabled={isCloneWriteBusy || enabledCount === 0}
            >
              {isSyncAllBusy ? (
                <Loader2 className="animate-spin" data-icon="inline-start" />
              ) : (
                <FolderSync data-icon="inline-start" />
              )}
              同步全部版本
            </Button>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-normal">副本列表</h2>
            <p className="text-sm text-muted-foreground">
              {profiles.length} 个配置，{enabledCount} 个参与批量同步
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {profiles.map((profile) => {
            const launchBusy = busyKeys.includes(profileBusyKey("launch", profile))
            const syncBusy = busyKeys.includes(profileBusyKey("sync", profile))
            const deleteBusy = busyKeys.includes(profileBusyKey("delete", profile))
            return (
              <div
                key={profile.id}
                className="grid gap-3 rounded-lg border bg-card p-3 shadow-sm md:grid-cols-[52px_1fr_auto] md:items-center"
              >
                <div className="justify-self-start">
                  <AppIcon iconPath={profileIconPaths[profile.id] ?? sourceIconPath} />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <input
                      className="size-4 rounded border-input accent-current"
                      type="checkbox"
                      aria-label={`设置 ${profile.name} 是否参与批量同步`}
                      title="参与批量同步"
                      checked={profile.enabled}
                      onChange={(event) =>
                        onToggleEnabled(profile, event.currentTarget.checked)
                      }
                    />
                    <div className="truncate font-medium">{profile.name}</div>
                    <Badge variant="secondary" className="shrink-0">
                      {profile.enabled ? "参与批量同步" : "跳过批量同步"}
                    </Badge>
                  </div>
                  <div className="mt-2 min-w-0 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                    <span className="block truncate">{appPathFor(profile)}</span>
                  </div>
                  <div className="mt-1 truncate text-xs text-muted-foreground">
                    {profile.bundle_id}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void onLaunch(profile)}
                    disabled={launchBusy || isCloneWriteBusy}
                  >
                    {launchBusy ? (
                      <Loader2 className="animate-spin" data-icon="inline-start" />
                    ) : (
                      <Play data-icon="inline-start" />
                    )}
                    启动
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => void onSync(profile)}
                    disabled={isCloneWriteBusy}
                  >
                    {syncBusy ? (
                      <Loader2 className="animate-spin" data-icon="inline-start" />
                    ) : (
                      <FolderSync data-icon="inline-start" />
                    )}
                    同步版本
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => void onDelete(profile)}
                    disabled={isCloneWriteBusy}
                  >
                    {deleteBusy ? (
                      <Loader2 className="animate-spin" data-icon="inline-start" />
                    ) : (
                      <Trash2 data-icon="inline-start" />
                    )}
                    删除
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </>
  )
}
