import { config } from "../config.js";
import { SYSTEM_PROMPT } from "./prompts.js";
import { inventoryServer, INVENTORY_TOOLS } from "./tools.js";
import type { Options } from "@anthropic-ai/claude-agent-sdk";

export async function createQueryOptions(
  mode: "chat" | "scheduled",
  resumeSessionId?: string
): Promise<Options> {
  const options: Options = {
    systemPrompt: SYSTEM_PROMPT,
    mcpServers: {
      inventario: inventoryServer,
    },
    allowedTools: INVENTORY_TOOLS,
    permissionMode: "acceptEdits",
    maxTurns: mode === "scheduled" ? 20 : 12,
    model: config.LLM_MODEL,
  };

  if (resumeSessionId) {
    options.resume = resumeSessionId;
  }

  return options;
}
