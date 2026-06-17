use std::sync::{Arc, Mutex};
use once_cell::sync::Lazy;
use std::path::PathBuf;
use libloading::Library;
use tauri::Manager;
use tauri::path::BaseDirectory;

struct SoftcamApi {
    _lib: Library,
    create_camera: unsafe extern "C" fn(i32, i32, f32) -> *mut std::ffi::c_void,
    send_frame: unsafe extern "C" fn(*mut std::ffi::c_void, *const u8),
    delete_camera: unsafe extern "C" fn(*mut std::ffi::c_void),
}

impl SoftcamApi {
    unsafe fn load(dll_path: &PathBuf) -> Result<Self, libloading::Error> {
        let lib = Library::new(dll_path)?;
        let create_camera = *lib.get(b"scCreateCamera\0")?;
        let send_frame = *lib.get(b"scSendFrame\0")?;
        let delete_camera = *lib.get(b"scDeleteCamera\0")?;
        Ok(Self {
            _lib: lib,
            create_camera,
            send_frame,
            delete_camera,
        })
    }
}

static DLL_PATH: Lazy<Mutex<Option<PathBuf>>> = Lazy::new(|| Mutex::new(None));

pub fn set_dll_path(path: PathBuf) {
    if let Ok(mut lock) = DLL_PATH.lock() {
        *lock = Some(path);
    }
}

#[derive(Clone, Default)]
pub struct VcamState {
    pub active_image_path: Option<String>,
    pub cached_images: std::collections::HashMap<String, image::RgbaImage>,
    pub cached_keys: std::collections::VecDeque<String>,
    pub transform: Option<ObsTransform>,
    pub cached_resized_images: std::collections::HashMap<String, image::RgbaImage>,
    pub cached_resized_keys: std::collections::VecDeque<String>,
}

#[derive(serde::Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct ObsTransform {
    #[serde(default)]
    pub position_x: f64,
    #[serde(default)]
    pub position_y: f64,
    #[serde(default)]
    pub scale_x: f64,
    #[serde(default)]
    pub scale_y: f64,
    #[serde(default)]
    pub rotation: f64,
    #[serde(default)]
    pub bounds_width: f64,
    #[serde(default)]
    pub bounds_height: f64,
    #[serde(default)]
    pub bounds_type: String,
    #[serde(default)]
    pub bounds_alignment: u32,
}

pub static VCAM_STATE: Lazy<Arc<Mutex<VcamState>>> = Lazy::new(|| {
    Arc::new(Mutex::new(VcamState::default()))
});

#[derive(Clone)]
pub struct QualitySettings {
    pub resolution: String,
    pub filter_type: String,
    pub fps: u32,
}

impl Default for QualitySettings {
    fn default() -> Self {
        Self {
            resolution: "1080p".to_string(),
            filter_type: "Lanczos3".to_string(),
            fps: 30,
        }
    }
}

pub static QUALITY_SETTINGS: Lazy<Arc<Mutex<QualitySettings>>> = Lazy::new(|| {
    Arc::new(Mutex::new(QualitySettings::default()))
});

#[tauri::command]
pub fn update_quality_settings(resolution: String, filter_type: String, fps: u32) {
    if let Ok(mut settings) = QUALITY_SETTINGS.lock() {
        settings.resolution = resolution;
        settings.filter_type = filter_type;
        settings.fps = fps;
    }
}

#[tauri::command]
pub fn update_vcam_scene(image_path: Option<String>, transform: Option<ObsTransform>) {
    if let Ok(mut state) = VCAM_STATE.lock() {
        state.active_image_path = image_path;
        state.transform = transform;
    }
}

pub fn render_current_scene(target_canvas_w: u32, target_canvas_h: u32, filter: image::imageops::FilterType) -> Option<Vec<u8>> {
    let path_to_load = {
        let state = VCAM_STATE.lock().unwrap();
        state.active_image_path.clone()
    };
    
    let mut cached_img = None;
    if let Some(ref path) = path_to_load {
        let need_load = {
            let state = VCAM_STATE.lock().unwrap();
            !state.cached_images.contains_key(path)
        };
        
        if need_load {
            if let Ok(img) = image::open(path) {
                let rgba = img.to_rgba8();
                cached_img = Some(rgba.clone());
                if let Ok(mut state) = VCAM_STATE.lock() {
                    state.cached_images.insert(path.clone(), rgba);
                    state.cached_keys.push_back(path.clone());
                    if state.cached_keys.len() > 10 {
                        if let Some(oldest) = state.cached_keys.pop_front() {
                            state.cached_images.remove(&oldest);
                        }
                    }
                }
            }
        } else {
            if let Ok(state) = VCAM_STATE.lock() {
                cached_img = state.cached_images.get(path).cloned();
            }
        }
    }
    
    let transform = {
        let state = VCAM_STATE.lock().unwrap();
        state.transform.clone()
    };
    
    // Create a target_canvas_w x target_canvas_h black canvas
    let mut canvas = image::RgbaImage::new(target_canvas_w, target_canvas_h);
    
    // Draw active image if present
    if let Some(ref img) = cached_img {
        if let Some(transform) = transform {
            let sw = img.width() as f64;
            let sh = img.height() as f64;
            
            let scale_factor_w = target_canvas_w as f64 / 1920.0;
            let scale_factor_h = target_canvas_h as f64 / 1080.0;
            
            let mut w = transform.bounds_width * scale_factor_w;
            let mut h = transform.bounds_height * scale_factor_h;
            let mut offset_x = 0.0;
            let mut offset_y = 0.0;
            
            if transform.bounds_type == "OBS_BOUNDS_NONE" {
                w = sw * transform.scale_x;
                h = sh * transform.scale_y;
            } else if transform.bounds_type == "OBS_BOUNDS_SCALE_INNER" || transform.bounds_type == "OBS_BOUNDS_STRETCH" || transform.bounds_type.is_empty() {
                let scale = (w / sw).min(h / sh);
                let rw = sw * scale;
                let rh = sh * scale;
                let diff_x = w - rw;
                let diff_y = h - rh;
                let align = transform.bounds_alignment;
                let ox = if (align & 1) != 0 {
                    0.0
                } else if (align & 2) != 0 {
                    diff_x
                } else {
                    diff_x / 2.0
                };
                let oy = if (align & 4) != 0 {
                    0.0
                } else if (align & 8) != 0 {
                    diff_y
                } else {
                    diff_y / 2.0
                };
                w = rw;
                h = rh;
                offset_x = ox;
                offset_y = oy;
            } else if transform.bounds_type == "OBS_BOUNDS_SCALE_OUTER" {
                let scale = (w / sw).max(h / sh);
                let rw = sw * scale;
                let rh = sh * scale;
                let diff_x = w - rw;
                let diff_y = h - rh;
                let align = transform.bounds_alignment;
                let ox = if (align & 1) != 0 {
                    0.0
                } else if (align & 2) != 0 {
                    diff_x
                } else {
                    diff_x / 2.0
                };
                let oy = if (align & 4) != 0 {
                    0.0
                } else if (align & 8) != 0 {
                    diff_y
                } else {
                    diff_y / 2.0
                };
                w = rw;
                h = rh;
                offset_x = ox;
                offset_y = oy;
            } else if transform.bounds_type == "OBS_BOUNDS_SCALE_MAX_ONLY" {
                let mut scale = 1.0;
                if sw > w || sh > h {
                    scale = (w / sw).min(h / sh);
                }
                let rw = sw * scale;
                let rh = sh * scale;
                let diff_x = w - rw;
                let diff_y = h - rh;
                let align = transform.bounds_alignment;
                let ox = if (align & 1) != 0 {
                    0.0
                } else if (align & 2) != 0 {
                    diff_x
                } else {
                    diff_x / 2.0
                };
                let oy = if (align & 4) != 0 {
                    0.0
                } else if (align & 8) != 0 {
                    diff_y
                } else {
                    diff_y / 2.0
                };
                w = rw;
                h = rh;
                offset_x = ox;
                offset_y = oy;
            }
            
            if w > 0.0 && h > 0.0 && w < 4096.0 && h < 4096.0 {
                let target_w = w as u32;
                let target_h = h as u32;
                
                if target_w == img.width() && target_h == img.height() {
                    let pos_x = ((transform.position_x * scale_factor_w) + offset_x) as i64;
                    let pos_y = ((transform.position_y * scale_factor_h) + offset_y) as i64;
                    image::imageops::overlay(&mut canvas, img, pos_x, pos_y);
                } else {
                    let resize_key = format!("{}|{}|{}", path_to_load.as_ref().unwrap(), target_w, target_h);
                    let mut needs_resize = true;
                    let mut resized_img = None;
                    
                    if let Ok(state) = VCAM_STATE.lock() {
                        if let Some(r) = state.cached_resized_images.get(&resize_key) {
                            resized_img = Some(r.clone());
                            needs_resize = false;
                        }
                    }
                    
                    if needs_resize {
                        let resized = image::imageops::resize(img, target_w, target_h, filter);
                        resized_img = Some(resized.clone());
                        if let Ok(mut state) = VCAM_STATE.lock() {
                            state.cached_resized_images.insert(resize_key.clone(), resized);
                            state.cached_resized_keys.push_back(resize_key);
                            if state.cached_resized_keys.len() > 10 {
                                if let Some(oldest) = state.cached_resized_keys.pop_front() {
                                    state.cached_resized_images.remove(&oldest);
                                }
                            }
                        }
                    }
                    
                    if let Some(ref resized) = resized_img {
                        let pos_x = ((transform.position_x * scale_factor_w) + offset_x) as i64;
                        let pos_y = ((transform.position_y * scale_factor_h) + offset_y) as i64;
                        image::imageops::overlay(&mut canvas, resized, pos_x, pos_y);
                    }
                }
            }
        }
    }
    
    Some(canvas.into_raw())
}

#[cfg(target_os = "windows")]
pub fn vcam_rendering_loop() {
    use std::thread;
    use std::time::Duration;

    let dll_path = loop {
        {
            let lock = DLL_PATH.lock().unwrap();
            if let Some(p) = &*lock {
                break p.clone();
            }
        }
        thread::sleep(Duration::from_millis(100));
    };

    println!("Loading softcam.dll from: {:?}", dll_path);
    let api = match unsafe { SoftcamApi::load(&dll_path) } {
        Ok(a) => a,
        Err(e) => {
            eprintln!("Failed to load softcam.dll: {}", e);
            return;
        }
    };

    let mut current_w = 1920;
    let mut current_h = 1080;
    let mut current_fps = 30.0;
    let mut current_filter_name = "Lanczos3".to_string();

    println!("Creating virtual camera instance ({}x{} @ {}fps)...", current_w, current_h, current_fps);
    let mut camera = unsafe { (api.create_camera)(current_w as i32, current_h as i32, current_fps) };
    if camera.is_null() {
        eprintln!("Failed to create virtual camera instance using scCreateCamera");
        return;
    }

    loop {
        let start_time = std::time::Instant::now();

        let (target_w, target_h, target_fps, filter_name, filter) = {
            let qs = QUALITY_SETTINGS.lock().unwrap().clone();
            let (tw, th) = match qs.resolution.as_str() {
                "720p" => (1280, 720),
                "1440p" => (2560, 1440),
                _ => (1920, 1080),
            };
            let f = match qs.filter_type.as_str() {
                "Nearest" => image::imageops::FilterType::Nearest,
                "Triangle" => image::imageops::FilterType::Triangle,
                _ => image::imageops::FilterType::Lanczos3,
            };
            (tw, th, qs.fps as f32, qs.filter_type, f)
        };

        let resolution_changed = target_w != current_w || target_h != current_h || target_fps != current_fps;
        let filter_changed = filter_name != current_filter_name;

        if resolution_changed {
            println!("Camera settings changed, recreating camera ({}x{} @ {}fps)...", target_w, target_h, target_fps);
            unsafe {
                (api.delete_camera)(camera);
            }
            
            // Give the OS/driver a moment to release the old virtual camera resources
            std::thread::sleep(Duration::from_millis(500));
            
            unsafe {
                camera = (api.create_camera)(target_w as i32, target_h as i32, target_fps);
            }
            
            if camera.is_null() {
                eprintln!("Failed to recreate camera! Retrying in 1 second...");
                std::thread::sleep(Duration::from_millis(1000));
                unsafe {
                    camera = (api.create_camera)(target_w as i32, target_h as i32, target_fps);
                }
                if camera.is_null() {
                    eprintln!("Still failed to recreate camera, exiting loop.");
                    return;
                }
            }
            current_w = target_w;
            current_h = target_h;
            current_fps = target_fps;
        }
            
        if resolution_changed || filter_changed {
            current_filter_name = filter_name;
            // Clear resize cache to force re-render at new resolution or new filter
            if let Ok(mut state) = VCAM_STATE.lock() {
                state.cached_resized_images.clear();
                state.cached_resized_keys.clear();
            }
        }

        if let Some(rgba_bytes) = render_current_scene(current_w, current_h, filter) {
            let mut bgr_bytes = Vec::with_capacity((current_w * current_h * 3) as usize);
            for chunk in rgba_bytes.chunks_exact(4) {
                bgr_bytes.push(chunk[2]); // B
                bgr_bytes.push(chunk[1]); // G
                bgr_bytes.push(chunk[0]); // R
            }

            unsafe {
                (api.send_frame)(camera, bgr_bytes.as_ptr());
            }
        }

        let elapsed = start_time.elapsed();
        let frame_target = Duration::from_secs_f32(1.0 / current_fps);
        if elapsed < frame_target {
            thread::sleep(frame_target - elapsed);
        }
    }
}

#[cfg(not(target_os = "windows"))]
pub fn vcam_rendering_loop() {}

#[tauri::command]
pub async fn register_standalone_vcam(app: tauri::AppHandle) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        use std::os::windows::process::CommandExt;

        let resource_path = app
            .path()
            .resolve("resources/softcam.dll", BaseDirectory::Resource)
            .map_err(|e| format!("Failed to resolve softcam.dll path: {}", e))?;

        if !resource_path.exists() {
            return Err("Không tìm thấy tệp resources/softcam.dll trong thư mục tài nguyên.".to_string());
        }

        let output = Command::new("regsvr32")
            .args(&["/s", resource_path.to_str().unwrap_or("")])
            .creation_flags(0x08000000) // CREATE_NO_WINDOW
            .output()
            .map_err(|e| format!("Lỗi khi thực thi regsvr32: {}", e))?;

        if output.status.success() {
            Ok("Đăng ký camera ảo (softcam.dll) thành công!".to_string())
        } else {
            let err_msg = String::from_utf8_lossy(&output.stderr);
            Err(format!("Không thể đăng ký camera ảo. Chi tiết: {}", err_msg))
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("Đăng ký camera ảo độc lập chỉ hỗ trợ trên Windows.".to_string())
    }
}

#[tauri::command]
pub async fn send_frame_to_vcam(_rgba_bytes: Vec<u8>, _width: i32, _height: i32) -> Result<(), String> {
    Ok(())
}

