use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

#[cfg(not(any(target_os = "android", target_os = "ios")))]
use tauri_plugin_autostart::MacosLauncher;

/// Shared app state so menu-event handlers can update menu item labels.
struct AppState {
    always_on_top_item: Mutex<MenuItem<tauri::Wry>>,
    autostart_item: Mutex<MenuItem<tauri::Wry>>,
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

pub fn run() {
    let builder = tauri::Builder::default().plugin(tauri_plugin_opener::init());

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
            hide_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
