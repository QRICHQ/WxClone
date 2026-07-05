use crate::{
    models::{AppSettings, CloneProfile, EnvironmentInfo, IconInfo, OperationResult, UpdateInfo},
    platform, storage, updater,
};

#[tauri::command]
pub(crate) fn get_environment(source_path: Option<String>) -> EnvironmentInfo {
    platform::get_environment(source_path)
}

#[tauri::command]
pub(crate) fn get_app_version() -> String {
    updater::get_app_version()
}

#[tauri::command]
pub(crate) async fn check_for_update() -> Result<UpdateInfo, String> {
    tauri::async_runtime::spawn_blocking(updater::check_for_update_with_timeout)
        .await
        .map_err(|err| err.to_string())?
}

#[tauri::command]
pub(crate) fn open_url(url: String) -> Result<(), String> {
    platform::open_url(url)
}

#[tauri::command]
pub(crate) fn load_settings(app: tauri::AppHandle) -> Result<AppSettings, String> {
    storage::load_settings(&app)
}

#[tauri::command]
pub(crate) fn save_settings(
    app: tauri::AppHandle,
    settings: AppSettings,
) -> Result<AppSettings, String> {
    storage::save_settings(&app, settings)
}

#[tauri::command]
pub(crate) fn load_profiles(app: tauri::AppHandle) -> Result<Vec<CloneProfile>, String> {
    storage::load_profiles(&app)
}

#[tauri::command]
pub(crate) fn save_profiles(
    app: tauri::AppHandle,
    profiles: Vec<CloneProfile>,
) -> Result<Vec<CloneProfile>, String> {
    storage::save_profiles(&app, profiles)
}

#[tauri::command]
pub(crate) async fn sync_profile(profile: CloneProfile) -> Result<OperationResult, String> {
    tauri::async_runtime::spawn_blocking(move || platform::sync_profile_blocking(profile))
        .await
        .map_err(|err| err.to_string())?
}

#[tauri::command]
pub(crate) async fn sync_all(profiles: Vec<CloneProfile>) -> Result<Vec<OperationResult>, String> {
    tauri::async_runtime::spawn_blocking(move || platform::sync_all_blocking(profiles))
        .await
        .map_err(|err| err.to_string())?
}

#[tauri::command]
pub(crate) fn check_running_profile(
    profile: CloneProfile,
) -> Result<crate::models::RunningAppInfo, String> {
    platform::check_running_profile(profile)
}

#[tauri::command]
pub(crate) async fn quit_running_profile(
    profile: CloneProfile,
) -> Result<crate::models::RunningAppInfo, String> {
    tauri::async_runtime::spawn_blocking(move || platform::quit_running_profile_blocking(profile))
        .await
        .map_err(|err| err.to_string())?
}

#[tauri::command]
pub(crate) fn launch_profile(profile: CloneProfile) -> Result<(), String> {
    platform::launch_profile(profile)
}

#[tauri::command]
pub(crate) async fn remove_profile_app(profile: CloneProfile) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || platform::remove_profile_app_blocking(profile))
        .await
        .map_err(|err| err.to_string())?
}

#[tauri::command]
pub(crate) async fn choose_source_app() -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(platform::choose_source_app_blocking)
        .await
        .map_err(|err| err.to_string())?
}

#[tauri::command]
pub(crate) fn reveal_profile_app(profile: CloneProfile) -> Result<(), String> {
    platform::reveal_profile_app(profile)
}

#[tauri::command]
pub(crate) fn get_app_icon(
    app: tauri::AppHandle,
    app_path: String,
) -> Result<Option<IconInfo>, String> {
    platform::get_app_icon(&app, app_path)
}

#[tauri::command]
pub(crate) fn check_profile_conflict(
    profile: CloneProfile,
) -> Result<crate::models::ConflictInfo, String> {
    platform::check_profile_conflict(profile)
}

#[tauri::command]
pub(crate) fn check_profile_app_info(
    profile: CloneProfile,
) -> Result<crate::models::ProfileAppInfo, String> {
    platform::check_profile_app_info(profile)
}
