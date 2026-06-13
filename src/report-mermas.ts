import "dotenv/config";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { getMermasData } from "./tools/hana.js";
import { buildMermasReport } from "./templates/mermas-template.js";

async function generateMermasReport() {
  try {
    console.log("📊 Reporte de Mermas — (INVFISICO + Integrador) / Ventas\n");
    console.log("🔌 Conectando a SAP HANA y ejecutando consultas...\n");

    const data = await getMermasData();

    console.log("\n🔨 Construyendo reporte HTML...");
    const html = buildMermasReport(data);

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");

    const reportDir = path.join(process.cwd(), "reports");
    mkdirSync(reportDir, { recursive: true });

    const datedPath = path.join(reportDir, `reporte-mermas-${yyyy}-${mm}-${dd}.html`);
    const latestPath = path.join(reportDir, "report-latest.html");

    writeFileSync(datedPath, html, "utf-8");
    writeFileSync(latestPath, html, "utf-8");

    console.log(`\n✅ Reporte generado:`);
    console.log(`   ${datedPath}`);
    console.log(`   ${latestPath} (listo para npm run report-email)`);
  } catch (error) {
    console.error(
      "\n❌ Error:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

generateMermasReport();
