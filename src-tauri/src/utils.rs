use std::{
    fs::{self, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
    process::Command,
    time::{SystemTime, UNIX_EPOCH},
};

const LOG_DIR_NAME: &str = "com.richqaq.wxclone";
const LOG_FILE_NAME: &str = "wxclone.log";

pub(crate) fn app_path_for(install_dir: &str, name: &str) -> String {
    format!("{install_dir}/{name}.app")
}

pub(crate) fn plist_value(info_plist: &Path, key: &str) -> Option<String> {
    if !info_plist.exists() {
        return None;
    }
    let output = Command::new("/usr/libexec/PlistBuddy")
        .arg("-c")
        .arg(format!("Print :{key}"))
        .arg(info_plist)
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let value = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if value.is_empty() {
        None
    } else {
        Some(value)
    }
}

pub(crate) fn run_admin_script(script: &str) -> Result<String, String> {
    let script_path = std::env::temp_dir().join(format!("wxclone-{}.sh", timestamp_millis()));
    fs::write(&script_path, script).map_err(|err| err.to_string())?;

    let log_path = std::env::temp_dir().join(format!("wxclone-{}.log", timestamp_millis()));
    let shell_command = format!(
        "LOG={log}; /bin/sh {script} > \"$LOG\" 2>&1; CODE=$?; echo __WXCLONE_EXIT__:$CODE; cat \"$LOG\"; rm -f \"$LOG\"",
        log = shell_quote(&log_path.to_string_lossy()),
        script = shell_quote(&script_path.to_string_lossy())
    );
    let apple_script = format!(
        "do shell script {} with administrator privileges",
        applescript_string(&shell_command)
    );

    let output = Command::new("osascript")
        .current_dir("/")
        .arg("-e")
        .arg(apple_script)
        .output()
        .map_err(|err| err.to_string());

    let _ = fs::remove_file(&script_path);

    let output = output?;
    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        eprintln!("{stdout}");
        append_persistent_log("admin-script stdout", &stdout);
        parse_admin_output(&stdout)
    } else {
        let err = command_error(output.stderr);
        append_persistent_log("admin-script osascript error", &err);
        if err.contains("-128") {
            Err("已取消管理员授权".to_string())
        } else {
            Err(err)
        }
    }
}

pub(crate) fn append_persistent_log(label: &str, content: &str) {
    let Ok(path) = persistent_log_path() else {
        return;
    };
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let Ok(mut file) = OpenOptions::new().create(true).append(true).open(&path) else {
        return;
    };
    let _ = writeln!(file, "\n=== {label} @ {} ===", timestamp_millis());
    let _ = writeln!(file, "{content}");
}

fn persistent_log_path() -> Result<PathBuf, String> {
    let home = std::env::var_os("HOME").ok_or_else(|| "无法读取 HOME 环境变量".to_string())?;
    Ok(PathBuf::from(home)
        .join("Library")
        .join("Logs")
        .join(LOG_DIR_NAME)
        .join(LOG_FILE_NAME))
}

fn parse_admin_output(output: &str) -> Result<String, String> {
    let marker = "__WXCLONE_EXIT__:";
    let normalized = output.replace("\r\n", "\n").replace('\r', "\n");
    let Some(marker_index) = normalized.find(marker) else {
        return Ok(normalized);
    };
    let rest = &normalized[marker_index + marker.len()..];
    let mut parts = rest.splitn(2, '\n');
    let code = parts.next().unwrap_or_default().trim();
    let log = parts.next().unwrap_or_default().trim().to_string();
    if code == "0" {
        Ok(log)
    } else if log.is_empty() {
        Err(format!("管理员脚本失败，退出码 {code}，但没有输出日志"))
    } else {
        Err(format!("管理员脚本失败，退出码 {code}\n{log}"))
    }
}

pub(crate) fn shell_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\\''"))
}

pub(crate) fn applescript_string(value: &str) -> String {
    format!("\"{}\"", value.replace('\\', "\\\\").replace('"', "\\\""))
}

pub(crate) fn command_error(stderr: Vec<u8>) -> String {
    let message = String::from_utf8_lossy(&stderr).trim().to_string();
    if message.is_empty() {
        "命令执行失败".to_string()
    } else {
        message
    }
}

pub(crate) fn stable_name(value: &str) -> String {
    value
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() {
                ch.to_ascii_lowercase()
            } else {
                '-'
            }
        })
        .collect::<String>()
        .trim_matches('-')
        .to_string()
}

pub(crate) fn version_greater_than(left: &str, right: &str) -> bool {
    let left_parts = version_parts(left);
    let right_parts = version_parts(right);
    for index in 0..left_parts.len().max(right_parts.len()) {
        let left_value = *left_parts.get(index).unwrap_or(&0);
        let right_value = *right_parts.get(index).unwrap_or(&0);
        if left_value != right_value {
            return left_value > right_value;
        }
    }
    false
}

fn version_parts(value: &str) -> Vec<u64> {
    value
        .split(['.', '-'])
        .map(|part| {
            part.chars()
                .take_while(|ch| ch.is_ascii_digit())
                .collect::<String>()
                .parse::<u64>()
                .unwrap_or(0)
        })
        .collect()
}

pub(crate) fn timestamp_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default()
}
