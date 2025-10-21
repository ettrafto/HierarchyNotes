#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};
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

    // Create the window
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
    let label = format!("note-{}", id);
    
    if let Some(window) = app.get_webview_window(&label) {
        window.set_focus().map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

/// Close a note window
#[tauri::command]
async fn close_note_window(app: AppHandle, id: String) -> Result<(), String> {
    let label = format!("note-{}", id);
    
    if let Some(window) = app.get_webview_window(&label) {
        window.close().map_err(|e| e.to_string())?;
    }
    
    Ok(())
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            spawn_note_window,
            focus_note_window,
            close_note_window,
            persist_layout,
            load_layout,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
