import "dotenv/config";
import { sendReport } from "./tools/sendgrid.js";
import { getReportRecipients } from "./config.js";
import fs from "fs/promises";
import path from "path";

async function sendPreviewEmail() {
  try {
    // Leer el archivo de desarrollo que el usuario edita
    const filePath = path.join(process.cwd(), "reports", "report-preview.html");

    console.log("📄 Leyendo reporte de desarrollo...");
    console.log(`   Ruta: ${filePath}\n`);

    const htmlContent = await fs.readFile(filePath, "utf-8");

    const recipients = getReportRecipients();
    const subject = `📊 Reporte de Inventario - Tiendas 3B [DEV] (${new Date().toLocaleDateString("es-BO")})`;

    console.log("🚀 Enviando reporte de prueba...\n");

    const result = await sendReport(htmlContent, subject, recipients);

    console.log("\n✅ Email enviado correctamente:");
    console.log(`   ${result.message}`);
  } catch (error) {
    console.error(
      "\n❌ Error:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

sendPreviewEmail();
