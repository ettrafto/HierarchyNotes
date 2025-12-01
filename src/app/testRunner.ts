import { tInfo, tWarn, tOk, tError } from "./testBus";
import { useBoardStore } from "./store";

type Test = { name: string; run: () => Promise<void> | void };

function assert(cond: any, msg: string) {
  if (!cond) throw new Error(msg);
}

export async function runQuickTests() {
  const tests: Test[] = [
    {
      name: "Store normalization: side menu sees deletes",
      run: () => {
        const s = useBoardStore.getState();
        // Setup: add a temp note
        const id = "temp-test-" + Math.random().toString(36).slice(2, 7);
        const note = {
          id,
          title: "Temp",
          content: "",
          rect: { x: 0, y: 0, width: 200, height: 120 },
          z: 1,
          isOpen: false,
          isActive: true,
        };

        // Add note using the store's createNote method
        s.notesById[id] = note;
        s.noteIds.push(id);

        // Ensure exists
        assert(!!useBoardStore.getState().notesById[id], "Note not added.");
        assert(useBoardStore.getState().noteIds.includes(id), "noteIds not updated.");

        // Delete
        useBoardStore.getState().deleteNote(id);

        // Validate removal
        assert(!useBoardStore.getState().notesById[id], "Note still present.");
        assert(!useBoardStore.getState().noteIds.includes(id), "noteIds still includes id.");
      }
    },
    {
      name: "Selection cleanup on delete",
      run: () => {
        const id = "temp-sel-" + Math.random().toString(36).slice(2, 7);
        const s = useBoardStore.getState();
        const note = {
          id,
          title: "Sel",
          content: "",
          rect: { x: 0, y: 0, width: 120, height: 80 },
          z: 1,
          isOpen: false,
          isActive: true,
        };
        
        s.notesById[id] = note;
        s.noteIds.push(id);
        s.ui.selectedNoteIds = [id];

        s.deleteNote(id);

        const arr = useBoardStore.getState().ui.selectedNoteIds;
        assert(!arr.includes(id), "selectedNoteIds still contains deleted id");
      }
    },
    {
      name: "Modal state management",
      run: () => {
        const s = useBoardStore.getState();
        const testId = "modal-test-" + Math.random().toString(36).slice(2, 7);
        
        // Test edit modal
        s.openEditModal(testId);
        assert(s.uiModalEditNote?.id === testId, "Edit modal not opened");
        
        s.closeEditModal();
        assert(s.uiModalEditNote === null, "Edit modal not closed");
        
        // Test delete confirmation modal
        s.openDeleteConfirmation(testId, "Test Note", false);
        assert(s.uiDeleteConfirmation?.noteId === testId, "Delete confirmation not opened");
        assert(s.uiDeleteConfirmation?.noteTitle === "Test Note", "Delete confirmation title incorrect");
        assert(s.uiDeleteConfirmation?.noteIsOpen === false, "Delete confirmation isOpen incorrect");
        
        s.closeDeleteConfirmation();
        assert(s.uiDeleteConfirmation === null, "Delete confirmation not closed");
      }
    },
    {
      name: "Context menu integration",
      run: () => {
        const s = useBoardStore.getState();
        const testId = "context-test-" + Math.random().toString(36).slice(2, 7);
        
        // Add a test note
        const note = {
          id: testId,
          title: "Context Test",
          content: "Test content",
          rect: { x: 100, y: 100, width: 200, height: 150 },
          z: 1,
          isOpen: false,
          isActive: true,
        };
        
        s.notesById[testId] = note;
        s.noteIds.push(testId);
        
        // Test that context menu can open edit modal
        s.openEditModal(testId);
        assert(s.uiModalEditNote?.id === testId, "Context menu edit modal failed");
        
        // Test that context menu can open delete confirmation
        s.openDeleteConfirmation(testId, note.title, note.isOpen);
        assert(s.uiDeleteConfirmation?.noteId === testId, "Context menu delete confirmation failed");
        
        // Cleanup
        s.closeEditModal();
        s.closeDeleteConfirmation();
        s.deleteNote(testId);
      }
    }
  ];

  tInfo(`Running ${tests.length} tests...`);
  for (const t of tests) {
    try {
      await Promise.resolve(t.run());
      tOk(`✔ ${t.name}`);
    } catch (err: any) {
      tError(`✖ ${t.name}\n${err?.message ?? String(err)}`);
    }
  }
  tInfo("Done.");
}
