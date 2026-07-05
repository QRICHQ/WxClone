use base64::{engine::general_purpose, Engine as _};
use std::{fs, path::Path, process::Command, time::Duration};

use tauri::Manager;

use crate::{
    models::{
        normalize_profile, normalize_profiles, CloneProfile, ConflictInfo, EnvironmentInfo,
        IconInfo, OperationResult, ProfileAppInfo, RunningAppInfo, DEFAULT_SOURCE,
    },
    utils::{
        app_path_for, append_persistent_log, applescript_string, command_error, plist_value,
        run_admin_script, shell_quote, stable_name,
    },
};

pub(crate) fn get_environment(source_path: Option<String>) -> EnvironmentInfo {
    let source_path = source_path
        .map(|path| path.trim().to_string())
        .filter(|path| !path.is_empty())
        .unwrap_or_else(|| DEFAULT_SOURCE.to_string());
    let info_plist = Path::new(&source_path).join("Contents/Info.plist");
    let source_exists = Path::new(&source_path).is_dir();

    EnvironmentInfo {
        source_path,
        source_exists,
        source_bundle_id: plist_value(&info_plist, "CFBundleIdentifier"),
        source_version: plist_value(&info_plist, "CFBundleShortVersionString")
            .or_else(|| plist_value(&info_plist, "CFBundleVersion")),
    }
}

pub(crate) fn open_url(url: String) -> Result<(), String> {
    let url = url.trim();
    if !(url.starts_with("https://") || url.starts_with("http://")) {
        return Err("只允许打开 http/https 链接".to_string());
    }

    let output = Command::new("/usr/bin/open")
        .arg(url)
        .output()
        .map_err(|err| err.to_string())?;

    if output.status.success() {
        Ok(())
    } else {
        Err(command_error(output.stderr))
    }
}

pub(crate) fn sync_profile_blocking(profile: CloneProfile) -> Result<OperationResult, String> {
    let profile = normalize_profile(profile)?;
    let app_path = app_path_for(&profile.install_dir, &profile.name);
    let running = running_info_for_profile(&profile, &app_path);
    if running.is_running {
        return Err(format!(
            "{} 正在运行，请先退出该应用后再同步。",
            profile.name
        ));
    }

    let script = format!(
        r#"#!/bin/sh
set -u
SRC={source}
DEST={dest}
BUNDLE_ID={bundle_id}
APP_NAME={app_name}

log() {{
  printf '[WxClone] %s\n' "$1"
}}

fail() {{
  printf '[WxClone][ERROR] %s\n' "$1" >&2
  exit "$2"
}}

log "start create/sync"
log "source app: ${{SRC}}"
log "target app: ${{DEST}}"
log "Bundle ID: $BUNDLE_ID"

if [ ! -d "$SRC" ]; then
  fail "source app not found: ${{SRC}}" 10
fi

DEST_PARENT=$(dirname "$DEST")
log "check target dir: ${{DEST_PARENT}}"
mkdir -p "$DEST_PARENT" 2>/dev/null || {{
  fail "cannot create target dir: ${{DEST_PARENT}}" 11
}}

WRITE_TEST="$DEST_PARENT/.wxclone-write-test-$$"
touch "$WRITE_TEST" 2>/dev/null || {{
  fail "target dir is not writable: ${{DEST_PARENT}}. Use /Applications or check disk/folder permissions." 12
}}
rm -f "$WRITE_TEST"

if [ -d "$DEST" ]; then
  log "target exists, check Bundle ID"
  EXISTING_BUNDLE=$(/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "$DEST/Contents/Info.plist" 2>/dev/null || true)
  if [ "$EXISTING_BUNDLE" != "$BUNDLE_ID" ]; then
    fail "target path already contains another app: ${{DEST}} (${{EXISTING_BUNDLE}})" 20
  fi
  log "remove old clone"
  rm -rf "$DEST"
fi

log "copy app bundle"
cp -R "$SRC" "$DEST" || {{
  fail "copy failed: ${{SRC}} -> ${{DEST}}" 30
}}
log "set Bundle ID"
/usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier $BUNDLE_ID" "$DEST/Contents/Info.plist" || {{
  fail "failed to set Bundle ID: ${{DEST}}/Contents/Info.plist" 31
}}
log "set display name"
/usr/libexec/PlistBuddy -c "Set :CFBundleName $APP_NAME" "$DEST/Contents/Info.plist" || true
/usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName $APP_NAME" "$DEST/Contents/Info.plist" || true
log "set localized display names"
find "$DEST/Contents/Resources" -name InfoPlist.strings -type f -print 2>/dev/null | while IFS= read -r STRINGS_FILE
do
  log "update localized plist: $STRINGS_FILE"
  /usr/libexec/PlistBuddy -c "Set :CFBundleName $APP_NAME" "$STRINGS_FILE" 2>/dev/null || \
    /usr/libexec/PlistBuddy -c "Add :CFBundleName string $APP_NAME" "$STRINGS_FILE" || \
    fail "failed to set localized CFBundleName: $STRINGS_FILE" 33
  /usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName $APP_NAME" "$STRINGS_FILE" 2>/dev/null || \
    /usr/libexec/PlistBuddy -c "Add :CFBundleDisplayName string $APP_NAME" "$STRINGS_FILE" || \
    fail "failed to set localized CFBundleDisplayName: $STRINGS_FILE" 34
done
log "codesign"
/usr/bin/codesign --force --deep --sign - "$DEST" || {{
  fail "codesign failed: ${{DEST}}" 32
}}
log "clear quarantine attributes"
/usr/bin/xattr -cr "$DEST" || true
log "done: ${{DEST}}"
"#,
        source = shell_quote(&profile.source_path),
        dest = shell_quote(&app_path),
        bundle_id = shell_quote(&profile.bundle_id),
        app_name = shell_quote(&profile.name),
    );

    let output = run_admin_script(&script)?;
    Ok(OperationResult {
        app_path,
        message: output.trim().to_string(),
    })
}

pub(crate) fn sync_all_blocking(
    profiles: Vec<CloneProfile>,
) -> Result<Vec<OperationResult>, String> {
    let mut results = Vec::new();
    for profile in normalize_profiles(profiles)?
        .into_iter()
        .filter(|item| item.enabled)
    {
        results.push(sync_profile_blocking(profile)?);
    }
    Ok(results)
}

pub(crate) fn check_running_profile(profile: CloneProfile) -> Result<RunningAppInfo, String> {
    let profile = normalize_profile(profile)?;
    let app_path = app_path_for(&profile.install_dir, &profile.name);
    Ok(running_info_for_profile(&profile, &app_path))
}

pub(crate) fn check_profile_app_info(profile: CloneProfile) -> Result<ProfileAppInfo, String> {
    let profile = normalize_profile(profile)?;
    let app_path = app_path_for(&profile.install_dir, &profile.name);
    Ok(profile_app_info_at_path(&app_path))
}

pub(crate) fn profile_app_info_at_path(app_path: &str) -> ProfileAppInfo {
    let info_plist = Path::new(app_path).join("Contents/Info.plist");
    ProfileAppInfo {
        app_path: app_path.to_string(),
        installed: Path::new(app_path).is_dir(),
        bundle_id: plist_value(&info_plist, "CFBundleIdentifier"),
        version: plist_value(&info_plist, "CFBundleShortVersionString")
            .or_else(|| plist_value(&info_plist, "CFBundleVersion")),
    }
}

pub(crate) fn quit_running_profile_blocking(
    profile: CloneProfile,
) -> Result<RunningAppInfo, String> {
    let profile = normalize_profile(profile)?;
    let app_path = app_path_for(&profile.install_dir, &profile.name);
    let running = running_info_for_profile(&profile, &app_path);
    if !running.is_running {
        return Ok(running);
    }

    let script = format!(
        "tell application id {} to quit",
        applescript_string(&profile.bundle_id)
    );
    let quit_output = Command::new("/usr/bin/osascript")
        .arg("-e")
        .arg(script)
        .output();
    if let Ok(output) = quit_output {
        if !output.status.success() {
            append_persistent_log("quit osascript error", &command_error(output.stderr));
        }
    }

    let after_graceful = wait_for_profile_exit(&profile, &app_path, 8, 350);
    if !after_graceful.is_running {
        return Ok(after_graceful);
    }

    terminate_profile(&profile, &app_path, false);
    let after_term = wait_for_profile_exit(&profile, &app_path, 6, 350);
    if !after_term.is_running {
        return Ok(after_term);
    }

    terminate_profile(&profile, &app_path, true);
    let after_kill = wait_for_profile_exit(&profile, &app_path, 6, 350);
    if after_kill.is_running {
        return Err(format!(
            "{} 仍在运行，已停止同步。请手动退出后重试。",
            profile.name
        ));
    }
    Ok(after_kill)
}

fn wait_for_profile_exit(
    profile: &CloneProfile,
    app_path: &str,
    attempts: usize,
    interval_ms: u64,
) -> RunningAppInfo {
    let mut current = running_info_for_profile(profile, app_path);
    for _ in 0..attempts {
        if !current.is_running {
            return current;
        }
        std::thread::sleep(Duration::from_millis(interval_ms));
        current = running_info_for_profile(profile, app_path);
    }
    current
}

fn terminate_profile(profile: &CloneProfile, app_path: &str, hard: bool) {
    for asn in running_bundle_asns(&profile.bundle_id) {
        let mut command = Command::new("/usr/bin/lsappinfo");
        command.arg("kill");
        if hard {
            command.arg("-hard");
        }
        let _ = command.arg(&asn).output();
    }

    for pid in running_pids_for_app_path(app_path) {
        let signal = if hard { "-KILL" } else { "-TERM" };
        let _ = Command::new("/bin/kill")
            .arg(signal)
            .arg(pid.to_string())
            .output();
    }
}

fn running_info_for_profile(profile: &CloneProfile, app_path: &str) -> RunningAppInfo {
    let has_launch_services_entry = !running_bundle_asns(&profile.bundle_id).is_empty();
    let mut pids = running_pids_for_app_path(app_path);
    pids.sort_unstable();
    pids.dedup();
    let is_running = has_launch_services_entry || !pids.is_empty();

    RunningAppInfo {
        name: profile.name.clone(),
        bundle_id: profile.bundle_id.clone(),
        app_path: app_path.to_string(),
        is_running,
        process_count: if pids.is_empty() && has_launch_services_entry {
            1
        } else {
            pids.len()
        },
    }
}

fn running_bundle_asns(bundle_id: &str) -> Vec<String> {
    let output = Command::new("/usr/bin/lsappinfo")
        .arg("find")
        .arg(format!("bundleid={bundle_id}"))
        .output();
    let Ok(output) = output else {
        return Vec::new();
    };
    if !output.status.success() {
        return Vec::new();
    }

    String::from_utf8_lossy(&output.stdout)
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(ToString::to_string)
        .collect()
}

fn running_pids_for_app_path(app_path: &str) -> Vec<u32> {
    let executable_dir = Path::new(app_path).join("Contents/MacOS");
    let executable_prefix = format!(
        "{}/",
        executable_dir.to_string_lossy().trim_end_matches('/')
    );
    let output = Command::new("/bin/ps")
        .arg("-axo")
        .arg("pid=,command=")
        .output();
    let Ok(output) = output else {
        return Vec::new();
    };
    if !output.status.success() {
        return Vec::new();
    }

    String::from_utf8_lossy(&output.stdout)
        .lines()
        .filter_map(split_pid_command)
        .filter_map(|(pid, command)| {
            if command.starts_with(&executable_prefix) {
                Some(pid)
            } else {
                None
            }
        })
        .collect()
}

fn split_pid_command(line: &str) -> Option<(u32, String)> {
    let trimmed = line.trim_start();
    let split_index = trimmed.find(char::is_whitespace)?;
    let pid = trimmed[..split_index].trim().parse::<u32>().ok()?;
    let command = trimmed[split_index..].trim_start().to_string();
    if command.is_empty() {
        None
    } else {
        Some((pid, command))
    }
}

pub(crate) fn launch_profile(profile: CloneProfile) -> Result<(), String> {
    let profile = normalize_profile(profile)?;
    let app_path = app_path_for(&profile.install_dir, &profile.name);
    if !Path::new(&app_path).is_dir() {
        return Err(format!("未找到应用: {app_path}"));
    }

    let output = Command::new("open")
        .arg("-n")
        .arg(&app_path)
        .output()
        .map_err(|err| err.to_string())?;

    if output.status.success() {
        Ok(())
    } else {
        Err(command_error(output.stderr))
    }
}

pub(crate) fn remove_profile_app_blocking(profile: CloneProfile) -> Result<(), String> {
    let profile = normalize_profile(profile)?;
    let app_path = app_path_for(&profile.install_dir, &profile.name);
    let script = format!(
        r#"#!/bin/sh
set -eu
DEST={dest}
if [ -d "$DEST" ]; then
  rm -rf "$DEST"
fi
"#,
        dest = shell_quote(&app_path),
    );
    run_admin_script(&script)?;
    Ok(())
}

pub(crate) fn choose_source_app_blocking() -> Result<Option<String>, String> {
    let script = r#"try
  POSIX path of (choose file with prompt "选择微信源应用" of type {"app"})
on error number -128
  return ""
end try"#;
    let output = Command::new("osascript")
        .arg("-e")
        .arg(script)
        .output()
        .map_err(|err| err.to_string())?;

    if !output.status.success() {
        return Err(command_error(output.stderr));
    }
    let value = String::from_utf8_lossy(&output.stdout)
        .trim()
        .trim_end_matches('/')
        .to_string();
    if value.is_empty() {
        Ok(None)
    } else {
        Ok(Some(value))
    }
}

pub(crate) fn reveal_profile_app(profile: CloneProfile) -> Result<(), String> {
    let profile = normalize_profile(profile)?;
    let app_path = app_path_for(&profile.install_dir, &profile.name);
    if !Path::new(&app_path).exists() {
        return Err(format!("目标应用还不存在: {app_path}"));
    }

    let output = Command::new("open")
        .arg("-R")
        .arg(&app_path)
        .output()
        .map_err(|err| err.to_string())?;

    if output.status.success() {
        Ok(())
    } else {
        Err(command_error(output.stderr))
    }
}

pub(crate) fn get_app_icon(
    app: &tauri::AppHandle,
    app_path: String,
) -> Result<Option<IconInfo>, String> {
    let app_path = app_path.trim().trim_end_matches('/').to_string();
    if !app_path.ends_with(".app") || !Path::new(&app_path).is_dir() {
        return Ok(None);
    }

    let info_plist = Path::new(&app_path).join("Contents/Info.plist");
    let Some(icon_file) = plist_value(&info_plist, "CFBundleIconFile") else {
        return Ok(None);
    };

    let icon_name = if icon_file.ends_with(".icns") {
        icon_file
    } else {
        format!("{icon_file}.icns")
    };
    let icon_path = Path::new(&app_path)
        .join("Contents/Resources")
        .join(icon_name);
    if !icon_path.exists() {
        return Ok(None);
    }

    let cache_dir = app.path().app_cache_dir().map_err(|err| err.to_string())?;
    fs::create_dir_all(&cache_dir).map_err(|err| err.to_string())?;
    let file_name = format!("app-icon-{}.png", stable_name(&app_path));
    let png_path = cache_dir.join(file_name);

    let output = Command::new("/usr/bin/sips")
        .arg("-s")
        .arg("format")
        .arg("png")
        .arg(&icon_path)
        .arg("--out")
        .arg(&png_path)
        .output()
        .map_err(|err| err.to_string())?;

    if !output.status.success() {
        return Ok(None);
    }

    let bytes = fs::read(&png_path).map_err(|err| err.to_string())?;
    Ok(Some(IconInfo {
        data_url: format!(
            "data:image/png;base64,{}",
            general_purpose::STANDARD.encode(bytes)
        ),
    }))
}

pub(crate) fn check_profile_conflict(profile: CloneProfile) -> Result<ConflictInfo, String> {
    let profile = normalize_profile(profile)?;
    let app_path = app_path_for(&profile.install_dir, &profile.name);
    let info_plist = Path::new(&app_path).join("Contents/Info.plist");
    let target_exists = Path::new(&app_path).exists();
    Ok(ConflictInfo {
        app_path,
        target_exists,
        bundle_id_at_target: plist_value(&info_plist, "CFBundleIdentifier"),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn profile_app_info_reads_installed_clone_version() {
        let root =
            std::env::temp_dir().join(format!("wxclone-test-{}", crate::utils::timestamp_millis()));
        let app_path = root.join("微信1.app");
        let contents = app_path.join("Contents");
        fs::create_dir_all(&contents).unwrap();
        fs::write(
            contents.join("Info.plist"),
            r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleIdentifier</key>
  <string>net.maclub.wechat.clone1</string>
  <key>CFBundleShortVersionString</key>
  <string>4.0.6</string>
</dict>
</plist>
"#,
        )
        .unwrap();

        let info = profile_app_info_at_path(app_path.to_str().unwrap());

        assert_eq!(info.app_path, app_path.to_string_lossy());
        assert!(info.installed);
        assert_eq!(info.bundle_id.as_deref(), Some("net.maclub.wechat.clone1"));
        assert_eq!(info.version.as_deref(), Some("4.0.6"));

        let _ = fs::remove_dir_all(root);
    }
}
