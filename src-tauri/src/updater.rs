use std::{process::Command, sync::mpsc, time::Duration};

use crate::{
    models::UpdateInfo,
    utils::{command_error, version_greater_than},
};

const UPDATE_CHECK_TIMEOUT_SECS: u64 = 15;

pub(crate) fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

pub(crate) fn check_for_update_with_timeout() -> Result<UpdateInfo, String> {
    let (tx, rx) = mpsc::channel();
    std::thread::spawn(move || {
        let _ = tx.send(check_for_update_blocking());
    });

    rx.recv_timeout(Duration::from_secs(UPDATE_CHECK_TIMEOUT_SECS))
        .unwrap_or_else(|_| Err("版本检查超时，请稍后重试或直接打开 GitHub Releases。".to_string()))
}

fn check_for_update_blocking() -> Result<UpdateInfo, String> {
    let output = Command::new("/usr/bin/curl")
        .arg("-sSL")
        .arg("--connect-timeout")
        .arg("5")
        .arg("--max-time")
        .arg("12")
        .arg("--retry")
        .arg("0")
        .arg("-H")
        .arg("Accept: application/vnd.github+json")
        .arg("-H")
        .arg("User-Agent: WxClone")
        .arg("-w")
        .arg("\n__WXCLONE_HTTP_STATUS__:%{http_code}")
        .arg("https://api.github.com/repos/RICHQAQ/WxClone/releases/latest")
        .output()
        .map_err(|err| err.to_string())?;

    if !output.status.success() {
        return Err(command_error(output.stderr));
    }

    let response = String::from_utf8_lossy(&output.stdout);
    let marker = "\n__WXCLONE_HTTP_STATUS__:";
    let Some((body, status)) = response.rsplit_once(marker) else {
        return Err("无法读取 GitHub 响应状态".to_string());
    };
    let current_version = env!("CARGO_PKG_VERSION").to_string();
    if status.trim() == "404" {
        return Ok(UpdateInfo {
            current_version: current_version.clone(),
            latest_version: current_version,
            latest_url: "https://github.com/RICHQAQ/WxClone/releases".to_string(),
            has_update: false,
        });
    }
    if !status.trim().starts_with('2') {
        return Err(format!("GitHub 请求失败，HTTP {}", status.trim()));
    }

    let data: serde_json::Value = serde_json::from_str(body).map_err(|err| err.to_string())?;
    let tag_name = data
        .get("tag_name")
        .and_then(|value| value.as_str())
        .ok_or_else(|| "无法读取最新版本号".to_string())?;
    let latest_url = data
        .get("html_url")
        .and_then(|value| value.as_str())
        .unwrap_or("https://github.com/RICHQAQ/WxClone/releases/latest");
    let latest_version = tag_name.trim_start_matches('v').to_string();

    Ok(UpdateInfo {
        has_update: version_greater_than(&latest_version, &current_version),
        current_version,
        latest_version,
        latest_url: latest_url.to_string(),
    })
}
