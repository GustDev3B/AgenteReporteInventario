export interface CustomReportOptions {
  titulo: string;
  descripcion?: string;
  datos: Record<string, unknown>[];
  analisis?: string;
}

function esc(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fmtVal(v: unknown): string {
  if (v === null || v === undefined) return "—";
  const s = String(v).trim();
  if (s === "") return "—";
  const n = Number(s);
  if (!isNaN(n)) {
    return n.toLocaleString("es-BO", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  return esc(v);
}

function isNumericCol(datos: Record<string, unknown>[], col: string): boolean {
  return datos.some((r) => {
    const v = r[col];
    return v !== null && v !== undefined && String(v).trim() !== "" && !isNaN(Number(v));
  });
}

function fechaGeneracion(): string {
  const now = new Date();
  const fecha = now.toLocaleDateString("es-BO", { timeZone: "America/La_Paz", day: "2-digit", month: "2-digit", year: "numeric" });
  const hora = now.toLocaleTimeString("es-BO", { timeZone: "America/La_Paz", hour: "2-digit", minute: "2-digit", hour12: false });
  return `${fecha} ${hora}`;
}

export function buildCustomReport({ titulo, descripcion, datos, analisis }: CustomReportOptions): string {
  const FONT = "font-family:Arial,Helvetica,sans-serif;";
  const TH_BASE = `background-color:#e8590c;color:#fff;padding:8px 10px;font-size:12px;${FONT}`;

  if (!datos || datos.length === 0) {
    return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>${esc(titulo)}</title></head>
<body style="margin:0;padding:24px;background:#eef1f4;${FONT}">
  <h2 style="color:#e8590c;">${esc(titulo)}</h2>
  <p style="color:#888;">No se encontraron datos para este reporte.</p>
  <p style="font-size:11px;color:#aaa;">Generado: ${fechaGeneracion()}</p>
</body></html>`;
  }

  const columns = Object.keys(datos[0]);
  const numericCols = new Set(columns.filter((c) => isNumericCol(datos, c)));

  const headerRow = columns
    .map((c) => {
      const align = numericCols.has(c) ? "right" : "left";
      return `<th style="${TH_BASE}text-align:${align};">${esc(c)}</th>`;
    })
    .join("");

  const dataRows = datos
    .map((row, i) => {
      const bg = i % 2 === 0 ? "#fff" : "#f9f9f9";
      const cells = columns
        .map((c) => {
          const align = numericCols.has(c) ? "right" : "left";
          return `<td style="padding:7px 10px;border-bottom:1px solid #e0e0e0;font-size:12px;color:#333;text-align:${align};background-color:${bg};${FONT}">${fmtVal(row[c])}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  const analisisSection = analisis
    ? `<tr><td colspan="${columns.length}" style="padding:20px 0 0 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fff8f4;border-left:4px solid #e8590c;border-radius:4px;">
          <tr><td style="padding:16px 20px;">
            <p style="margin:0 0 8px 0;font-size:13px;font-weight:bold;color:#e8590c;${FONT}">Análisis</p>
            <p style="margin:0;font-size:13px;color:#333;line-height:1.6;${FONT};white-space:pre-line;">${esc(analisis)}</p>
          </td></tr>
        </table>
      </td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(titulo)}</title>
</head>
<body style="margin:0;padding:0;background-color:#eef1f4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef1f4;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="720" cellpadding="0" cellspacing="0" style="max-width:720px;width:100%;background-color:#fff;border-radius:8px;overflow:hidden;">

        <!-- Header -->
        <tr><td style="background-color:#e8590c;padding:28px 24px;">
          <h1 style="margin:0 0 6px 0;color:#fff;font-size:22px;${FONT}">${esc(titulo)}</h1>
          ${descripcion ? `<p style="margin:0;color:#ffd9c2;font-size:13px;${FONT}">${esc(descripcion)}</p>` : ""}
        </td></tr>

        <!-- Tabla -->
        <tr><td style="padding:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <tr>${headerRow}</tr>
            ${dataRows}
            ${analisisSection}
          </table>
          <p style="margin:12px 0 0 0;font-size:11px;color:#bbb;${FONT}">${datos.length} fila${datos.length !== 1 ? "s" : ""}</p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background-color:#fff4ec;padding:16px 24px;border-top:1px solid #e0e0e0;">
          <p style="margin:0;font-size:12px;color:#8a98a8;${FONT}">Reporte personalizado — Tiendas 3B &middot; ${fechaGeneracion()}</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
