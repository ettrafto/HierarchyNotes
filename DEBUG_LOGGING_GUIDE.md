# Debug Logging Guide - Inactive Status Issue

## Summary of Changes

### 1. Removed Red Tint
✅ Inactive notes no longer have red-tinted background
✅ They keep the default closed styling (gray dashed border)
✅ Only the `[INACTIVE]` label provides visual indication

### 2. Added Comprehensive Logging

I've added logging at **every step** of the close → inactive flow. Here's the complete trace you should see:

## Expected Console Output Flow

When you click the X button on a note, you should see this sequence:

### Step 1: User Clicks Close Button
```
[NoteShell] Close button clicked
[NoteShell] 🔴 handleClose called for: note-abc123
```

### Step 2: IPC Call to Rust
```
[NoteShell] Calling closeNoteWindow IPC...
[IPC] 🔴 closeNoteWindow called with: { id: 'note-abc123' }
[IPC] Invoking Rust close_note_window...
```

### Step 3: Rust Closes Window
```
[IPC] Rust close_note_window completed
[NoteShell] closeNoteWindow IPC completed
```

### Step 4: Rust Detects Window Destroyed
**In the terminal (Rust output):**
```
[Rust] 🔴 WindowEvent::Destroyed - label: note-abc123
[Rust] 🔴 Emitted note:closed event with id: note-abc123
```

### Step 5: Board Receives Event
**In the Board window console:**
```
[BoardPage] ⚠️ note:closed event received: { id: 'note-abc123' }
[BoardPage] Current note state BEFORE markNoteClosedFromOS: {
  id: 'note-abc123',
  note: { id: 'note-abc123', title: '...', isOpen: true, isActive: true, ... }
}
```

### Step 6: Store Updates State
```
[Store] markNoteClosedFromOS BEFORE: {
  id: 'note-abc123',
  title: 'My Note',
  isOpen: true,
  isActive: true
}
[Store] markNoteClosedFromOS AFTER: {
  id: 'note-abc123',
  title: 'My Note',
  isOpen: false,
  isActive: false
}
```

### Step 7: Board Confirms Update
```
[BoardPage] Current note state AFTER markNoteClosedFromOS: {
  id: 'note-abc123',
  note: { id: 'note-abc123', title: '...', isOpen: false, isActive: false, ... }
}
```

### Step 8: UI Components Re-render
```
[NotesList] Rendering items: [
  { id: 'note-abc123', title: 'My Note', isOpen: false, isActive: false },
  ...
]

[NoteGhosts] Rendering notes: [
  { id: 'note-abc123', title: 'My Note', isOpen: false, isActive: false },
  ...
]

[NoteGhosts] Rendering ghost for note-abc123 {
  title: 'My Note',
  isOpen: false,
  isActive: false,
  rawIsActive: false
}
```

## What to Check

### If isActive is NOT becoming false:

1. **Check Step 5** - Is the event being received?
   - If NO: The Rust event emission is broken
   - If YES: Continue to next step

2. **Check Step 6** - Is markNoteClosedFromOS being called?
   - If NO: The event listener isn't working
   - If YES: Continue to next step

3. **Check Step 6 AFTER** - Is isActive actually false?
   - If NO: The state mutation isn't working
   - If YES: Continue to next step

4. **Check Step 8** - Are components re-rendering with new data?
   - If NO: Zustand isn't triggering re-renders
   - If YES: But UI doesn't change → Check component logic

### If UI is NOT updating:

1. **Check NotesList console logs**
   - Does it show `isActive: false`?
   - If YES but UI doesn't change → Check the JSX rendering logic
   - If NO → State isn't propagating

2. **Check NoteGhosts console logs**
   - Does it show `isActive: false`?
   - Does it show `rawIsActive: false`?
   - If YES but no `[INACTIVE]` label → Check the render logic

## How to Test

### 1. Open DevTools for BOTH windows

**Board Window:**
```
Right-click Board → Inspect → Console
```

**Note Window:**
```
Right-click Note → Inspect → Console
```

### 2. Run the app
```bash
npm run tauri dev
```

### 3. Watch the Terminal
Look for Rust logs:
```
[Rust] 🔴 WindowEvent::Destroyed - label: note-abc123
[Rust] 🔴 Emitted note:closed event with id: note-abc123
```

### 4. Click X button and trace

Follow the sequence above and note where it breaks.

## Common Issues

### Issue: ID Mismatch
**Symptom:** 
```
[BoardPage] note:closed event received: { id: 'abc123' }
[Store] markNoteClosedFromOS - note not found: abc123
```

**Problem:** The ID being emitted doesn't match the store key.

**Fixed:** Changed Rust to emit the full label (`note-abc123`) instead of stripping the prefix.

### Issue: Event Not Received
**Symptom:** No `[BoardPage] note:closed event received` log

**Problem:** The event listener isn't set up or the Rust event isn't being emitted.

**Check:**
1. Is the Rust terminal showing the Destroyed event?
2. Is the BoardPage listener setup running?

### Issue: State Updates But UI Doesn't
**Symptom:**
```
[Store] isActive: false  ✅
[NoteGhosts] isActive: false  ✅
BUT: No visual change on screen  ❌
```

**Problem:** The component is receiving correct data but not rendering it.

**Check:**
1. Look at the Ghost component's JSX
2. Check if the `[INACTIVE]` text is in the DOM (Inspect Element)
3. Look for the `isActive` check in the render logic

## Files Modified

1. **src-tauri/src/lib.rs**
   - Changed to emit full label instead of stripped ID
   - Added Rust logging

2. **src/app/ipc.ts**
   - Added logging to `closeNoteWindow`

3. **src/components/Note/NoteShell.tsx**
   - Added logging to `handleClose`

4. **src/pages/BoardPage.tsx**
   - Added logging to `onNoteClosed` listener

5. **src/app/store.ts**
   - Added BEFORE/AFTER logging to `markNoteClosedFromOS`

6. **src/components/Board/NotesList.tsx**
   - Added logging to render cycle

7. **src/components/Board/NoteGhosts.tsx**
   - Added logging to render cycle
   - Removed red tint styling

## Next Steps

1. **Run the app** with DevTools open on both windows
2. **Click X** on a note
3. **Copy the entire console output** from both windows
4. **Share the logs** so we can identify exactly where the flow breaks

The logging is comprehensive enough that we should be able to pinpoint the exact issue!

