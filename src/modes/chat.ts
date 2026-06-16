import "dotenv/config";
import * as readline from "readline";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { createQueryOptions } from "../agent/index.js";

interface ChatState {
  sessionId: string | null;
}

const HELP_TEXT = `Comandos disponibles:
  /exit     - Salir de la aplicación
  /new      - Iniciar una nueva sesión
  /report-1 - Generar y enviar el reporte semanal de inventario (últimos 7 días)
  /report-2 - Generar y enviar el reporte mensual de inventario (mes en curso)
  /report-3 - Generar y enviar el reporte anual de inventario (año en curso)
  /report-4 - Generar y enviar el reporte de mermas del año en curso
  /help     - Mostrar esta ayuda

También puedes pedir un reporte personalizado en lenguaje natural, por ejemplo:
  "genera un reporte de los 20 SKUs con mayor valor de inventario"
  "quiero un reporte de salidas por motivo del mes pasado"
`;

export async function runChatMode(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║  AgentInventarios3B - Modo Chat Interactivo  ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  console.log(HELP_TEXT);

  const state: ChatState = { sessionId: null };
  let closed = false;
  rl.on("close", () => {
    closed = true;
  });

  const sendMessage = async (prompt: string): Promise<void> => {
    const options = await createQueryOptions(
      "chat",
      state.sessionId ?? undefined
    );
    options.includePartialMessages = true;

    const stream = query({ prompt, options });

    process.stdout.write("\nAsistente: ");
    let hasOutput = false;

    for await (const message of stream) {
      if (message.type === "system" && message.subtype === "init") {
        if (!state.sessionId) {
          state.sessionId = message.session_id;
        }
      } else if (message.type === "stream_event") {
        const event = message.event;
        if (event.type === "content_block_delta") {
          const delta = event.delta;
          if (delta.type === "text_delta") {
            process.stdout.write(delta.text);
            hasOutput = true;
          }
        }
      } else if (message.type === "result") {
        if (message.subtype !== "success") {
          console.error(`\n❌ Error del agente: ${message.subtype}`);
        }
      }
    }

    if (hasOutput) {
      console.log("\n");
    } else {
      console.log("(sin respuesta)\n");
    }
  };

  const promptUser = (): void => {
    if (closed) {
      console.log("\n👋 ¡Hasta luego!\n");
      process.exit(0);
    }
    rl.question("Tú: ", async (input) => {
      const userInput = input.trim();

      if (!userInput) {
        promptUser();
        return;
      }

      if (userInput === "/exit") {
        console.log("\n👋 ¡Hasta luego!\n");
        rl.close();
        process.exit(0);
      }

      if (userInput === "/new") {
        state.sessionId = null;
        console.log("✓ Nueva sesión iniciada\n");
        promptUser();
        return;
      }

      if (userInput === "/help") {
        console.log(`\n${HELP_TEXT}`);
        promptUser();
        return;
      }

      const inventoryReportCommands: Record<string, { period: string; label: string }> = {
        "/report-1": { period: "week",  label: "semanal (últimos 7 días)" },
        "/report-2": { period: "month", label: "mensual (mes en curso)" },
        "/report-3": { period: "year",  label: "anual (año en curso)" },
      };

      if (userInput in inventoryReportCommands) {
        const { period, label } = inventoryReportCommands[userInput];
        const reportPrompt =
          `Genera y envía el reporte ${label} de inventario: ` +
          `1. Obtén los datos con get_inventory_data usando period="${period}". ` +
          "2. Redacta un análisis breve (2-3 observaciones y 1-2 recomendaciones basadas en los números). " +
          "3. Construye el HTML oficial con build_inventory_report pasando ese análisis. " +
          "4. Envíalo con send_report_email a los destinatarios configurados. " +
          "5. Al final dame un resumen ejecutivo de máximo 5 puntos clave.";

        try {
          await sendMessage(reportPrompt);
        } catch (error) {
          console.error(
            `❌ Error al generar reporte: ${error instanceof Error ? error.message : String(error)}\n`
          );
        }

        promptUser();
        return;
      }

      if (userInput === "/report-4") {
        const mermasPrompt =
          "Genera y envía el reporte de mermas del año en curso: " +
          "1. Obtén los datos con get_mermas_data. " +
          "2. Analiza los porcentajes: identifica tiendas con mayor % de mermas, meses problemáticos y tendencias. " +
          "3. Construye el HTML con build_mermas_report pasando ese análisis. " +
          "4. Envíalo con send_report_email a los destinatarios configurados. " +
          "5. Al final dame un resumen con los hallazgos más importantes.";

        try {
          await sendMessage(mermasPrompt);
        } catch (error) {
          console.error(
            `❌ Error al generar reporte de mermas: ${error instanceof Error ? error.message : String(error)}\n`
          );
        }

        promptUser();
        return;
      }

      try {
        await sendMessage(userInput);
      } catch (error) {
        console.error(
          `❌ Error: ${error instanceof Error ? error.message : String(error)}\n`
        );
      }

      promptUser();
    });
  };

  process.on("SIGINT", () => {
    console.log("\n\n👋 ¡Hasta luego!\n");
    rl.close();
    process.exit(0);
  });

  promptUser();
}
