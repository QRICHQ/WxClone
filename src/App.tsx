import { Copy, Settings } from "lucide-react"

import { Toast } from "@/components/app/Toast"
import { Button } from "@/components/ui/button"
import { HomeView } from "@/features/home/HomeView"
import { CreateProfileDialog } from "@/features/profiles/CreateProfileDialog"
import { SyncQuitConfirmDialog } from "@/features/profiles/SyncQuitConfirmDialog"
import { SettingsView } from "@/features/settings/SettingsView"
import { useWxCloneController } from "@/hooks/useWxCloneController"

export default function App() {
  const controller = useWxCloneController()

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-6 py-7">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg border bg-card">
              <Copy className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">WxClone</h1>
              <p className="text-sm text-muted-foreground">
                多开微信副本，升级后快速同步。
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={controller.view === "home" ? "default" : "outline"}
              onClick={() => controller.setView("home")}
            >
              主界面
            </Button>
            <Button
              variant={controller.view === "settings" ? "default" : "outline"}
              onClick={() => controller.setView("settings")}
            >
              <Settings data-icon="inline-start" />
              设置
            </Button>
          </div>
        </header>

        {controller.view === "home" ? (
          <HomeView
            environment={controller.environment}
            profiles={controller.profiles}
            enabledCount={controller.enabledCount}
            busyKeys={controller.busyKeys}
            sourceIconPath={controller.sourceIconPath}
            profileIconPaths={controller.profileIconPaths}
            onRefresh={controller.refresh}
            onCreate={controller.openCreateDialog}
            onSyncAll={controller.syncEnabled}
            onLaunch={controller.launch}
            onSync={controller.syncOne}
            onDelete={controller.deleteProfile}
            onToggleEnabled={controller.toggleEnabled}
          />
        ) : (
          <SettingsView
            settings={controller.settings}
            appVersion={controller.appVersion}
            setSettings={controller.setSettings}
            busyKeys={controller.busyKeys}
            onSave={controller.saveCurrentSettings}
            onRefresh={controller.refresh}
            onCheckUpdate={controller.checkUpdate}
            onChooseSource={(callback) => void controller.chooseSourcePath(callback)}
          />
        )}

        <Toast
          toast={controller.toast}
          onClose={() => controller.setToast(null)}
          onOpenUrl={controller.openUrl}
        />
      </div>

      <CreateProfileDialog
        open={controller.createOpen}
        setOpen={controller.setCreateOpen}
        draft={controller.draft}
        updateDraft={controller.updateDraft}
        createError={controller.createError}
        busyKeys={controller.busyKeys}
        onCreate={controller.createProfile}
        onChooseSource={(callback) => void controller.chooseSourcePath(callback)}
      />
      <SyncQuitConfirmDialog
        open={Boolean(controller.syncConfirm)}
        runningApps={controller.syncConfirm?.runningApps ?? []}
        onCancel={() => controller.closeSyncConfirm(false)}
        onConfirm={() => controller.closeSyncConfirm(true)}
      />
    </main>
  )
}
