use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};

#[cfg(not(any(target_os = "android", target_os = "ios")))]
use tauri_plugin_autostart::MacosLauncher;

/// Shared app state so menu-event handlers can update menu item labels.
struct AppState {
    always_on_top_item: Mutex<MenuItem<tauri::Wry>>,
    autostart_item: Mutex<MenuItem<tauri::Wry>>,
}

#[derive(serde::Serialize)]
struct ShortcutDefaults {
    record: String,
    open_settings: String,
    open_history: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TranscriptRecord {
    id: String,
    text: String,
    timestamp: i64,
}

fn transcript_store_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|err| format!("failed to resolve app data dir: {err}"))?;

    fs::create_dir_all(&app_dir)
        .map_err(|err| format!("failed to create app data dir {}: {err}", app_dir.display()))?;

    Ok(app_dir.join("transcript-history.json"))
}

fn read_transcript_store(path: &Path) -> Result<Vec<TranscriptRecord>, String> {
    if !path.exists() {
        return Ok(Vec::new());
    }

    let payload = fs::read_to_string(path)
        .map_err(|err| format!("failed to read transcript store {}: {err}", path.display()))?;

    serde_json::from_str::<Vec<TranscriptRecord>>(&payload)
        .map_err(|err| format!("failed to parse transcript store {}: {err}", path.display()))
}

fn write_transcript_store(path: &Path, records: &[TranscriptRecord]) -> Result<(), String> {
    let payload = serde_json::to_string_pretty(records)
        .map_err(|err| format!("failed to serialize transcripts: {err}"))?;

    fs::write(path, payload)
        .map_err(|err| format!("failed to write transcript store {}: {err}", path.display()))
}

#[tauri::command]
fn load_transcripts(app: tauri::AppHandle) -> Result<Vec<TranscriptRecord>, String> {
    let path = transcript_store_path(&app)?;
    read_transcript_store(&path)
}

#[tauri::command]
fn save_transcript(
    app: tauri::AppHandle,
    record: TranscriptRecord,
) -> Result<Vec<TranscriptRecord>, String> {
    if record.text.trim().is_empty() {
        return load_transcripts(app);
    }

    let path = transcript_store_path(&app)?;
    let mut current = read_transcript_store(&path)?;
    current.insert(0, record);
    if current.len() > 200 {
        current.truncate(200);
    }

    write_transcript_store(&path, &current)?;
    Ok(current)
}

#[tauri::command]
fn delete_transcript(app: tauri::AppHandle, id: String) -> Result<Vec<TranscriptRecord>, String> {
    let path = transcript_store_path(&app)?;
    let mut current = read_transcript_store(&path)?;
    current.retain(|item| item.id != id);
    write_transcript_store(&path, &current)?;
    Ok(current)
}

#[tauri::command]
fn get_shortcut_defaults() -> ShortcutDefaults {
    ShortcutDefaults {
        record: "CommandOrControl+Shift+Space".to_string(),
        open_settings: "CommandOrControl+Shift+,".to_string(),
        open_history: "CommandOrControl+Shift+H".to_string(),
    }
}

#[tauri::command]
fn toggle_always_on_top(window: tauri::Window, enable: bool) -> Result<(), String> {
    window.set_always_on_top(enable).map_err(|e| e.to_string())
}

#[tauri::command]
fn show_window(window: tauri::Window) -> Result<(), String> {
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())
}

#[tauri::command]
fn hide_window(window: tauri::Window) -> Result<(), String> {
    window.hide().map_err(|e| e.to_string())
}

#[tauri::command]
fn exit_app(app: tauri::AppHandle) {
    app.exit(0);
}

pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }));

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    let builder = builder.plugin(tauri_plugin_autostart::init(
        MacosLauncher::LaunchAgent,
        None,
    ));

    builder
        .setup(|app| {
            let show_hide =
                MenuItem::with_id(app, "show_hide", "Mostrar / Ocultar", true, None::<&str>)?;
            let always_on_top = MenuItem::with_id(
                app,
                "always_on_top",
                "Siempre visible: ON",
                true,
                None::<&str>,
            )?;
            let autostart = MenuItem::with_id(
                app,
                "autostart",
                "Iniciar con Windows: OFF",
                true,
                None::<&str>,
            )?;
            let quit = MenuItem::with_id(app, "quit", "Salir", true, None::<&str>)?;

            let menu = Menu::with_items(app, &[&show_hide, &always_on_top, &autostart, &quit])?;

            // Store menu items in state so event handlers can update their labels.
            app.manage(AppState {
                always_on_top_item: Mutex::new(always_on_top),
                autostart_item: Mutex::new(autostart),
            });

            // Prevent duplicate tray icon issues by only building if not already configured via config
            let _tray = TrayIconBuilder::with_id("main")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .tooltip("Speako")
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .on_menu_event(|app, event| {
                    let window = app.get_webview_window("main").unwrap();
                    let state = app.state::<AppState>();

                    match event.id.as_ref() {
                        "show_hide" => {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                            let _ = app.emit("shortcut-action", "toggle-window");
                        }
                        "always_on_top" => {
                            let current = window.is_always_on_top().unwrap_or(true);
                            let next = !current;
                            let _ = window.set_always_on_top(next);
                            let label = if next {
                                "Siempre visible: ON"
                            } else {
                                "Siempre visible: OFF"
                            };
                            if let Ok(item) = state.always_on_top_item.lock() {
                                let _ = item.set_text(label);
                            }
                        }
                        "autostart" => {
                            #[cfg(not(any(target_os = "android", target_os = "ios")))]
                            {
                                use tauri_plugin_autostart::ManagerExt;
                                let mgr = app.autolaunch();
                                let enabled = mgr.is_enabled().unwrap_or(false);
                                if enabled {
                                    let _ = mgr.disable();
                                } else {
                                    let _ = mgr.enable();
                                }
                                let after = mgr.is_enabled().unwrap_or(false);
                                let label = if after {
                                    "Iniciar con Windows: ON"
                                } else {
                                    "Iniciar con Windows: OFF"
                                };
                                if let Ok(item) = state.autostart_item.lock() {
                                    let _ = item.set_text(label);
                                }
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            toggle_always_on_top,
            show_window,
            hide_window,
            exit_app,
            get_shortcut_defaults,
            load_transcripts,
            save_transcript,
            delete_transcript
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
