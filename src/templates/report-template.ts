import type { QueryResults } from "../tools/hana.js";

export interface PeriodInfo {
  titulo: string;
  objetivo: string;
  rango: string;
}

// ─────────────────────────────────────────────────────────────
// Helpers de formato
// ─────────────────────────────────────────────────────────────

/** Escapa HTML para evitar romper el markup con datos de la BD. */
function esc(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Formatea un número con separador de miles boliviano y 2 decimales. */
function fmtBs(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Formatea un entero con separador de miles. */
function fmtInt(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("es-BO", { maximumFractionDigits: 0 });
}

/** Fecha y hora actual en formato DD/MM/YYYY HH:MM (zona Bolivia). */
function fechaGeneracion(): string {
  const now = new Date();
  const fecha = now.toLocaleDateString("es-BO", {
    timeZone: "America/La_Paz",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const hora = now.toLocaleTimeString("es-BO", {
    timeZone: "America/La_Paz",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${fecha} ${hora}`;
}

// Estilos reutilizables (inline para compatibilidad Gmail/Outlook)
const TH =
  'style="background-color:#e8590c;color:#ffffff;padding:10px 12px;text-align:left;font-size:13px;font-family:Arial,Helvetica,sans-serif;"';
const TH_R =
  'style="background-color:#e8590c;color:#ffffff;padding:10px 12px;text-align:right;font-size:13px;font-family:Arial,Helvetica,sans-serif;"';
const TD =
  'style="padding:9px 12px;border-bottom:1px solid #e0e0e0;font-size:13px;color:#333333;font-family:Arial,Helvetica,sans-serif;"';
const TD_R =
  'style="padding:9px 12px;border-bottom:1px solid #e0e0e0;font-size:13px;color:#333333;text-align:right;font-family:Arial,Helvetica,sans-serif;"';

/** Encabezado de sección. */
function seccion(titulo: string): string {
  return `<tr><td style="padding:24px 0 8px 0;">
    <h2 style="margin:0;font-size:17px;color:#e8590c;font-family:Arial,Helvetica,sans-serif;border-bottom:2px solid #e8590c;padding-bottom:6px;">${esc(
      titulo
    )}</h2>
  </td></tr>`;
}

/** Mensaje de sección sin datos. */
function sinDatos(): string {
  return `<tr><td style="padding:12px;background-color:#fafafa;color:#999999;font-style:italic;font-size:13px;font-family:Arial,Helvetica,sans-serif;">Sin datos disponibles</td></tr>`;
}

/** Envuelve filas en una tabla completa. */
function tabla(inner: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${inner}</table>`;
}

// ─────────────────────────────────────────────────────────────
// Secciones del reporte
// ─────────────────────────────────────────────────────────────

function seccionKPIs(q1: QueryResults["q1"]): string {
  if (!q1) {
    return seccion("Resumen general") + `<tr><td>${tabla(sinDatos())}</td></tr>`;
  }

  const kpi = (label: string, valor: string, sub: string) => `
    <td width="50%" style="padding:8px;" valign="top">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fff4ec;border-radius:6px;">
        <tr><td style="padding:20px;text-align:center;font-family:Arial,Helvetica,sans-serif;">
          <div style="font-size:13px;color:#5a6b7e;margin-bottom:6px;">${esc(label)}</div>
          <div style="font-size:30px;font-weight:bold;color:#e8590c;">${valor}</div>
          <div style="font-size:12px;color:#8a98a8;margin-top:4px;">${esc(sub)}</div>
        </td></tr>
      </table>
    </td>`;

  return (
    seccion("Resumen general") +
    `<tr><td>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        ${kpi("Total de SKUs", fmtInt(q1.TOTALSKUS), "artículos inventariables")}
        ${kpi("Valor de inventario", `Bs ${fmtBs(q1.VALORINVENTARIO)}`, "a precio de compra")}
      </tr></table>
    </td></tr>`
  );
}

function seccionEstados(q2: QueryResults["q2"]): string {
  let body: string;
  if (!q2 || q2.length === 0) {
    body = sinDatos();
  } else {
    const filas = q2
      .map(
        (r) =>
          `<tr><td ${TD}>${esc(r.STATUS)}</td><td ${TD_R}>${fmtInt(
            r.TOTALSKUS
          )}</td></tr>`
      )
      .join("");
    body = `<tr><th ${TH}>Status</th><th ${TH_R}>Cantidad SKUs</th></tr>${filas}`;
  }
  return seccion("Estados de stock") + `<tr><td>${tabla(body)}</td></tr>`;
}

function seccionSalidas(q3: QueryResults["q3"], rango: string): string {
  let body: string;
  if (!q3 || q3.length === 0) {
    body = sinDatos();
  } else {
    const filas = q3
      .map((r) => {
        const alto = Number(r.COSTOTOTAL) > 1000;
        const bg = alto ? "background-color:#fdecea;" : "";
        return `<tr><td style="padding:9px 12px;border-bottom:1px solid #e0e0e0;font-size:13px;color:#333333;font-family:Arial,Helvetica,sans-serif;${bg}">${esc(
          r["MOTIVO BAJA"]
        )}</td><td style="padding:9px 12px;border-bottom:1px solid #e0e0e0;font-size:13px;color:#333333;text-align:right;font-family:Arial,Helvetica,sans-serif;${bg}">${fmtInt(
          r.MOVIMIENTOS
        )}</td><td style="padding:9px 12px;border-bottom:1px solid #e0e0e0;font-size:13px;color:#333333;text-align:right;font-family:Arial,Helvetica,sans-serif;${bg}">${fmtBs(
          r.COSTOTOTAL
        )}</td></tr>`;
      })
      .join("");
    body = `<tr><th ${TH}>Motivo</th><th ${TH_R}>Movimientos</th><th ${TH_R}>Costo Bs</th></tr>${filas}`;
  }
  return (
    seccion(`Salidas ${rango} por motivo`) + `<tr><td>${tabla(body)}</td></tr>`
  );
}

function seccionGrupos(q4: QueryResults["q4"]): string {
  let body: string;
  if (!q4 || q4.length === 0) {
    body = sinDatos();
  } else {
    const filas = q4
      .map(
        (r) =>
          `<tr><td ${TD}>${esc(r.GRUPO)}</td><td ${TD_R}>${fmtBs(
            r.VALORINVENTARIO
          )}</td></tr>`
      )
      .join("");
    body = `<tr><th ${TH}>Grupo</th><th ${TH_R}>Valor Inventario Bs</th></tr>${filas}`;
  }
  return (
    seccion("Top 5 grupos por valor de inventario") +
    `<tr><td>${tabla(body)}</td></tr>`
  );
}

function seccionSkus(q5: QueryResults["q5"], rango: string): string {
  let body: string;
  if (!q5 || q5.length === 0) {
    body = sinDatos();
  } else {
    const filas = q5
      .map(
        (r) =>
          `<tr><td ${TD}>${esc(r["CODIGO SKU"])}</td><td ${TD}>${esc(
            r["NOMBRE SKU"]
          )}</td><td ${TD_R}>${fmtBs(r.COSTOTOTAL)}</td></tr>`
      )
      .join("");
    body = `<tr><th ${TH}>Código SKU</th><th ${TH}>Nombre SKU</th><th ${TH_R}>Costo Bs</th></tr>${filas}`;
  }
  return (
    seccion(`Top 5 SKUs más movidos ${rango}`) +
    `<tr><td>${tabla(body)}</td></tr>`
  );
}

function seccionObjetivo(objetivo: string): string {
  return `<tr><td>
    <p style="margin:0 0 8px 0;font-size:13px;color:#5a6b7e;font-family:Arial,Helvetica,sans-serif;font-style:italic;">${esc(objetivo)}</p>
  </td></tr>`;
}

function seccionResumenMovimientos(q6: QueryResults["q6"], rango: string): string {
  if (!q6) return "";

  const kpi = (label: string, valor: string, sub: string) => `
    <td width="50%" style="padding:8px;" valign="top">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fff4ec;border-radius:6px;">
        <tr><td style="padding:20px;text-align:center;font-family:Arial,Helvetica,sans-serif;">
          <div style="font-size:13px;color:#5a6b7e;margin-bottom:6px;">${esc(label)}</div>
          <div style="font-size:30px;font-weight:bold;color:#e8590c;">${valor}</div>
          <div style="font-size:12px;color:#8a98a8;margin-top:4px;">${esc(sub)}</div>
        </td></tr>
      </table>
    </td>`;

  return (
    seccion(`Movimientos del período (${rango})`) +
    `<tr><td>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        ${kpi("Total movimientos", fmtInt(q6.MOVIMIENTOS), "salidas registradas")}
        ${kpi("Costo total salidas", `Bs ${fmtBs(q6.COSTOTOTAL)}`, "valor de lo que salió")}
      </tr></table>
    </td></tr>`
  );
}

function seccionGruposSalidas(q7: QueryResults["q7"], rango: string): string {
  let body: string;
  if (!q7 || q7.length === 0) {
    body = sinDatos();
  } else {
    const filas = q7
      .map(
        (r) =>
          `<tr><td ${TD}>${esc(r.GRUPO)}</td><td ${TD_R}>${fmtInt(r.MOVIMIENTOS)}</td><td ${TD_R}>${fmtBs(r.COSTOTOTAL)}</td></tr>`
      )
      .join("");
    body = `<tr><th ${TH}>Grupo</th><th ${TH_R}>Movimientos</th><th ${TH_R}>Costo Bs</th></tr>${filas}`;
  }
  return (
    seccion(`Top 5 grupos con más salidas (${rango})`) +
    `<tr><td>${tabla(body)}</td></tr>`
  );
}

/** Sección opcional con el análisis generado por el agente. */
function seccionAnalisis(analisis: string): string {
  if (!analisis.trim()) return "";
  const texto = esc(analisis).replace(/\n/g, "<br>");
  return (
    seccion("Análisis del agente") +
    `<tr><td>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:16px;background-color:#f5f5f5;border-radius:6px;font-size:13px;line-height:1.6;color:#333333;font-family:Arial,Helvetica,sans-serif;">${texto}</td></tr>
      </table>
    </td></tr>`
  );
}

// ─────────────────────────────────────────────────────────────
// Render principal
// ─────────────────────────────────────────────────────────────

const DEFAULT_PERIOD: PeriodInfo = {
  titulo: "Reporte Semanal de Inventario",
  objetivo: "Monitorear el comportamiento del inventario y las salidas de la semana actual.",
  rango: "últimos 7 días",
};

export function buildInventoryReport(
  data: QueryResults,
  analisis: string = "",
  period: PeriodInfo = DEFAULT_PERIOD
): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(period.titulo)} — Tiendas 3B</title>
</head>
<body style="margin:0;padding:0;background-color:#eef1f4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef1f4;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;">

        <!-- Header -->
        <tr><td style="background-color:#e8590c;padding:28px 24px;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-family:Arial,Helvetica,sans-serif;">${esc(period.titulo)} — Tiendas 3B</h1>
        </td></tr>

        <!-- Contenido -->
        <tr><td style="padding:8px 24px 24px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${seccionObjetivo(period.objetivo)}
            ${seccionKPIs(data.q1)}
            ${seccionResumenMovimientos(data.q6, period.rango)}
            ${seccionEstados(data.q2)}
            ${seccionSalidas(data.q3, period.rango)}
            ${seccionGruposSalidas(data.q7, period.rango)}
            ${seccionSkus(data.q5, period.rango)}
            ${seccionAnalisis(analisis)}
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background-color:#fff4ec;padding:16px 24px;border-top:1px solid #e0e0e0;">
          <p style="margin:0;font-size:12px;color:#8a98a8;font-family:Arial,Helvetica,sans-serif;">Santa Cruz - Bolivia &middot; ${fechaGeneracion()}</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
