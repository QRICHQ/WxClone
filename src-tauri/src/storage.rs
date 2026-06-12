use std::{fs, path::PathBuf};

use tauri::Manager;

use crate::models::{
    default_settings, normalize_profiles, normalize_settings, AppSettings, CloneProfile,
};

const CONFIG_FILE: &str = "profiles.json";
const SETTINGS_FILE: &str = "settings.json";

pub(crate) fn load_settings(app: &tauri::AppHandle) -> Result<AppSettings, String> {
    let path = settings_path(app)?;
    if !path.exists() {
        let defaults = default_settings();
        save_settings_to_path(&path, &defaults)?;
        return Ok(defaults);
    }

    let data = fs::read_to_string(path).map_err(|err| err.to_string())?;
    let settings: AppSettings = serde_json::from_str(&data).map_err(|err| err.to_string())?;
    normalize_settings(settings)
}

pub(crate) fn save_settings(
    app: &tauri::AppHandle,
    settings: AppSettings,
) -> Result<AppSettings, String> {
    let settings = normalize_settings(settings)?;
    let path = settings_path(app)?;
    save_settings_to_path(&path, &settings)?;
    Ok(settings)
}

pub(crate) fn load_profiles(app: &tauri::AppHandle) -> Result<Vec<CloneProfile>, String> {
    let path = config_path(app)?;
    if !path.exists() {
        save_profiles_to_path(&path, &[])?;
        return Ok(Vec::new());
    }

    let data = fs::read_to_string(path).map_err(|err| err.to_string())?;
    serde_json::from_str(&data).map_err(|err| err.to_string())
}

pub(crate) fn save_profiles(
    app: &tauri::AppHandle,
    profiles: Vec<CloneProfile>,
) -> Result<Vec<CloneProfile>, String> {
    let normalized = normalize_profiles(profiles)?;
    let path = config_path(app)?;
    save_profiles_to_path(&path, &normalized)?;
    Ok(normalized)
}

fn config_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|err| err.to_string())?;
    fs::create_dir_all(&dir).map_err(|err| err.to_string())?;
    Ok(dir.join(CONFIG_FILE))
}

fn settings_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|err| err.to_string())?;
    fs::create_dir_all(&dir).map_err(|err| err.to_string())?;
    Ok(dir.join(SETTINGS_FILE))
}

fn save_profiles_to_path(path: &PathBuf, profiles: &[CloneProfile]) -> Result<(), String> {
    let data = serde_json::to_string_pretty(profiles).map_err(|err| err.to_string())?;
    fs::write(path, data).map_err(|err| err.to_string())
}

fn save_settings_to_path(path: &PathBuf, settings: &AppSettings) -> Result<(), String> {
    let data = serde_json::to_string_pretty(settings).map_err(|err| err.to_string())?;
    fs::write(path, data).map_err(|err| err.to_string())
}
