import "dotenv/config";
import { runChatMode } from "./modes/chat.js";

async function main(): Promise<void> {
  try {
    console.log("🚀 AgentInventarios3B - Modo: chat");
    console.log("═════════════════════════════════════════\n");
    await runChatMode();
  } catch (error) {
    console.error(
      "❌ Error fatal:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

main();
