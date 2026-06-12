import type { AppSettings, CloneProfile } from "@/types/wxclone"

export const SOURCE_HINT = "/Applications/WeChat.app"
export const INSTALL_HINT = "/Applications"

export const DEFAULT_SETTINGS: AppSettings = {
  install_dir: INSTALL_HINT,
  base_name: "微信",
  base_bundle_id: "net.maclub.wechat",
  source_path: SOURCE_HINT,
}

export function cleanAppName(name: string) {
  return name.trim().replace(/\.app$/i, "")
}

export function cleanDir(path: string) {
  return path.trim().replace(/\/+$/g, "") || INSTALL_HINT
}

export function appPathFor(profile: Pick<CloneProfile, "name">) {
  return `${INSTALL_HINT}/${cleanAppName(profile.name)}.app`
}

export function profileBusyKey(action: string, profile: Pick<CloneProfile, "id">) {
  return `${action}:${profile.id}`
}

export function hasCloneWriteBusy(busyKeys: string[]) {
  return busyKeys.some(
    (key) =>
      key === "create" ||
      key === "sync-all" ||
      key.startsWith("sync:") ||
      key.startsWith("delete:"),
  )
}

export function defaultProfiles(_settings = DEFAULT_SETTINGS): CloneProfile[] {
  return []
}

export function draftFromSettings(
  settings: AppSettings,
  profiles: CloneProfile[],
): CloneProfile {
  const index = profiles.length + 1
  return {
    id: `clone-${Date.now().toString(36)}`,
    name: `${settings.base_name}${index}`,
    bundle_id: `${settings.base_bundle_id}.clone${index}`,
    source_path: settings.source_path,
    install_dir: INSTALL_HINT,
    enabled: true,
  }
}

export function getLocalProfileConflict(
  profile: CloneProfile,
  profiles: CloneProfile[],
) {
  const name = cleanAppName(profile.name)
  const path = appPathFor(profile)
  const duplicateName = profiles.some(
    (item) => cleanAppName(item.name) === name || appPathFor(item) === path,
  )
  const duplicateBundle = profiles.some(
    (item) => item.bundle_id.trim() === profile.bundle_id.trim(),
  )

  if (!name) return "名称不能为空"
  if (!profile.bundle_id.includes(".")) return "Bundle ID 至少包含一个点"
  if (duplicateName) return `配置里已存在同名或同路径副本: ${path}`
  if (duplicateBundle) return `配置里已存在相同 Bundle ID: ${profile.bundle_id}`
  return ""
}
