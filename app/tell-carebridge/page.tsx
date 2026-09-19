"use client";

import { useState } from "react";
import { AssistantPanel } from "@/components/assistant/AssistantPanel";
import { consumePendingMessage, type PendingMessage } from "@/lib/assistantHandoff";

/*
  AssistantPanel renders its own heading/intro — this page doesn't repeat
  it in a separate PageHeader, since AssistantPanel is now only ever used
  here (Home hands off a message rather than embedding the full panel).
*/
export default function TellCareBridgePage() {
  // Lazy useState initializer runs once, exactly when the handoff needs to
  // be read — before AssistantPanel's own mount effect consumes it.
  const [initialMessage] = useState<PendingMessage | null>(() => consumePendingMessage());

  return <AssistantPanel initialMessage={initialMessage} />;
}
