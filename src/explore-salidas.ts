import "dotenv/config";
import { runReadOnlySql } from "./tools/hana.js";

async function explore() {
  console.log("\n📋 Valores distintos de Modulo y Motivo BAJA en BI_Salidas+Integrador:\n");

  const rows = await runReadOnlySql(`
    SELECT DISTINCT "Modulo", "Motivo BAJA"
    FROM TRESB."BI_Salidas+Integrador"
    ORDER BY "Modulo", "Motivo BAJA"
  `);

  const maxMod = Math.max(...rows.map(r => String(r["MODULO"] ?? "").length), "Modulo".length);
  const maxMot = Math.max(...rows.map(r => String(r["MOTIVO BAJA"] ?? "").length), "Motivo BAJA".length);

  console.log(`${"Modulo".padEnd(maxMod)}  ${"Motivo BAJA"}`);
  console.log(`${"-".repeat(maxMod)}  ${"-".repeat(maxMot)}`);
  rows.forEach(r => {
    console.log(`${String(r["MODULO"] ?? "").padEnd(maxMod)}  ${r["MOTIVO BAJA"] ?? ""}`);
  });
}

explore().catch(e => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
