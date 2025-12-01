import { emit, listen } from "@tauri-apps/api/event";

export type TestEvent = {
  level: "info" | "warn" | "error" | "success";
  msg: string;
  ts?: number;
};

// Send a message to the test window
export async function testLog(payload: TestEvent) {
  await emit("test:append", { ...payload, ts: payload.ts ?? Date.now() });
}

// Listener (used inside TestPage)
export function onTestLog(cb: (e: TestEvent) => void) {
  return listen<TestEvent>("test:append", (event) => {
    cb(event.payload);
  });
}

// Convenience wrappers
export const tInfo = (msg: string) => testLog({ level: "info", msg });
export const tWarn = (msg: string) => testLog({ level: "warn", msg });
export const tError = (msg: string) => testLog({ level: "error", msg });
export const tOk = (msg: string) => testLog({ level: "success", msg });
