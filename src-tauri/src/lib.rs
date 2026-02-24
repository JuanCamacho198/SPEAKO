use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, Runtime,
};

#[cfg(not(any(target_os = "android", target_os = "ios")))]
use tauri_plugin_autostart::MacosLauncher;

#[derive(Clone, serde::Serialize)]
struct AlwaysOnTopState {
    enabled: bool,
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
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            #[cfg(not(any(target_os = "android", target_os = "ios")))]
            {
                use tauri_plugin_autostart::ManagerExt;
                let _ = app.plugin(tauri_plugin_autostart::init(
                    MacosLauncher::LaunchAgent,
                    None,
                ));
            }

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

            let _tray = TrayIconBuilder::new()
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
                            if let Some(tray) = app.tray_by_id("main") {
                                if let Some(menu) = tray.menu() {
                                    let label = if next {
                                        "Siempre visible: ON"
                                    } else {
                                        "Siempre visible: OFF"
                                    };
                                    if let Some(item) = menu.get("always_on_top") {
                                        use tauri::menu::MenuItemKind;
                                        if let MenuItemKind::MenuItem(mi) = item {
                                            let _ = mi.set_text(label);
                                        }
                                    }
                                }
                            }
                        }
                        "autostart" => {
                            #[cfg(not(any(target_os = "android", target_os = "ios")))]
                            {
                                use tauri_plugin_autostart::ManagerExt;
                                let autostart_manager = app.autolaunch();
                                let enabled = autostart_manager.is_enabled().unwrap_or(false);
                                if enabled {
                                    let _ = autostart_manager.disable();
                                } else {
                                    let _ = autostart_manager.enable();
                                }
                                let enabled_after = autostart_manager.is_enabled().unwrap_or(false);
                                if let Some(tray) = app.tray_by_id("main") {
                                    if let Some(menu) = tray.menu() {
                                        let label = if enabled_after {
                                            "Iniciar con Windows: ON"
                                        } else {
                                            "Iniciar con Windows: OFF"
                                        };
                                        if let Some(item) = menu.get("autostart") {
                                            use tauri::menu::MenuItemKind;
                                            if let MenuItemKind::MenuItem(mi) = item {
                                                let _ = mi.set_text(label);
                                            }
                                        }
                                    }
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
