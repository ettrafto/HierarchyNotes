#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};
use tauri::Emitter;
use tauri::Position;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
struct NoteRect {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

// Removed unused payload structs; handlers accept parameters directly

/// Get the path to the layout.json file in the app data directory
fn get_layout_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    
    // Ensure directory exists
    fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    
    Ok(app_dir.join("layout.json"))
}

/// Spawn a new note window
#[tauri::command]
async fn spawn_note_window(app: AppHandle, id: String, rect: NoteRect) -> Result<(), String> {
    // Build label from id; if id already prefixed, use as-is
    let label = if id.starts_with("note-") { id.clone() } else { format!("note-{}", id) };
    
    // Check if window already exists
    if app.get_webview_window(&label).is_some() {
        return Ok(());
    }

    // Create the window (treat rect values as CSS pixels and let Tauri scale according to platform)
    // Log received rect for debugging drift
    println!("[spawn_note_window] id={} rect=({},{},{},{})", label, rect.x, rect.y, rect.width, rect.height);
    WebviewWindowBuilder::new(&app, label.clone(), WebviewUrl::App("note.html".into()))
        .title("Note")
        .inner_size(rect.width, rect.height)
        .position(rect.x, rect.y)
        .resizable(true)
        .decorations(true)
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Focus a note window
#[tauri::command]
async fn focus_note_window(app: AppHandle, id: String) -> Result<(), String> {
    // Accept either raw id ("123") or label id ("note-123")
    let label = if id.starts_with("note-") { id.clone() } else { format!("note-{}", id) };
    
    if let Some(window) = app.get_webview_window(&label) {
        window.set_focus().map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

/// Close a note window
#[tauri::command]
async fn close_note_window(app: AppHandle, id: String) -> Result<(), String> {
    // Accept either raw id or label id
    let label = if id.starts_with("note-") { id.clone() } else { format!("note-{}", id) };
    
    if let Some(window) = app.get_webview_window(&label) {
        window.close().map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

/// Set a note window's position (physical pixels)
#[tauri::command]
async fn set_note_position(app: AppHandle, id: String, x: f64, y: f64) -> Result<(), String> {
    // Accept either raw id or label id
    let label = if id.starts_with("note-") { id.clone() } else { format!("note-{}", id) };
    if let Some(window) = app.get_webview_window(&label) {
        println!("[set_note_position] id={} pos=({}, {})", label, x, y);
        window
            .set_position(Position::Logical((x, y).into()))
            .map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err(format!("Window {} not found", label))
    }
}

/// Set a note window's size (logical px)
#[tauri::command]
async fn set_note_size(app: AppHandle, id: String, width: f64, height: f64) -> Result<(), String> {
    let label = if id.starts_with("note-") { id.clone() } else { format!("note-{}", id) };
    if let Some(window) = app.get_webview_window(&label) {
        println!("[set_note_size] id={} size=({}, {})", label, width, height);
        window
            .set_size(tauri::Size::Logical((width, height).into()))
            .map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err(format!("Window {} not found", label))
    }
}

/// Set a note window's full rect (position + size) in logical px
#[tauri::command]
async fn set_note_rect(app: AppHandle, id: String, x: f64, y: f64, width: f64, height: f64) -> Result<(), String> {
    let label = if id.starts_with("note-") { id.clone() } else { format!("note-{}", id) };
    if let Some(window) = app.get_webview_window(&label) {
        println!("[set_note_rect] id={} rect=({}, {}, {}, {})", label, x, y, width, height);
        window
            .set_position(tauri::Position::Logical((x, y).into()))
            .map_err(|e| e.to_string())?;
        window
            .set_size(tauri::Size::Logical((width, height).into()))
            .map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err(format!("Window {} not found", label))
    }
}

/// Persist the board layout to disk
#[tauri::command]
async fn persist_layout(app: AppHandle, board_state: serde_json::Value) -> Result<(), String> {
    let layout_path = get_layout_path(&app)?;
    
    let json = serde_json::to_string_pretty(&board_state)
        .map_err(|e| e.to_string())?;
    
    fs::write(layout_path, json)
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

/// Load the board layout from disk
#[tauri::command]
async fn load_layout(app: AppHandle) -> Result<String, String> {
    let layout_path = get_layout_path(&app)?;
    
    if !layout_path.exists() {
        return Ok(String::new());
    }
    
    let json = fs::read_to_string(layout_path)
        .map_err(|e| e.to_string())?;
    
    Ok(json)
}

// ============================================================================
// Windows-only: External OS window control (no embed/preview)
// ============================================================================

#[cfg(target_os = "windows")]
mod external_windows {
    use std::ffi::OsString;
    use std::os::windows::ffi::OsStringExt;
    use core::ffi::c_void;
    use std::ptr::null_mut;
    use windows::Win32::Foundation::{BOOL, HWND, LPARAM, RECT, HANDLE};
    use windows::Win32::UI::WindowsAndMessaging::{EnumWindows, GetClassNameW, GetWindowRect, GetWindowTextLengthW, GetWindowTextW, GetWindowThreadProcessId, IsWindowVisible, SetWindowPos, SWP_NOACTIVATE, SWP_NOZORDER};
    use windows::Win32::System::Threading::{OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION};
    use windows::Win32::System::ProcessStatus::K32GetProcessImageFileNameW;
    use windows::Win32::Foundation::CloseHandle;

    struct EnumCtx {
        query_lower: String,
        results: Vec<HWND>,
    }

    unsafe extern "system" fn enum_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
        let ctx = &mut *(lparam.0 as *mut EnumCtx);
        // Only visible top-level windows
        if !IsWindowVisible(hwnd).as_bool() {
            return BOOL(1);
        }
        let len = unsafe { GetWindowTextLengthW(hwnd) } as i32;
        if len == 0 {
            return BOOL(1);
        }
        let mut buf: Vec<u16> = vec![0u16; (len + 1) as usize];
        let read = unsafe { GetWindowTextW(hwnd, &mut buf) } as usize;
        buf.truncate(read);
        let title = OsString::from_wide(&buf).to_string_lossy().to_string();
        if title.to_lowercase().contains(&ctx.query_lower) {
            ctx.results.push(hwnd);
        }
        BOOL(1)
    }

    pub fn find_by_title_substring(query: String) -> Result<Vec<u64>, String> {
        let mut ctx = EnumCtx { query_lower: query.to_lowercase(), results: Vec::new() };
        let ctx_ptr = &mut ctx as *mut EnumCtx as isize;
        let res = unsafe { EnumWindows(Some(enum_proc), LPARAM(ctx_ptr)) };
        if let Err(e) = res {
            return Err(format!("EnumWindows failed: {}", e));
        }
        Ok(ctx.results.iter().map(|h| h.0 as isize as i64 as u64).collect())
    }

    fn get_title(hwnd: HWND) -> String {
        let len = unsafe { GetWindowTextLengthW(hwnd) } as i32;
        if len <= 0 { return String::new(); }
        let mut buf: Vec<u16> = vec![0u16; (len + 1) as usize];
        let read = unsafe { GetWindowTextW(hwnd, &mut buf) } as usize;
        buf.truncate(read);
        OsString::from_wide(&buf).to_string_lossy().to_string()
    }

    fn get_class(hwnd: HWND) -> String {
        let mut buf: [u16; 256] = [0; 256];
        let read = unsafe { GetClassNameW(hwnd, &mut buf) } as usize;
        OsString::from_wide(&buf[..read]).to_string_lossy().to_string()
    }

    fn get_exe_for_pid(pid: u32) -> String {
        unsafe {
            let h: HANDLE = match OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) {
                Ok(handle) => handle,
                Err(_) => return String::new(),
            };
            let mut buf = [0u16; 512];
            let read = K32GetProcessImageFileNameW(h, &mut buf) as usize;
            let s = OsString::from_wide(&buf[..read]).to_string_lossy().to_string();
            let _ = CloseHandle(h);
            s
        }
    }

    pub fn get_rect(hwnd_u64: u64) -> Result<(f64, f64, f64, f64), String> {
        let hwnd = HWND(hwnd_u64 as usize as *mut c_void);
        let mut rect = RECT::default();
        let res = unsafe { GetWindowRect(hwnd, &mut rect) };
        if let Err(e) = res {
            return Err(format!("GetWindowRect failed: {}", e));
        }
        let x = rect.left as f64;
        let y = rect.top as f64;
        let w = (rect.right - rect.left) as f64;
        let h = (rect.bottom - rect.top) as f64;
        Ok((x, y, w, h))
    }

    pub fn set_rect(hwnd_u64: u64, x: f64, y: f64, w: f64, h: f64) -> Result<(), String> {
        let hwnd = HWND(hwnd_u64 as usize as *mut c_void);
        let res = unsafe {
            SetWindowPos(
                hwnd,
                HWND(null_mut()),
                x.round() as i32,
                y.round() as i32,
                w.round() as i32,
                h.round() as i32,
                SWP_NOZORDER | SWP_NOACTIVATE,
            )
        };
        if let Err(e) = res {
            return Err(format!("SetWindowPos failed: {}", e));
        }
        Ok(())
    }

    #[derive(serde::Serialize)]
    pub struct ExternalWinInfo {
        pub hwnd: u64,
        pub title: String,
        pub class_name: String,
        pub pid: u32,
        pub exe: String,
        pub x: f64,
        pub y: f64,
        pub width: f64,
        pub height: f64,
    }

    pub fn list_top_level_windows_info() -> Result<Vec<ExternalWinInfo>, String> {
        let mut out: Vec<ExternalWinInfo> = Vec::new();
        unsafe extern "system" fn collect_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
            if IsWindowVisible(hwnd).as_bool() {
                let title = get_title(hwnd);
                if !title.is_empty() {
                    let class_name = get_class(hwnd);
                    let mut rect = RECT::default();
                    if GetWindowRect(hwnd, &mut rect).is_ok() {
                        let mut pid = 0u32;
                        let _ = GetWindowThreadProcessId(hwnd, Some(&mut pid));
                        let exe = get_exe_for_pid(pid);
                        let info = ExternalWinInfo {
                            hwnd: hwnd.0 as usize as u64,
                            title,
                            class_name,
                            pid,
                            exe,
                            x: rect.left as f64,
                            y: rect.top as f64,
                            width: (rect.right - rect.left) as f64,
                            height: (rect.bottom - rect.top) as f64,
                        };
                        let v = unsafe { &mut *(lparam.0 as *mut Vec<ExternalWinInfo>) };
                        v.push(info);
                    }
                }
            }
            BOOL(1)
        }
        unsafe {
            let res = EnumWindows(Some(collect_proc), LPARAM((&mut out as *mut Vec<ExternalWinInfo>) as isize));
            if let Err(e) = res {
                return Err(format!("EnumWindows failed: {}", e));
            }
        }
        Ok(out)
    }
}

#[tauri::command]
async fn find_windows_by_title_substring(query: String) -> Result<Vec<u64>, String> {
    #[cfg(target_os = "windows")]
    {
        return external_windows::find_by_title_substring(query);
    }
    #[allow(unreachable_code)]
    Err("Windows-only command".into())
}

#[tauri::command]
async fn get_external_window_rect(hwnd: u64) -> Result<(f64, f64, f64, f64), String> {
    #[cfg(target_os = "windows")]
    {
        return external_windows::get_rect(hwnd);
    }
    #[allow(unreachable_code)]
    Err("Windows-only command".into())
}

#[tauri::command]
async fn set_external_window_rect(hwnd: u64, x: f64, y: f64, w: f64, h: f64) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        return external_windows::set_rect(hwnd, x, y, w, h);
    }
    #[allow(unreachable_code)]
    Err("Windows-only command".into())
}

#[tauri::command]
async fn list_top_level_windows() -> Result<Vec<external_windows::ExternalWinInfo>, String> {
    #[cfg(target_os = "windows")]
    {
        return external_windows::list_top_level_windows_info();
    }
    #[allow(unreachable_code)]
    Err("Windows-only command".into())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .on_window_event(|window, event| {
            use tauri::WindowEvent;
            if let WindowEvent::Destroyed = event {
                // Emit note:closed with id derived from label
                let label = window.label().to_string();
                let id = label.strip_prefix("note-").unwrap_or(&label).to_string();
                let _ = window.app_handle().emit("note:closed", serde_json::json!({ "id": id }));
            }
        })
        .invoke_handler(tauri::generate_handler![
            spawn_note_window,
            focus_note_window,
            close_note_window,
            set_note_position,
            set_note_size,
            set_note_rect,
            persist_layout,
            load_layout,
            find_windows_by_title_substring,
            get_external_window_rect,
            set_external_window_rect,
            list_top_level_windows,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
