export type AppView = "home" | "settings"

export type CloneProfile = {
  id: string
  name: string
  bundle_id: string
  source_path: string
  install_dir: string
  enabled: boolean
}

export type AppSettings = {
  install_dir: string
  base_name: string
  base_bundle_id: string
  source_path: string
}

export type EnvironmentInfo = {
  source_path: string
  source_exists: boolean
  source_bundle_id?: string | null
  source_version?: string | null
}

export type OperationResult = {
  app_path: string
  message: string
}

export type ConflictInfo = {
  app_path: string
  target_exists: boolean
  bundle_id_at_target?: string | null
}

export type ProfileAppInfo = {
  app_path: string
  installed: boolean
  bundle_id?: string | null
  version?: string | null
}

export type RunningAppInfo = {
  name: string
  bundle_id: string
  app_path: string
  is_running: boolean
  process_count: number
}

export type IconInfo = {
  data_url: string
}

export type UpdateInfo = {
  current_version: string
  latest_version: string
  latest_url: string
  has_update: boolean
}

export type ToastState = {
  id: number
  title: string
  description?: string
  variant?: "default" | "destructive"
  actionUrl?: string
  actionLabel?: string
}

export type SyncConfirmState = {
  runningApps: RunningAppInfo[]
  resolve: (confirmed: boolean) => void
}
