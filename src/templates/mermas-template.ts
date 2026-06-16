import type { MermasQueryResults } from "../tools/hana.js";

const MESES_CORTO = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function esc(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fmtPct(value: number): string {
  return value.toFixed(2) + "%";
}

function fmtBs(value: number): string {
  return value.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fechaGeneracion(): string {
  const now = new Date();
  const fecha = now.toLocaleDateString("es-BO", { timeZone: "America/La_Paz", day: "2-digit", month: "2-digit", year: "numeric" });
  const hora = now.toLocaleTimeString("es-BO", { timeZone: "America/La_Paz", hour: "2-digit", minute: "2-digit", hour12: false });
  return `${fecha} ${hora}`;
}

function colorPct(pct: number): string {
  if (pct === 0) return "#333333";
  if (pct < 1) return "#2e7d32";
  if (pct < 2) return "#f57c00";
  return "#c62828";
}

function bgPct(pct: number): string {
  if (pct === 0) return "transparent";
  if (pct < 1) return "#f1f8f1";
  if (pct < 2) return "#fff8f0";
  return "#fdecea";
}

export function buildMermasReport(data: MermasQueryResults, analisis?: string): string {
  const currentMonth = new Date().getMonth() + 1;
  const meses = Array.from({ length: currentMonth }, (_, i) => i + 1);

  // Mapas de datos
  const mermasMap: Record<string, Record<number, number>> = {};
  const ventasMap: Record<string, Record<number, number>> = {};
  const integradorMap: Record<number, number> = {};

  for (const row of data.mermas) {
    const t = String(row.TIENDA);
    const m = Number(row.MES);
    if (!mermasMap[t]) mermasMap[t] = {};
    mermasMap[t][m] = Number(row.COSTOMERMAS) || 0;
  }

  for (const row of data.ventas) {
    const t = String(row.TIENDA);
    const m = Number(row.MES);
    if (!ventasMap[t]) ventasMap[t] = {};
    ventasMap[t][m] = Number(row.TOTALVENTAS) || 0;
  }

  for (const row of data.integrador) {
    const m = Number(row.MES);
    integradorMap[m] = Number(row.COSTOINTEGRADOR) || 0;
  }

  // Tiendas con ventas o mermas, ordenadas
  const tiendas = [...new Set([
    ...Object.keys(mermasMap),
    ...Object.keys(ventasMap),
  ])].sort();

  const FONT = "font-family:Arial,Helvetica,sans-serif;";
  const TH_BASE = `background-color:#e8590c;color:#fff;padding:8px 10px;font-size:12px;${FONT}`;
  const TH_L = `style="${TH_BASE}text-align:left;"`;
  const TH_C = `style="${TH_BASE}text-align:center;min-width:70px;"`;
  const TD_L = `style="padding:7px 10px;border-bottom:1px solid #e0e0e0;font-size:12px;color:#333;${FONT}"`;

  // Encabezado de columnas
  const headerCols = meses.map(m => `<th ${TH_C}>${MESES_CORTO[m]}</th>`).join("");

  // Filas por tienda
  const filasTiendas = tiendas.map(tienda => {
    const celdas = meses.map(mes => {
      const mermas = mermasMap[tienda]?.[mes] ?? 0;
      const ventas = ventasMap[tienda]?.[mes] ?? 0;
      if (ventas === 0) return `<td style="padding:7px 10px;border-bottom:1px solid #e0e0e0;font-size:12px;text-align:center;color:#bbb;${FONT}">—</td>`;
      const pct = (mermas / ventas) * 100;
      const color = colorPct(pct);
      const bg = bgPct(pct);
      return `<td style="padding:7px 10px;border-bottom:1px solid #e0e0e0;font-size:12px;text-align:center;color:${color};background-color:${bg};font-weight:bold;${FONT}">${fmtPct(pct)}</td>`;
    }).join("");
    return `<tr><td ${TD_L}>Tienda ${esc(tienda)}</td>${celdas}</tr>`;
  }).join("");

  // Fila TOTAL: (mermas todas las tiendas + integrador) / ventas totales
  const celdasTotal = meses.map(mes => {
    const totalMermas = tiendas.reduce((s, t) => s + (mermasMap[t]?.[mes] ?? 0), 0);
    const totalIntegrador = integradorMap[mes] ?? 0;
    const totalVentas = tiendas.reduce((s, t) => s + (ventasMap[t]?.[mes] ?? 0), 0);
    if (totalVentas === 0) return `<td style="padding:8px 10px;font-size:12px;text-align:center;color:#bbb;background-color:#f5f5f5;font-weight:bold;${FONT}">—</td>`;
    const pct = ((totalMermas + totalIntegrador) / totalVentas) * 100;
    const color = colorPct(pct);
    return `<td style="padding:8px 10px;font-size:12px;text-align:center;color:${color};background-color:#f5f5f5;font-weight:bold;${FONT}">${fmtPct(pct)}</td>`;
  }).join("");

  // Leyenda de colores
  const leyenda = `
    <tr><td colspan="${meses.length + 1}" style="padding:12px 10px 4px;${FONT}font-size:11px;color:#888;">
      Referencia:
      <span style="color:#2e7d32;font-weight:bold;">■ &lt; 1%</span> &nbsp;
      <span style="color:#f57c00;font-weight:bold;">■ 1% – 2%</span> &nbsp;
      <span style="color:#c62828;font-weight:bold;">■ &gt; 2%</span>
    </td></tr>`;

  const anio = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte de Mermas — Tiendas 3B</title>
</head>
<body style="margin:0;padding:0;background-color:#eef1f4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef1f4;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="720" cellpadding="0" cellspacing="0" style="max-width:720px;width:100%;background-color:#fff;border-radius:8px;overflow:hidden;">

        <!-- Header -->
        <tr><td style="background-color:#e8590c;padding:28px 24px;">
          <h1 style="margin:0 0 6px 0;color:#fff;font-size:22px;${FONT}">Reporte de Mermas — Tiendas 3B</h1>
          <p style="margin:0;color:#ffd9c2;font-size:13px;${FONT}">(Mermas desconocidas + Integrador) / Ventas &nbsp;·&nbsp; Año ${anio}</p>
        </td></tr>

        <!-- Objetivo -->
        <tr><td style="padding:16px 24px 0 24px;">
          <p style="margin:0;font-size:13px;color:#5a6b7e;font-style:italic;${FONT}">
            Porcentaje de mermas desconocidas (inventario físico) e integrador sobre las ventas, por tienda y mes del año en curso.
          </p>
        </td></tr>

        <!-- Tabla -->
        <tr><td style="padding:16px 24px 24px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <tr>
              <th ${TH_L}>Tienda</th>
              ${headerCols}
            </tr>
            ${filasTiendas}
            <tr>
              <td style="padding:8px 10px;font-size:12px;font-weight:bold;background-color:#f5f5f5;color:#333;${FONT}">TOTAL</td>
              ${celdasTotal}
            </tr>
            ${leyenda}
          </table>
        </td></tr>

        ${analisis ? `
        <!-- Análisis -->
        <tr><td style="padding:0 24px 24px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fff8f4;border-left:4px solid #e8590c;border-radius:4px;">
            <tr><td style="padding:16px 20px;">
              <p style="margin:0 0 8px 0;font-size:13px;font-weight:bold;color:#e8590c;${FONT}">Análisis</p>
              <p style="margin:0;font-size:13px;color:#333;line-height:1.6;${FONT}; white-space:pre-line;">${esc(analisis)}</p>
            </td></tr>
          </table>
        </td></tr>` : ""}

        <!-- Footer -->
        <tr><td style="background-color:#fff4ec;padding:16px 24px;border-top:1px solid #e0e0e0;">
          <p style="margin:0;font-size:12px;color:#8a98a8;${FONT}">Santa Cruz - Bolivia &middot; ${fechaGeneracion()}</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
