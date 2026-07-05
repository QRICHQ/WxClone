import { invoke } from "@tauri-apps/api/core"

import {
  appPathFor,
  defaultProfiles,
  DEFAULT_SETTINGS,
  INSTALL_HINT,
  SOURCE_HINT,
} from "@/domain/profiles"
import type { AppSettings, CloneProfile, IconInfo } from "@/types/wxclone"

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown
  }
}

const MOCK_PROFILE_KEY = "wxclone.mock.profiles.v2"
const MOCK_SETTINGS_KEY = "wxclone.mock.settings.v2"

export function isTauriRuntime() {
  return typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__)
}

export async function callCommand<T>(command: string, args?: Record<string, unknown>) {
  if (isTauriRuntime()) {
    return invoke<T>(command, args)
  }

  return callMockCommand<T>(command, args)
}

async function callMockCommand<T>(command: string, args?: Record<string, unknown>) {
  if (command === "load_settings") {
    const raw = window.localStorage.getItem(MOCK_SETTINGS_KEY)
    return { ...(raw ? JSON.parse(raw) : DEFAULT_SETTINGS), install_dir: INSTALL_HINT } as T
  }

  if (command === "save_settings") {
    const settings = args?.settings as AppSettings
    const fixedSettings = { ...settings, install_dir: INSTALL_HINT }
    window.localStorage.setItem(MOCK_SETTINGS_KEY, JSON.stringify(fixedSettings))
    return fixedSettings as T
  }

  if (command === "get_environment") {
    const sourcePath = (args?.sourcePath as string | undefined) ?? SOURCE_HINT
    return {
      source_path: sourcePath,
      source_exists: false,
      source_bundle_id: "com.tencent.xinWeChat",
      source_version: "浏览器预览",
    } as T
  }

  if (command === "get_app_version") {
    return "0.1.1" as T
  }

  if (command === "check_for_update") {
    return {
      current_version: "0.1.1",
      latest_version: "0.1.1",
      latest_url: "https://github.com/RICHQAQ/WxClone/releases/latest",
      has_update: false,
    } as T
  }

  if (command === "open_url") {
    const url = args?.url as string | undefined
    if (url) window.open(url, "_blank", "noopener,noreferrer")
    return undefined as T
  }

  if (command === "load_profiles") {
    const raw = window.localStorage.getItem(MOCK_PROFILE_KEY)
    return (raw ? JSON.parse(raw) : defaultProfiles()) as T
  }

  if (command === "save_profiles") {
    const profiles = (args?.profiles ?? []) as CloneProfile[]
    window.localStorage.setItem(MOCK_PROFILE_KEY, JSON.stringify(profiles))
    return profiles as T
  }

  if (command === "check_profile_conflict") {
    const profile = args?.profile as CloneProfile
    return {
      app_path: appPathFor(profile),
      target_exists: false,
      bundle_id_at_target: null,
    } as T
  }

  if (command === "check_profile_app_info") {
    const profile = args?.profile as CloneProfile
    return {
      app_path: appPathFor(profile),
      installed: true,
      bundle_id: profile.bundle_id,
      version: "浏览器预览",
    } as T
  }

  if (command === "choose_source_app") {
    return null as T
  }

  if (command === "get_app_icon") {
    return null as T
  }

  if (command === "check_running_profile") {
    const profile = args?.profile as CloneProfile
    return {
      name: profile.name,
      bundle_id: profile.bundle_id,
      app_path: appPathFor(profile),
      is_running: false,
      process_count: 0,
    } as T
  }

  if (command === "quit_running_profile") {
    const profile = args?.profile as CloneProfile
    return {
      name: profile.name,
      bundle_id: profile.bundle_id,
      app_path: appPathFor(profile),
      is_running: false,
      process_count: 0,
    } as T
  }

  if (command === "sync_profile") {
    const profile = args?.profile as CloneProfile
    return {
      app_path: appPathFor(profile),
      message: "浏览器预览模式未执行系统命令",
    } as T
  }

  if (command === "sync_all") {
    const profiles = ((args?.profiles ?? []) as CloneProfile[]).filter(
      (profile) => profile.enabled,
    )
    return profiles.map((profile) => ({
      app_path: appPathFor(profile),
      message: "浏览器预览模式未执行系统命令",
    })) as T
  }

  if (
    command === "launch_profile" ||
    command === "reveal_profile_app" ||
    command === "remove_profile_app"
  ) {
    return undefined as T
  }

  return undefined as T
}

export async function loadAppIcon(appPath: string) {
  return callCommand<IconInfo | null>("get_app_icon", { appPath })
}
