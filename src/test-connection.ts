import "dotenv/config";
import { config } from "./config.js";
import { testConnection, getInventoryData } from "./tools/hana.js";

async function main(): Promise<void> {
  console.log("🔌 Probando conexión a InventoryAPI → SAP HANA...");
  console.log(`   URL: ${config.INVENTORY_API_URL}\n`);

  try {
    await testConnection();
    console.log("✅ InventoryAPI OK\n");
  } catch (error) {
    console.error(
      `❌ Falló la conexión: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }

  console.log("📊 Ejecutando las 5 queries del reporte...\n");
  try {
    const data = await getInventoryData();
    console.log("\nQ1 Resumen:", JSON.stringify(data.q1Resumen));
    console.log(`Q2 Estados: ${data.q2Estados?.length ?? 0} filas`);
    console.log(`Q3 Salidas: ${data.q3Salidas?.length ?? 0} filas`);
    console.log(`Q4 Grupos: ${data.q4Grupos?.length ?? 0} filas`);
    console.log(`Q5 Top SKUs: ${data.q5TopSkus?.length ?? 0} filas`);
    console.log("\n✅ Prueba completada");
  } catch (error) {
    console.error(
      `❌ Error ejecutando queries: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

main();
