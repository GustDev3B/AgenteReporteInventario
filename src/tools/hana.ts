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

// ─────────────────────────────────────────────────────────────
// Interfaces de resultado (shapes que usa report-template.ts)
// ─────────────────────────────────────────────────────────────

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
  q1Resumen: Q1Resumen | null;
  q2Estados: Q2Estado[] | null;
  q3Salidas: Q3Salida[] | null;
  q4Grupos: Q4Grupo[] | null;
  q5TopSkus: Q5Sku[] | null;
  q6Movimientos: Q6ResumenMovimientos | null;
  q7SalidasPorGrupo: Q7GrupoSalida[] | null;
}

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

// ─────────────────────────────────────────────────────────────
// Cliente HTTP hacia InventoryAPI
// ─────────────────────────────────────────────────────────────

function getHeaders(): Record<string, string> {
  const encoded = Buffer.from(config.INVENTORY_API_KEY).toString("base64");
  return {
    "Content-Type": "application/json",
    "X-API-KEY": encoded,
  };
}

async function callApi<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${config.INVENTORY_API_URL}${path}`;
  const res = await fetch(url, { ...options, headers: getHeaders() });

  const text = await res.text();
  if (!text) {
    throw new Error(`InventoryAPI ${path} → HTTP ${res.status} (respuesta vacía)`);
  }

  let body: { data: T; statusCode: number; message: string };
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`InventoryAPI ${path} → HTTP ${res.status} — respuesta no es JSON: ${text.slice(0, 200)}`);
  }

  if (!res.ok || body.statusCode < 200 || body.statusCode >= 300) {
    throw new Error(`InventoryAPI ${path} → ${body.statusCode}: ${body.message}`);
  }

  return body.data;
}

// ─────────────────────────────────────────────────────────────
// Mappers: convierte camelCase de la API al shape esperado
// ─────────────────────────────────────────────────────────────

function mapInventoryData(d: any): QueryResults {
  return {
    q1Resumen:        d.q1Resumen ? { TOTALSKUS: d.q1Resumen.totalSkus, VALORINVENTARIO: d.q1Resumen.valorInventario } : null,
    q2Estados:        d.q2Estados?.map((r: any) => ({ STATUS: r.status, TOTALSKUS: r.totalSkus })) ?? null,
    q3Salidas:        d.q3Salidas?.map((r: any) => ({ "MOTIVO BAJA": r.motivoBaja, MOVIMIENTOS: r.cantidad, COSTOTOTAL: r.costoTotal })) ?? null,
    q4Grupos:         d.q4Grupos?.map((r: any) => ({ GRUPO: r.grupo, VALORINVENTARIO: r.valorInventario })) ?? null,
    q5TopSkus:        d.q5TopSkus?.map((r: any) => ({ "CODIGO SKU": r.codigoSku, "NOMBRE SKU": r.nombreSku, COSTOTOTAL: r.costoTotal })) ?? null,
    q6Movimientos:    d.q6Movimientos ? { MOVIMIENTOS: d.q6Movimientos.total, COSTOTOTAL: d.q6Movimientos.costoTotal } : null,
    q7SalidasPorGrupo: d.q7SalidasPorGrupo?.map((r: any) => ({ GRUPO: r.grupo, MOVIMIENTOS: r.cantidad, COSTOTOTAL: r.costoTotal })) ?? null,
  };
}

function mapMermasData(d: any): MermasQueryResults {
  return {
    mermas:     d.mermas?.map((r: any)     => ({ TIENDA: r.tienda, MES: r.mes, COSTOMERMAS: r.costoMermas }))     ?? [],
    integrador: d.integrador?.map((r: any) => ({ MES: r.mes, COSTOINTEGRADOR: r.costoIntegrador }))              ?? [],
    ventas:     d.ventas?.map((r: any)     => ({ TIENDA: r.tienda, MES: r.mes, TOTALVENTAS: r.totalVentas }))     ?? [],
  };
}

// ─────────────────────────────────────────────────────────────
// API pública — mismas firmas que antes
// ─────────────────────────────────────────────────────────────

export async function getInventoryData(period: ReportPeriod = "week"): Promise<QueryResults> {
  const data = await callApi<any>(`/SapHana/inventory?period=${period}`);
  return mapInventoryData(data);
}

export async function getMermasData(): Promise<MermasQueryResults> {
  const data = await callApi<any>("/SapHana/mermas");
  return mapMermasData(data);
}

export async function runReadOnlySql(sql: string): Promise<Record<string, unknown>[]> {
  return callApi<Record<string, unknown>[]>("/SapHana/query", {
    method: "POST",
    body: JSON.stringify({ sql }),
  });
}

export async function testConnection(): Promise<void> {
  await callApi<any>("/SapHana/inventory?period=week");
}
