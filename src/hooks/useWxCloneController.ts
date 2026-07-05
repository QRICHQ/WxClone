import { useEffect, useMemo, useState } from "react"

import {
  appPathFor,
  draftFromSettings,
  getLocalProfileConflict,
  INSTALL_HINT,
  profileBusyKey,
} from "@/domain/profiles"
import { useBusyKeys } from "@/hooks/useBusyKeys"
import { withTimeout } from "@/services/async"
import { callCommand, isTauriRuntime, loadAppIcon } from "@/services/wxcloneCommands"
import type {
  AppSettings,
  AppView,
  CloneProfile,
  ConflictInfo,
  EnvironmentInfo,
  OperationResult,
  ProfileAppInfo,
  RunningAppInfo,
  SyncConfirmState,
  ToastState,
  UpdateInfo,
} from "@/types/wxclone"
import { DEFAULT_SETTINGS } from "@/domain/profiles"

export function useWxCloneController() {
  const [view, setView] = useState<AppView>("home")
  const [environment, setEnvironment] = useState<EnvironmentInfo | null>(null)
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [appVersion, setAppVersion] = useState("")
  const [profiles, setProfiles] = useState<CloneProfile[]>([])
  const [profileAppInfos, setProfileAppInfos] = useState<Record<string, ProfileAppInfo>>({})
  const [draft, setDraft] = useState<CloneProfile | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createError, setCreateError] = useState("")
  const [sourceIconPath, setSourceIconPath] = useState<string | null>(null)
  const [profileIconPaths, setProfileIconPaths] = useState<Record<string, string | null>>({})
  const [toast, setToast] = useState<ToastState | null>(null)
  const [syncConfirm, setSyncConfirm] = useState<SyncConfirmState | null>(null)
  const { busyKeys, runBusy } = useBusyKeys()

  const enabledCount = useMemo(
    () => profiles.filter((profile) => profile.enabled).length,
    [profiles],
  )
  const profileIconSignature = useMemo(
    () => profiles.map((profile) => `${profile.id}:${appPathFor(profile)}`).join("|"),
    [profiles],
  )

  useEffect(() => {
    void refresh()
  }, [])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 2800)
    return () => window.clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    void loadIcons()
  }, [environment?.source_path, profileIconSignature])

  async function refresh() {
    await runBusy("refresh", async () => {
      const loadedSettings = await callCommand<AppSettings>("load_settings")
      const [env, loadedProfiles, version] = await Promise.all([
        callCommand<EnvironmentInfo>("get_environment", {
          sourcePath: loadedSettings.source_path,
        }),
        callCommand<CloneProfile[]>("load_profiles"),
        callCommand<string>("get_app_version"),
      ])
      setSettings({ ...loadedSettings, install_dir: INSTALL_HINT })
      setEnvironment(env)
      setProfiles(loadedProfiles)
      await loadProfileAppInfos(loadedProfiles)
      setAppVersion(version)
    }).catch(notifyError)
  }

  async function loadProfileAppInfos(targetProfiles: CloneProfile[]) {
    const entries = await Promise.all(
      targetProfiles.map(async (profile) => {
        try {
          const info = await callCommand<ProfileAppInfo>("check_profile_app_info", {
            profile,
          })
          return [profile.id, info] as const
        } catch {
          return [
            profile.id,
            {
              app_path: appPathFor(profile),
              installed: false,
              bundle_id: null,
              version: null,
            },
          ] as const
        }
      }),
    )
    setProfileAppInfos(Object.fromEntries(entries))
  }

  async function loadIcons() {
    try {
      const sourcePath = environment?.source_path || settings.source_path
      const sourceIcon = await loadAppIcon(sourcePath)
      setSourceIconPath(sourceIcon?.data_url ?? null)

      const entries = await Promise.all(
        profiles.map(async (profile) => {
          const icon = await loadAppIcon(appPathFor(profile))
          return [profile.id, icon?.data_url ?? null] as const
        }),
      )
      setProfileIconPaths(Object.fromEntries(entries))
    } catch {
      setSourceIconPath(null)
      setProfileIconPaths({})
    }
  }

  function notify(
    title: string,
    description?: string,
    variant: ToastState["variant"] = "default",
    action?: Pick<ToastState, "actionUrl" | "actionLabel">,
  ) {
    setToast({ id: Date.now(), title, description, variant, ...action })
  }

  function notifyError(err: unknown) {
    notify("操作失败", String(err), "destructive")
  }

  async function openUrl(url: string) {
    try {
      if (isTauriRuntime()) {
        await callCommand("open_url", { url })
      } else {
        window.open(url, "_blank", "noopener,noreferrer")
      }
      setToast(null)
    } catch (err) {
      notifyError(err)
    }
  }

  async function refreshEnvironment(nextSettings = settings) {
    const env = await callCommand<EnvironmentInfo>("get_environment", {
      sourcePath: nextSettings.source_path,
    })
    setEnvironment(env)
  }

  function openCreateDialog() {
    setCreateError("")
    setDraft(draftFromSettings(settings, profiles))
    setCreateOpen(true)
  }

  function updateDraft(patch: Partial<CloneProfile>) {
    setDraft((current) => (current ? { ...current, ...patch } : current))
    setCreateError("")
  }

  async function createProfile() {
    if (!draft) return
    setCreateError("")

    const localError = getLocalProfileConflict(draft, profiles)
    if (localError) {
      setCreateError(localError)
      return
    }

    await runBusy("create", async () => {
      const conflict = await callCommand<ConflictInfo>("check_profile_conflict", {
        profile: draft,
      })
      if (conflict.target_exists) {
        const bundle = conflict.bundle_id_at_target
          ? `，现有 Bundle ID: ${conflict.bundle_id_at_target}`
          : ""
        setCreateError(`目标位置已存在应用: ${conflict.app_path}${bundle}`)
        return
      }

      const nextProfiles = [...profiles, draft]
      const saved = await callCommand<CloneProfile[]>("save_profiles", {
        profiles: nextProfiles,
      })
      setProfiles(saved)
      try {
        const result = await callCommand<OperationResult>("sync_profile", {
          profile: draft,
        })
        try {
          await callCommand("launch_profile", { profile: draft })
          notify(`已创建并启动 ${draft.name}`, result.app_path)
        } catch (launchErr) {
          notify(`已创建 ${draft.name}，但启动失败`, String(launchErr), "destructive")
        }
      } catch (syncErr) {
        const rolledBack = saved.filter((profile) => profile.id !== draft.id)
        await callCommand<CloneProfile[]>("save_profiles", {
          profiles: rolledBack,
        })
        setProfiles(rolledBack)
        await loadProfileAppInfos(rolledBack)
        throw syncErr
      }
      await loadProfileAppInfos(saved)
      setCreateOpen(false)
      setDraft(null)
    }).catch(notifyError)
  }

  async function saveCurrentSettings() {
    await runBusy("settings-save", async () => {
      const saved = await callCommand<AppSettings>("save_settings", { settings })
      setSettings(saved)
      await refreshEnvironment(saved)
      notify("设置已保存")
    }).catch(notifyError)
  }

  async function saveProfiles(nextProfiles = profiles) {
    const saved = await callCommand<CloneProfile[]>("save_profiles", {
      profiles: nextProfiles,
    })
    setProfiles(saved)
    return saved
  }

  async function confirmQuitRunningApps(runningApps: RunningAppInfo[]) {
    return new Promise<boolean>((resolve) => {
      setSyncConfirm({ runningApps, resolve })
    })
  }

  function closeSyncConfirm(confirmed: boolean) {
    syncConfirm?.resolve(confirmed)
    setSyncConfirm(null)
  }

  async function prepareProfilesForSync(targetProfiles: CloneProfile[]) {
    const runningApps = (
      await Promise.all(
        targetProfiles.map((profile) =>
          callCommand<RunningAppInfo>("check_running_profile", { profile }),
        ),
      )
    ).filter((info) => info.is_running)

    if (runningApps.length === 0) return true
    const confirmed = await confirmQuitRunningApps(runningApps)
    if (!confirmed) return false

    for (const profile of targetProfiles) {
      if (!runningApps.some((info) => info.bundle_id === profile.bundle_id)) continue
      await callCommand<RunningAppInfo>("quit_running_profile", { profile })
    }
    return runningApps
  }

  async function launchProfilesAfterSync(targetProfiles: CloneProfile[]) {
    const failures: string[] = []
    for (const profile of targetProfiles) {
      try {
        await callCommand("launch_profile", { profile })
      } catch {
        failures.push(profile.name)
      }
    }
    return failures
  }

  async function syncOne(profile: CloneProfile) {
    await runBusy(profileBusyKey("sync", profile), async () => {
      const saved = await saveProfiles()
      const current = saved.find((item) => item.id === profile.id)
      if (!current) return
      const runningBeforeSync = await prepareProfilesForSync([current])
      if (!runningBeforeSync) return
      const result = await callCommand<OperationResult>("sync_profile", {
        profile: current,
      })
      await loadProfileAppInfos(saved)
      if (runningBeforeSync !== true) {
        const launchFailures = await launchProfilesAfterSync([current])
        if (launchFailures.length > 0) {
          notify(`已同步 ${current.name}，但重新启动失败`, result.app_path, "destructive")
          return
        }
      }
      notify(`已同步版本 ${current.name}`, result.app_path)
    }).catch(notifyError)
  }

  async function syncEnabled() {
    await runBusy("sync-all", async () => {
      const saved = await saveProfiles()
      const enabledProfiles = saved.filter((profile) => profile.enabled)
      const runningBeforeSync = await prepareProfilesForSync(enabledProfiles)
      if (!runningBeforeSync) return
      const results = await callCommand<OperationResult[]>("sync_all", {
        profiles: saved,
      })
      await loadProfileAppInfos(saved)
      if (runningBeforeSync !== true) {
        const runningBundleIds = new Set(runningBeforeSync.map((info) => info.bundle_id))
        const launchFailures = await launchProfilesAfterSync(
          enabledProfiles.filter((profile) => runningBundleIds.has(profile.bundle_id)),
        )
        if (launchFailures.length > 0) {
          notify(
            "版本同步完成，但部分副本重新启动失败",
            launchFailures.join("、"),
            "destructive",
          )
          return
        }
      }
      notify("版本同步完成", `已同步 ${results.length} 个微信副本`)
    }).catch(notifyError)
  }

  async function launch(profile: CloneProfile) {
    await runBusy(profileBusyKey("launch", profile), async () => {
      await callCommand("launch_profile", { profile })
      notify("已启动", profile.name)
    }).catch(notifyError)
  }

  async function deleteProfile(profile: CloneProfile) {
    await runBusy(profileBusyKey("delete", profile), async () => {
      await callCommand("remove_profile_app", { profile })
      const nextProfiles = profiles.filter((item) => item.id !== profile.id)
      await saveProfiles(nextProfiles)
      setProfileAppInfos((current) => {
        const next = { ...current }
        delete next[profile.id]
        return next
      })
      notify("已删除", profile.name)
    }).catch(notifyError)
  }

  async function chooseSourcePath(onChoose: (path: string) => void) {
    await runBusy("choose-source", async () => {
      const path = await callCommand<string | null>("choose_source_app")
      if (path) onChoose(path)
    }).catch(notifyError)
  }

  async function checkUpdate() {
    await runBusy("check-update", async () => {
      const update = await withTimeout(
        callCommand<UpdateInfo>("check_for_update"),
        16_000,
        "版本检查超时，请稍后重试。",
      )
      setAppVersion(update.current_version)
      if (update.has_update) {
        notify(
          `发现新版本 ${update.latest_version}`,
          `当前版本 ${update.current_version}，点击打开下载页。`,
          "default",
          { actionUrl: update.latest_url, actionLabel: "下载" },
        )
      } else {
        notify("已是最新版本", `当前版本 ${update.current_version}`)
      }
    }).catch(notifyError)
  }

  function toggleEnabled(profile: CloneProfile, enabled: boolean) {
    const nextProfiles = profiles.map((item) =>
      item.id === profile.id ? { ...item, enabled } : item,
    )
    setProfiles(nextProfiles)
    void saveProfiles(nextProfiles)
  }

  return {
    view,
    setView,
    environment,
    settings,
    setSettings,
    appVersion,
    profiles,
    profileAppInfos,
    draft,
    createOpen,
    setCreateOpen,
    busyKeys,
    createError,
    sourceIconPath,
    profileIconPaths,
    toast,
    setToast,
    syncConfirm,
    enabledCount,
    refresh,
    openCreateDialog,
    updateDraft,
    createProfile,
    saveCurrentSettings,
    closeSyncConfirm,
    syncEnabled,
    launch,
    syncOne,
    deleteProfile,
    chooseSourcePath,
    checkUpdate,
    toggleEnabled,
    openUrl,
  }
}
