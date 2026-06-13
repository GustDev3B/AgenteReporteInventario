import "dotenv/config";
import { sendReport } from "./tools/sendgrid.js";
import { getReportRecipients } from "./config.js";
import fs from "fs/promises";
import path from "path";

async function sendReportEmail() {
  try {
    const filePath = path.join(process.cwd(), "reports", "report-latest.html");

    console.log("📄 Leyendo último reporte generado...");
    console.log(`   Ruta: ${filePath}\n`);

    const htmlContent = await fs.readFile(filePath, "utf-8");

    const recipients = getReportRecipients();
    const fecha = new Date().toLocaleDateString("es-BO", {
      timeZone: "America/La_Paz",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const subject = `Reporte Inventario Semanal — Tiendas 3B (${fecha})`;

    console.log("🚀 Enviando reporte por email...\n");

    const result = await sendReport(htmlContent, subject, recipients);

    console.log("\n✅ Email enviado correctamente:");
    console.log(`   ${result.message}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("ENOENT")) {
      console.error("\n❌ No hay reporte generado. Ejecuta primero: npm run report");
    } else {
      console.error("\n❌ Error:", msg);
    }
    process.exit(1);
  }
}

sendReportEmail();
