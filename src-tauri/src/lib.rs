#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};
use tauri::Emitter;
use tauri::Position;
use std::fs;
use std::path::PathBuf;

// Debug flags - set to true to enable console logging for specific modules
const DEBUG_WINDOW_SPAWN: bool = false;
const DEBUG_WINDOW_POSITION: bool = false;
const DEBUG_WINDOW_LIFECYCLE: bool = false;
const DEBUG_OVERLAY: bool = false;
const DEBUG_IPC: bool = false;

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
    // Using decorations(false) for custom chrome with rounded corners
    if DEBUG_WINDOW_SPAWN {
        println!("[spawn_note_window] id={} rect=({},{},{},{})", label, rect.x, rect.y, rect.width, rect.height);
    }
    WebviewWindowBuilder::new(&app, label.clone(), WebviewUrl::App("note.html".into()))
        .title("Note")
        .inner_size(rect.width, rect.height)
        .position(rect.x, rect.y)
        .resizable(true)
        .decorations(false)
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

/// Spawn the transparent overlay window for desktop connections
#[tauri::command]
async fn spawn_overlay_window(app: AppHandle) -> Result<(), String> {
    let label = "overlay";
    
    // Check if already exists
    if app.get_webview_window(label).is_some() {
        if DEBUG_OVERLAY {
            println!("[spawn_overlay_window] Overlay already exists");
        }
        return Ok(());
    }

    if DEBUG_OVERLAY {
        println!("[spawn_overlay_window] Creating overlay window");
    }
    
    let window = WebviewWindowBuilder::new(&app, label, WebviewUrl::App("overlay.html".into()))
        .title("Overlay")
        .fullscreen(false)
        .maximized(true)
        .resizable(false)
        .decorations(false)
        .transparent(true)
        .always_on_top(false)
        .skip_taskbar(true)
        .visible(true)
        .build()
        .map_err(|e| {
            if DEBUG_OVERLAY {
                println!("[spawn_overlay_window] ERROR: {}", e);
            }
            e.to_string()
        })?;
    
    if DEBUG_OVERLAY {
        println!("[spawn_overlay_window] Window built successfully");
    }

    // Make the window ignore mouse events (click-through)
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::Foundation::HWND;
        use windows::Win32::UI::WindowsAndMessaging::{GetWindowLongPtrW, SetWindowLongPtrW, GWL_EXSTYLE, WS_EX_LAYERED, WS_EX_TRANSPARENT};
        
        let hwnd = window.hwnd().map_err(|e| e.to_string())?;
        let hwnd = HWND(hwnd.0 as *mut core::ffi::c_void);
        
        unsafe {
            let ex_style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
            SetWindowLongPtrW(hwnd, GWL_EXSTYLE, ex_style | WS_EX_LAYERED.0 as isize | WS_EX_TRANSPARENT.0 as isize);
        }
        
        if DEBUG_OVERLAY {
            println!("[spawn_overlay_window] Set WS_EX_TRANSPARENT flag");
        }
    }
    
    if DEBUG_OVERLAY {
        println!("[spawn_overlay_window] Overlay created successfully");
    }
    Ok(())
}

/// Set a note window's position (physical pixels)
#[tauri::command]
async fn set_note_position(app: AppHandle, id: String, x: f64, y: f64) -> Result<(), String> {
    // Accept either raw id or label id
    let label = if id.starts_with("note-") { id.clone() } else { format!("note-{}", id) };
    if let Some(window) = app.get_webview_window(&label) {
        if DEBUG_WINDOW_POSITION {
            println!("[set_note_position] id={} pos=({}, {})", label, x, y);
        }
        window
            .set_position(Position::Logical((x, y).into()))
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

/// Broadcast state sync to all windows (especially overlay)
#[tauri::command]
async fn broadcast_overlay_state(app: AppHandle, payload: serde_json::Value) -> Result<(), String> {
    app.emit("overlay:state_sync", payload)
        .map_err(|e| {
            if DEBUG_IPC {
                println!("[broadcast_overlay_state] ERROR: {}", e);
            }
            e.to_string()
        })?;
    Ok(())
}

/// Atomically resize and move a note window (fallback for Board-side resize)
#[tauri::command]
async fn resize_move_note_window(app: AppHandle, id: String, rect: NoteRect) -> Result<(), String> {
    let label = format!("note-{}", id);
    let window = app.get_webview_window(&label).ok_or("Window not found")?;
    
    // Try to move then resize; order may reduce artifacts depending on OS/WM
    window.set_position(Position::Logical(tauri::LogicalPosition { 
        x: rect.x, 
        y: rect.y 
    })).map_err(|e| e.to_string())?;
    
    window.set_size(tauri::LogicalSize { 
        width: rect.width, 
        height: rect.height 
    }).map_err(|e| e.to_string())?;
    
    Ok(())
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
                // IMPORTANT: Keep the full label (e.g., "note-abc123") as the ID
                // because the store uses the label as the key, not the raw ID
                if DEBUG_WINDOW_LIFECYCLE {
                    println!("[Rust] 🔴 WindowEvent::Destroyed - label: {}", label);
                }
                let _ = window.app_handle().emit("note:closed", serde_json::json!({ "id": label }));
                if DEBUG_WINDOW_LIFECYCLE {
                    println!("[Rust] 🔴 Emitted note:closed event with id: {}", label);
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            spawn_note_window,
            spawn_overlay_window,
            focus_note_window,
            close_note_window,
            set_note_position,
            resize_move_note_window,
            persist_layout,
            load_layout,
            broadcast_overlay_state,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
