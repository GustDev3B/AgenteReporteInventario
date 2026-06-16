import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import {
  getInventoryData,
  getMermasData,
  runReadOnlySql,
  PERIOD_LABELS,
  type QueryResults,
  type MermasQueryResults,
  type ReportPeriod,
} from "../tools/hana.js";
import type { PeriodInfo } from "../templates/report-template.js";
import { buildInventoryReport } from "../templates/report-template.js";
import { buildMermasReport } from "../templates/mermas-template.js";
import { buildCustomReport } from "../templates/custom-report-template.js";
import { sendReport } from "../tools/sendgrid.js";
import { getReportRecipients } from "../config.js";

// Estado compartido entre tools dentro de la misma sesión.
let lastData: QueryResults | null = null;
let lastPeriodInfo: PeriodInfo | null = null;
let lastMermasData: MermasQueryResults | null = null;
let lastSqlRows: Record<string, unknown>[] | null = null;
let lastHtml: string | null = null;
let lastHtmlPath: string | null = null;

function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

function errorResult(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: "text" as const, text: `Error: ${msg}` }],
    isError: true,
  };
}

const getInventoryDataTool = tool(
  "get_inventory_data",
  "Conecta a SAP HANA y ejecuta las 5 consultas oficiales del reporte de inventario. " +
    "Q1 resumen general, Q2 SKUs por estado, Q3 salidas por motivo, Q4 top 5 grupos por valor, " +
    "Q5 top 5 SKUs más movidos. El parámetro period define el rango de Q3 y Q5: " +
    "'week' = últimos 7 días (reporte semanal), 'month' = mes en curso (reporte mensual), " +
    "'year' = año en curso (reporte anual). Q1, Q2 y Q4 son siempre snapshot actual.",
  {
    period: z
      .enum(["week", "month", "year"])
      .default("week")
      .describe("Período del reporte: 'week' semanal, 'month' mensual, 'year' anual"),
  },
  async ({ period }) => {
    try {
      const p = (period ?? "week") as ReportPeriod;
      lastPeriodInfo = PERIOD_LABELS[p];
      lastData = await getInventoryData(p);
      return textResult(JSON.stringify({ period: p, label: lastPeriodInfo, data: lastData }));
    } catch (error) {
      return errorResult(error);
    }
  }
);

const runInventorySqlTool = tool(
  "run_inventory_sql",
  "Ejecuta una consulta SELECT ad-hoc (solo lectura) en SAP HANA para responder " +
    "preguntas puntuales del usuario. Vistas disponibles: TRESB.\"BI_MAESTROART\" " +
    "(maestro de artículos: \"ItemCode\", \"OnHand\", \"PrecioCompraUnitario\", " +
    "\"Status\", \"ItmsGrpNam\", \"ArtInventariable\") y TRESB.\"BI_Salidas+Integrador\" " +
    "(salidas: \"Fecha\", \"Motivo BAJA\", \"Costo Total\", \"Codigo SKU\", \"Nombre SKU\"). " +
    "IMPORTANTE: los nombres de columnas y vistas van entre comillas dobles. " +
    "Máximo 100 filas de resultado.",
  {
    sql: z.string().describe("Consulta SELECT de SAP HANA a ejecutar"),
  },
  async ({ sql }) => {
    try {
      const rows = await runReadOnlySql(sql);
      lastSqlRows = rows as Record<string, unknown>[];
      return textResult(JSON.stringify(rows));
    } catch (error) {
      return errorResult(error);
    }
  }
);

const buildReportTool = tool(
  "build_inventory_report",
  "Construye el HTML oficial del reporte de inventario con los datos obtenidos " +
    "previamente con get_inventory_data (si aún no se obtuvieron, los consulta " +
    "automáticamente). Guarda una copia en la carpeta reports/ y deja el HTML " +
    "en memoria para send_report_email. Opcionalmente acepta un análisis en " +
    "texto plano que se incluye como sección final del reporte.",
  {
    analisis: z
      .string()
      .optional()
      .describe(
        "Análisis breve en español (observaciones y recomendaciones) que se " +
          "agrega al final del reporte. Texto plano, sin HTML."
      ),
  },
  async ({ analisis }) => {
    try {
      if (!lastData) {
        lastData = await getInventoryData();
        lastPeriodInfo = PERIOD_LABELS["week"];
      }
      lastHtml = buildInventoryReport(lastData, analisis ?? "", lastPeriodInfo ?? undefined);

      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const reportDir = path.join(process.cwd(), "reports");
      mkdirSync(reportDir, { recursive: true });
      const suffix = lastPeriodInfo?.rango.startsWith("últimos") ? "semanal"
        : lastPeriodInfo?.rango.startsWith("mes") ? "mensual" : "anual";
      lastHtmlPath = path.join(
        reportDir,
        `reporte-inventario-${suffix}-${yyyy}-${mm}-${dd}.html`
      );
      writeFileSync(lastHtmlPath, lastHtml, "utf-8");

      return textResult(
        `Reporte HTML generado y guardado en ${lastHtmlPath} ` +
          `(${lastHtml.length} caracteres). Listo para enviar con send_report_email.`
      );
    } catch (error) {
      return errorResult(error);
    }
  }
);

const sendReportEmailTool = tool(
  "send_report_email",
  "Envía por correo (SendGrid) el último reporte HTML generado con " +
    "build_inventory_report. Si no se indican destinatarios usa los " +
    "configurados en REPORT_RECIPIENTS.",
  {
    subject: z
      .string()
      .optional()
      .describe("Asunto del correo. Si se omite se usa el asunto estándar."),
    recipients: z
      .array(z.string())
      .optional()
      .describe(
        "Lista de emails destino. Si se omite se usan los destinatarios configurados."
      ),
  },
  async ({ subject, recipients }) => {
    try {
      if (!lastHtml) {
        return errorResult(
          new Error(
            "No hay reporte generado. Llama primero a build_inventory_report, build_mermas_report o build_custom_report."
          )
        );
      }

      const fecha = new Date().toLocaleDateString("es-BO", {
        timeZone: "America/La_Paz",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const finalSubject =
        subject ?? `Reporte Inventario Semanal — Tiendas 3B (${fecha})`;
      const finalRecipients =
        recipients && recipients.length > 0 ? recipients : getReportRecipients();

      const result = await sendReport(lastHtml, finalSubject, finalRecipients);
      return textResult(result.message);
    } catch (error) {
      return errorResult(error);
    }
  }
);

const getMermasDataTool = tool(
  "get_mermas_data",
  "Obtiene datos de mermas (inventario físico), integrador y ventas por tienda y mes " +
    "del año en curso desde SAP HANA. Necesario antes de llamar a build_mermas_report.",
  {},
  async () => {
    try {
      lastMermasData = await getMermasData();
      return textResult(JSON.stringify(lastMermasData));
    } catch (error) {
      return errorResult(error);
    }
  }
);

const buildMermasReportTool = tool(
  "build_mermas_report",
  "Construye el HTML oficial del reporte de mermas con los datos obtenidos por " +
    "get_mermas_data. Muestra % de mermas sobre ventas por tienda y mes, con " +
    "semáforo de color (verde <1%, naranja 1-2%, rojo >2%). Acepta un análisis opcional.",
  {
    analisis: z
      .string()
      .optional()
      .describe("Análisis breve en español con observaciones y recomendaciones."),
  },
  async ({ analisis }) => {
    try {
      if (!lastMermasData) {
        lastMermasData = await getMermasData();
      }
      lastHtml = buildMermasReport(lastMermasData, analisis);

      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const reportDir = path.join(process.cwd(), "reports");
      mkdirSync(reportDir, { recursive: true });
      lastHtmlPath = path.join(reportDir, `reporte-mermas-${yyyy}-${mm}-${dd}.html`);
      writeFileSync(lastHtmlPath, lastHtml, "utf-8");

      return textResult(
        `Reporte de mermas generado y guardado en ${lastHtmlPath} ` +
          `(${lastHtml.length} caracteres). Listo para enviar con send_report_email.`
      );
    } catch (error) {
      return errorResult(error);
    }
  }
);

const buildCustomReportTool = tool(
  "build_custom_report",
  "Construye un reporte HTML personalizado con los datos obtenidos por la última " +
    "llamada a run_inventory_sql. Genera una tabla formateada con todos los resultados. " +
    "SIEMPRE llama primero a run_inventory_sql para obtener los datos. " +
    "Acepta un título, descripción y análisis opcionales.",
  {
    titulo: z.string().describe("Título del reporte personalizado"),
    descripcion: z
      .string()
      .optional()
      .describe("Descripción breve o contexto del reporte (se muestra debajo del título)."),
    analisis: z
      .string()
      .optional()
      .describe("Análisis breve en español con observaciones y recomendaciones."),
  },
  async ({ titulo, descripcion, analisis }) => {
    try {
      if (!lastSqlRows || lastSqlRows.length === 0) {
        return errorResult(
          new Error("No hay datos. Llama primero a run_inventory_sql para obtener los datos.")
        );
      }
      lastHtml = buildCustomReport({ titulo, descripcion, datos: lastSqlRows, analisis });

      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const reportDir = path.join(process.cwd(), "reports");
      mkdirSync(reportDir, { recursive: true });
      const slug = titulo.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
      lastHtmlPath = path.join(reportDir, `reporte-personalizado-${slug}-${yyyy}-${mm}-${dd}.html`);
      writeFileSync(lastHtmlPath, lastHtml, "utf-8");

      return textResult(
        `Reporte personalizado "${titulo}" generado con ${lastSqlRows.length} filas. ` +
          `Guardado en ${lastHtmlPath}. Listo para enviar con send_report_email.`
      );
    } catch (error) {
      return errorResult(error);
    }
  }
);

export const inventoryServer = createSdkMcpServer({
  name: "inventario",
  version: "1.0.0",
  tools: [
    getInventoryDataTool,
    runInventorySqlTool,
    buildReportTool,
    sendReportEmailTool,
    getMermasDataTool,
    buildMermasReportTool,
    buildCustomReportTool,
  ],
});

export const INVENTORY_TOOLS = [
  "mcp__inventario__get_inventory_data",
  "mcp__inventario__run_inventory_sql",
  "mcp__inventario__build_inventory_report",
  "mcp__inventario__send_report_email",
  "mcp__inventario__get_mermas_data",
  "mcp__inventario__build_mermas_report",
  "mcp__inventario__build_custom_report",
];
