import "dotenv/config";
import { runReadOnlySql } from "./tools/hana.js";

async function explore() {
  console.log("\n🔍 Buscando vistas con 'enta' en el nombre...\n");

  const views = await runReadOnlySql(`
    SELECT SCHEMA_NAME, VIEW_NAME
    FROM SYS.VIEWS
    WHERE UPPER(VIEW_NAME) LIKE '%ENTA%'
    ORDER BY SCHEMA_NAME, VIEW_NAME
  `);
  console.log("Vistas encontradas:", JSON.stringify(views, null, 2));

  console.log("\n🔍 Filas INVFISICO en BI_Salidas+Integrador (muestra):\n");
  const modulos = await runReadOnlySql(`
    SELECT DISTINCT "Modulo", "Almacen"
    FROM TRESB."BI_Salidas+Integrador"
    WHERE "Modulo" = 'INVFISICO'
  `);
  console.log("Filas INVFISICO:", JSON.stringify(modulos, null, 2));
}

explore().catch(e => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
