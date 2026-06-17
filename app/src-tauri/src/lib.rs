use tauri::{AppHandle, Manager, path::BaseDirectory};
use std::fs;
use uuid::Uuid;

mod vcam;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn copy_image_to_local(app: AppHandle, source_path: String) -> Result<String, String> {
    // Get app data dir
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    
    // Ensure dir exists
    if !app_data_dir.exists() {
        fs::create_dir_all(&app_data_dir).map_err(|e| e.to_string())?;
    }
    
    // Extract extension
    let ext = std::path::Path::new(&source_path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("png");
        
    // Generate UUID file name
    let new_file_name = format!("{}.{}", Uuid::new_v4(), ext);
    let dest_path = app_data_dir.join(new_file_name);
    
    // Copy file
    fs::copy(&source_path, &dest_path).map_err(|e| format!("Failed to copy file: {}", e))?;
    
    // Return destination path as string
    dest_path.into_os_string().into_string().map_err(|_| "Invalid path string".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            #[cfg(target_os = "windows")]
            {
                if let Ok(resource_path) = app.path().resolve("resources/softcam.dll", BaseDirectory::Resource) {
                    vcam::set_dll_path(resource_path);
                    std::thread::spawn(|| {
                        vcam::vcam_rendering_loop();
                    });
                } else {
                    eprintln!("Warning: Failed to resolve resources/softcam.dll path.");
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet, 
            copy_image_to_local, 
            vcam::register_standalone_vcam,
            vcam::send_frame_to_vcam,
            vcam::update_vcam_scene,
            vcam::update_quality_settings
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
