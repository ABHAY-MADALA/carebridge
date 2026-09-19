/*
  How Home hands a typed message or mood check to /tell-carebridge without
  duplicating AssistantPanel's chat state on two routes. sessionStorage
  (not a query param) because the message can be arbitrarily long patient
  text that shouldn't sit in the URL or browser history.
*/

const KEY = "carebridge.pending-message.v1";

export type PendingMessage = { text: string; autoSend: boolean; startVoice?: boolean };

export function sendToAssistant(text: string, autoSend: boolean, startVoice = false) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ text, autoSend, startVoice } satisfies PendingMessage));
  } catch {
    /* sessionStorage unavailable (private browsing) — the compose page still works, just without the handoff */
  }
}

export function consumePendingMessage(): PendingMessage | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    return JSON.parse(raw) as PendingMessage;
  } catch {
    return null;
  }
}
