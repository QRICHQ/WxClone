use serde::{Deserialize, Serialize};

use crate::utils::timestamp_millis;

pub(crate) const DEFAULT_SOURCE: &str = "/Applications/WeChat.app";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub(crate) struct CloneProfile {
    pub(crate) id: String,
    pub(crate) name: String,
    pub(crate) bundle_id: String,
    pub(crate) source_path: String,
    #[serde(default = "default_install_dir")]
    pub(crate) install_dir: String,
    pub(crate) enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub(crate) struct AppSettings {
    pub(crate) install_dir: String,
    pub(crate) base_name: String,
    pub(crate) base_bundle_id: String,
    pub(crate) source_path: String,
}

#[derive(Debug, Clone, Serialize)]
pub(crate) struct EnvironmentInfo {
    pub(crate) source_path: String,
    pub(crate) source_exists: bool,
    pub(crate) source_bundle_id: Option<String>,
    pub(crate) source_version: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub(crate) struct OperationResult {
    pub(crate) app_path: String,
    pub(crate) message: String,
}

#[derive(Debug, Clone, Serialize)]
pub(crate) struct ConflictInfo {
    pub(crate) app_path: String,
    pub(crate) target_exists: bool,
    pub(crate) bundle_id_at_target: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub(crate) struct ProfileAppInfo {
    pub(crate) app_path: String,
    pub(crate) installed: bool,
    pub(crate) bundle_id: Option<String>,
    pub(crate) version: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub(crate) struct RunningAppInfo {
    pub(crate) name: String,
    pub(crate) bundle_id: String,
    pub(crate) app_path: String,
    pub(crate) is_running: bool,
    pub(crate) process_count: usize,
}

#[derive(Debug, Clone, Serialize)]
pub(crate) struct IconInfo {
    pub(crate) data_url: String,
}

#[derive(Debug, Clone, Serialize)]
pub(crate) struct UpdateInfo {
    pub(crate) current_version: String,
    pub(crate) latest_version: String,
    pub(crate) latest_url: String,
    pub(crate) has_update: bool,
}

pub(crate) fn default_settings() -> AppSettings {
    AppSettings {
        install_dir: default_install_dir(),
        base_name: "微信".to_string(),
        base_bundle_id: "net.maclub.wechat".to_string(),
        source_path: DEFAULT_SOURCE.to_string(),
    }
}

pub(crate) fn default_install_dir() -> String {
    "/Applications".to_string()
}

pub(crate) fn normalize_settings(mut settings: AppSettings) -> Result<AppSettings, String> {
    settings.install_dir = default_install_dir();
    settings.base_name = settings
        .base_name
        .trim()
        .trim_end_matches(".app")
        .trim()
        .to_string();
    settings.base_bundle_id = settings
        .base_bundle_id
        .trim()
        .trim_end_matches('.')
        .to_string();
    settings.source_path = if settings.source_path.trim().is_empty() {
        DEFAULT_SOURCE.to_string()
    } else {
        settings.source_path.trim().to_string()
    };

    if settings.base_name.is_empty() {
        return Err("基础名称不能为空".to_string());
    }
    if settings.base_name.contains('/') || settings.base_name.contains(':') {
        return Err("基础名称不能包含 / 或 :".to_string());
    }
    if !valid_bundle_id(&settings.base_bundle_id) {
        return Err("基础 Bundle ID 只能包含字母、数字、点、短横线，且至少包含一个点".to_string());
    }
    if !settings.source_path.ends_with(".app") {
        return Err("源应用路径必须指向 .app 应用包".to_string());
    }
    Ok(settings)
}

pub(crate) fn normalize_profiles(profiles: Vec<CloneProfile>) -> Result<Vec<CloneProfile>, String> {
    let mut normalized = Vec::with_capacity(profiles.len());
    for profile in profiles {
        normalized.push(normalize_profile(profile)?);
    }
    Ok(normalized)
}

pub(crate) fn normalize_profile(mut profile: CloneProfile) -> Result<CloneProfile, String> {
    profile.name = profile
        .name
        .trim()
        .trim_end_matches(".app")
        .trim()
        .to_string();
    profile.bundle_id = profile.bundle_id.trim().to_string();
    profile.install_dir = default_install_dir();
    profile.source_path = if profile.source_path.trim().is_empty() {
        DEFAULT_SOURCE.to_string()
    } else {
        profile.source_path.trim().to_string()
    };
    profile.id = if profile.id.trim().is_empty() {
        format!("clone-{}", timestamp_millis())
    } else {
        profile.id.trim().to_string()
    };

    if profile.name.is_empty() {
        return Err("应用名称不能为空".to_string());
    }
    if profile.name.contains('/') || profile.name.contains(':') {
        return Err("应用名称不能包含 / 或 :".to_string());
    }
    if !valid_bundle_id(&profile.bundle_id) {
        return Err("Bundle ID 只能包含字母、数字、点、短横线，且至少包含一个点".to_string());
    }
    if !profile.source_path.ends_with(".app") {
        return Err("微信源路径必须指向 .app 应用包".to_string());
    }
    Ok(profile)
}

fn valid_bundle_id(value: &str) -> bool {
    value.contains('.')
        && value
            .chars()
            .all(|ch| ch.is_ascii_alphanumeric() || ch == '.' || ch == '-')
        && !value.starts_with('.')
        && !value.ends_with('.')
        && !value.contains("..")
}
