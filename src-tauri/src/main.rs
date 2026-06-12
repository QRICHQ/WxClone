mod commands;
mod models;
mod platform;
mod storage;
mod updater;
mod utils;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::get_environment,
            commands::load_settings,
            commands::save_settings,
            commands::load_profiles,
            commands::save_profiles,
            commands::sync_profile,
            commands::sync_all,
            commands::check_running_profile,
            commands::quit_running_profile,
            commands::launch_profile,
            commands::remove_profile_app,
            commands::choose_source_app,
            commands::reveal_profile_app,
            commands::get_app_icon,
            commands::check_profile_conflict,
            commands::get_app_version,
            commands::check_for_update,
            commands::open_url
        ])
        .run(tauri::generate_context!())
        .expect("error while running wxclone");
}
