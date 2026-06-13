import "dotenv/config";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { getInventoryData, PERIOD_LABELS, type ReportPeriod } from "./tools/hana.js";
import { buildInventoryReport } from "./templates/report-template.js";

const PERIOD_MAP: Record<string, ReportPeriod> = { "1": "week", "2": "month", "3": "year" };

const arg = process.argv[2] ?? "1";
const period: ReportPeriod = PERIOD_MAP[arg] ?? "week";
const label = PERIOD_LABELS[period];

async function generateReport() {
  try {
    console.log(`📊 ${label.titulo}`);
    console.log(`   Período: ${label.rango}\n`);
    console.log("🔌 Conectando a SAP HANA y ejecutando consultas...\n");

    const data = await getInventoryData(period);

    console.log("\n🔨 Construyendo reporte HTML...");
    const html = buildInventoryReport(data, "", label);

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");

    const reportDir = path.join(process.cwd(), "reports");
    mkdirSync(reportDir, { recursive: true });

    const suffix = { week: "semanal", month: "mensual", year: "anual" }[period];
    const datedPath = path.join(reportDir, `reporte-inventario-${suffix}-${yyyy}-${mm}-${dd}.html`);
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

generateReport();
