import hdb from "hdb";
import { config } from "../config.js";

export type ReportPeriod = "week" | "month" | "year";

export const PERIOD_LABELS: Record<ReportPeriod, { titulo: string; objetivo: string; rango: string }> = {
  week: {
    titulo: "Reporte Semanal de Inventario",
    objetivo: "Monitorear el comportamiento del inventario y las salidas de la semana actual.",
    rango: "últimos 7 días",
  },
  month: {
    titulo: "Reporte Mensual de Inventario",
    objetivo: "Analizar el inventario y las salidas acumuladas del mes en curso.",
    rango: "mes en curso",
  },
  year: {
    titulo: "Reporte Anual de Inventario",
    objetivo: "Evaluar el desempeño del inventario y las salidas acumuladas del año.",
    rango: "año en curso",
  },
};

// Tipos de resultado de cada query.
// NOTA: HANA devuelve los alias sin comillas en MAYÚSCULAS y los valores
// numéricos como texto. Normalizamos todas las claves a MAYÚSCULAS (ver
// normalizeRow) para tener un único criterio predecible.
export interface Q1Resumen {
  TOTALSKUS: number | string;
  VALORINVENTARIO: number | string;
}

export interface Q2Estado {
  STATUS: string;
  TOTALSKUS: number | string;
}

export interface Q3Salida {
  "MOTIVO BAJA": string;
  MOVIMIENTOS: number | string;
  COSTOTOTAL: number | string;
}

export interface Q4Grupo {
  GRUPO: string;
  VALORINVENTARIO: number | string;
}

export interface Q5Sku {
  "CODIGO SKU": string;
  "NOMBRE SKU": string;
  COSTOTOTAL: number | string;
}

export interface Q6ResumenMovimientos {
  MOVIMIENTOS: number | string;
  COSTOTOTAL: number | string;
}

export interface Q7GrupoSalida {
  GRUPO: string;
  MOVIMIENTOS: number | string;
  COSTOTOTAL: number | string;
}

export interface QueryResults {
  q1: Q1Resumen | null;
  q2: Q2Estado[] | null;
  q3: Q3Salida[] | null;
  q4: Q4Grupo[] | null;
  q5: Q5Sku[] | null;
  q6: Q6ResumenMovimientos | null;
  q7: Q7GrupoSalida[] | null;
}

/**
 * Crea y abre una conexión al servidor SAP HANA usando la config del .env.
 */
function connect(): Promise<any> {
  return new Promise((resolve, reject) => {
    const client = hdb.createClient({
      host: config.HANA_HOST,
      port: config.HANA_PORT,
      user: config.HANA_USER,
      password: config.HANA_PASS,
    });

    client.on("error", (err) => {
      reject(err instanceof Error ? err : new Error(String(err)));
    });

    client.connect((err: Error | null) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(client);
    });
  });
}

/**
 * Normaliza las claves de una fila a MAYÚSCULAS. HANA devuelve los alias
 * sin comillas en mayúsculas y las columnas entre comillas con su forma
 * original; uniformamos todo para acceder de forma predecible.
 */
function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(row)) {
    out[key.toUpperCase()] = row[key];
  }
  return out;
}

/**
 * Ejecuta una sentencia SQL y devuelve las filas con claves normalizadas.
 */
function exec<T>(client: any, sql: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    client.exec(sql, (err: Error | null, rows: Record<string, unknown>[]) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows.map(normalizeRow) as T[]);
    });
  });
}

/**
 * Cierra la conexión con SAP HANA.
 */
function disconnect(client: any): Promise<void> {
  return new Promise((resolve) => {
    if (!client) {
      resolve();
      return;
    }
    client.disconnect(() => resolve());
  });
}

// ─────────────────────────────────────────────────────────────
// Las 5 queries — IMPORTANTE: columnas y vistas con comillas dobles
// ─────────────────────────────────────────────────────────────

// Q1 — Resumen general (snapshot actual, sin filtro de período)
const SQL_Q1 = `
SELECT
    COUNT(DISTINCT "ItemCode") AS TotalSKUs,
    ROUND(SUM("OnHand" * "PrecioCompraUnitario"), 2) AS ValorInventario
FROM TRESB."BI_MAESTROART"
WHERE "ArtInventariable" = 'Y'`;

// Q2 — SKUs por estado (snapshot actual)
const SQL_Q2 = `
SELECT
    "Status",
    COUNT(*) AS TotalSKUs
FROM TRESB."BI_MAESTROART"
WHERE "ArtInventariable" = 'Y'
GROUP BY "Status"
ORDER BY TotalSKUs DESC`;

// Q4 — Top 5 grupos por valor de inventario (snapshot actual)
const SQL_Q4 = `
SELECT TOP 5
    "ItmsGrpNam" AS Grupo,
    ROUND(SUM("OnHand" * "PrecioCompraUnitario"), 2) AS ValorInventario
FROM TRESB."BI_MAESTROART"
WHERE "ArtInventariable" = 'Y'
GROUP BY "ItmsGrpNam"
ORDER BY ValorInventario DESC`;

function dateFilter(period: ReportPeriod): string {
  switch (period) {
    case "week":  return '"Fecha" >= ADD_DAYS(CURRENT_DATE, -7)';
    case "month": return 'YEAR("Fecha") = YEAR(CURRENT_DATE) AND MONTH("Fecha") = MONTH(CURRENT_DATE)';
    case "year":  return 'YEAR("Fecha") = YEAR(CURRENT_DATE)';
  }
}

// Q3 — Salidas por motivo (rango dinámico por período)
function sqlQ3(period: ReportPeriod): string {
  return `
SELECT
    "Motivo BAJA",
    COUNT(*) AS Movimientos,
    ROUND(SUM("Costo Total"), 2) AS CostoTotal
FROM TRESB."BI_Salidas+Integrador"
WHERE ${dateFilter(period)}
GROUP BY "Motivo BAJA"
ORDER BY CostoTotal DESC`;
}

// Q5 — Top 5 SKUs más movidos (rango dinámico por período)
function sqlQ5(period: ReportPeriod): string {
  return `
SELECT TOP 5
    "Codigo SKU",
    "Nombre SKU",
    ROUND(SUM("Costo Total"), 2) AS CostoTotal
FROM TRESB."BI_Salidas+Integrador"
WHERE ${dateFilter(period)}
GROUP BY "Codigo SKU", "Nombre SKU"
ORDER BY CostoTotal DESC`;
}

// Q6 — Resumen total de salidas del período (movimientos + costo acumulado)
function sqlQ6(period: ReportPeriod): string {
  return `
SELECT
    COUNT(*) AS Movimientos,
    ROUND(SUM("Costo Total"), 2) AS CostoTotal
FROM TRESB."BI_Salidas+Integrador"
WHERE ${dateFilter(period)}`;
}

// Q7 — Top 5 grupos con más salidas del período (join con maestro para obtener grupo)
function sqlQ7(period: ReportPeriod): string {
  return `
SELECT TOP 5
    m."ItmsGrpNam" AS Grupo,
    COUNT(*) AS Movimientos,
    ROUND(SUM(s."Costo Total"), 2) AS CostoTotal
FROM TRESB."BI_Salidas+Integrador" s
LEFT JOIN TRESB."BI_MAESTROART" m ON s."Codigo SKU" = m."ItemCode"
WHERE ${dateFilter(period)}
  AND m."ItmsGrpNam" IS NOT NULL
GROUP BY m."ItmsGrpNam"
ORDER BY CostoTotal DESC`;
}

/**
 * Ejecuta una query individual con manejo de error aislado.
 * Si falla, registra el error y devuelve null (la sección mostrará
 * "Sin datos disponibles" en el reporte).
 */
async function runSafe<T>(
  client: any,
  label: string,
  sql: string
): Promise<T[] | null> {
  try {
    const rows = await exec<T>(client, sql);
    console.log(
      `✅ ${label} OK (${rows.length} fila${rows.length === 1 ? "" : "s"})`
    );
    return rows;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`❌ ${label} Error: ${msg}`);
    return null;
  }
}

/**
 * Conecta a SAP HANA, ejecuta las 5 queries del reporte en paralelo y
 * cierra la conexión. Cada query tiene su propio try/catch, por lo que
 * el fallo de una no afecta a las demás.
 */
export async function getInventoryData(period: ReportPeriod = "week"): Promise<QueryResults> {
  const client = await connect();
  try {
    const [q1Rows, q2, q3, q4, q5, q6Rows, q7] = await Promise.all([
      runSafe<Q1Resumen>(client, "Q1", SQL_Q1),
      runSafe<Q2Estado>(client, "Q2", SQL_Q2),
      runSafe<Q3Salida>(client, "Q3", sqlQ3(period)),
      runSafe<Q4Grupo>(client, "Q4", SQL_Q4),
      runSafe<Q5Sku>(client, "Q5", sqlQ5(period)),
      runSafe<Q6ResumenMovimientos>(client, "Q6", sqlQ6(period)),
      runSafe<Q7GrupoSalida>(client, "Q7", sqlQ7(period)),
    ]);

    return {
      q1: q1Rows && q1Rows.length > 0 ? q1Rows[0] : null,
      q2,
      q3,
      q4,
      q5,
      q6: q6Rows && q6Rows.length > 0 ? q6Rows[0] : null,
      q7,
    };
  } finally {
    await disconnect(client);
  }
}

// ─────────────────────────────────────────────────────────────
// Reporte 4: Mermas desconocidas + Integrador / Ventas
// ─────────────────────────────────────────────────────────────

export interface MermasPorTiendaMes {
  TIENDA: string;
  MES: number | string;
  COSTOMERMAS: number | string;
}

export interface IntegradorPorMes {
  MES: number | string;
  COSTOINTEGRADOR: number | string;
}

export interface VentasPorTiendaMes {
  TIENDA: string;
  MES: number | string;
  TOTALVENTAS: number | string;
}

export interface MermasQueryResults {
  mermas: MermasPorTiendaMes[];
  integrador: IntegradorPorMes[];
  ventas: VentasPorTiendaMes[];
}

const SQL_MERMAS = `
SELECT
    CASE WHEN "Almacen" LIKE 'V%' THEN SUBSTR("Almacen", 2) ELSE "Almacen" END AS Tienda,
    MONTH("Fecha") AS Mes,
    ROUND(SUM("Costo Total"), 2) AS CostoMermas
FROM TRESB."BI_Salidas+Integrador"
WHERE "Modulo" = 'INVFISICO'
  AND YEAR("Fecha") = YEAR(CURRENT_DATE)
GROUP BY CASE WHEN "Almacen" LIKE 'V%' THEN SUBSTR("Almacen", 2) ELSE "Almacen" END, MONTH("Fecha")
ORDER BY Tienda, Mes`;

const SQL_INTEGRADOR = `
SELECT
    MONTH("Fecha") AS Mes,
    ROUND(SUM("Costo Total"), 2) AS CostoIntegrador
FROM TRESB."BI_Salidas+Integrador"
WHERE "Modulo" = 'INTEGRADOR'
  AND YEAR("Fecha") = YEAR(CURRENT_DATE)
GROUP BY MONTH("Fecha")
ORDER BY Mes`;

const SQL_VENTAS = `
SELECT
    "Almacen" AS Tienda,
    MONTH("Fecha") AS Mes,
    ROUND(SUM("TotalVenta 84%"), 2) AS TotalVentas
FROM TRESB."BI_VENTAS"
WHERE YEAR("Fecha") = YEAR(CURRENT_DATE)
GROUP BY "Almacen", MONTH("Fecha")
ORDER BY Tienda, Mes`;

export async function getMermasData(): Promise<MermasQueryResults> {
  const client = await connect();
  try {
    const [mermas, integrador, ventas] = await Promise.all([
      runSafe<MermasPorTiendaMes>(client, "Mermas INVFISICO", SQL_MERMAS),
      runSafe<IntegradorPorMes>(client, "Integrador", SQL_INTEGRADOR),
      runSafe<VentasPorTiendaMes>(client, "Ventas", SQL_VENTAS),
    ]);
    return {
      mermas: mermas ?? [],
      integrador: integrador ?? [],
      ventas: ventas ?? [],
    };
  } finally {
    await disconnect(client);
  }
}

const MAX_ADHOC_ROWS = 100;

/**
 * Ejecuta una consulta SELECT ad-hoc (solo lectura) para preguntas
 * puntuales del chat. Rechaza cualquier sentencia que no sea SELECT
 * y limita el número de filas devueltas.
 */
export async function runReadOnlySql(
  sql: string
): Promise<Record<string, unknown>[]> {
  const trimmed = sql.trim().replace(/;+\s*$/, "");

  if (!/^select\b/i.test(trimmed)) {
    throw new Error("Solo se permiten consultas SELECT");
  }
  if (/;/.test(trimmed)) {
    throw new Error("No se permiten múltiples sentencias");
  }

  const client = await connect();
  try {
    const rows = await exec<Record<string, unknown>>(client, trimmed);
    return rows.slice(0, MAX_ADHOC_ROWS);
  } finally {
    await disconnect(client);
  }
}

/**
 * Prueba simple de conectividad: ejecuta un SELECT trivial.
 */
export async function testConnection(): Promise<void> {
  const client = await connect();
  try {
    await exec(client, "SELECT CURRENT_DATE AS HOY FROM DUMMY");
  } finally {
    await disconnect(client);
  }
}
