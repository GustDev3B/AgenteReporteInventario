import "dotenv/config";
import { config } from "./config.js";
import { testConnection, getInventoryData } from "./tools/hana.js";

async function main(): Promise<void> {
  console.log("🔌 Probando conexión a SAP HANA...");
  console.log(`   Host: ${config.HANA_HOST}:${config.HANA_PORT}`);
  console.log(`   Usuario: ${config.HANA_USER}\n`);

  try {
    await testConnection();
    console.log("✅ Conexión SAP HANA OK\n");
  } catch (error) {
    console.error(
      `❌ Falló la conexión: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }

  console.log("📊 Ejecutando las 5 queries del reporte...\n");
  try {
    const data = await getInventoryData();
    console.log("\nResumen general (Q1):", JSON.stringify(data.q1));
    console.log(`Estados de stock (Q2): ${data.q2?.length ?? 0} filas`);
    console.log(`Salidas por motivo (Q3): ${data.q3?.length ?? 0} filas`);
    console.log(`Top grupos (Q4): ${data.q4?.length ?? 0} filas`);
    console.log(`Top SKUs (Q5): ${data.q5?.length ?? 0} filas`);
    console.log("\n✅ Prueba completada");
  } catch (error) {
    console.error(
      `❌ Error ejecutando queries: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

main();
