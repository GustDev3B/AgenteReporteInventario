# AgentInventarios3B - Instrucciones del Proyecto

## Descripción

**AgentInventarios3B** es un agente conversacional de reportes de inventario perpetuo para Tiendas 3B (retail, Bolivia). Usa el **Claude Agent SDK**: el usuario chatea con el agente, el agente consulta **SAP HANA**, construye el reporte HTML oficial y lo envía por correo vía **SendGrid**.

Reemplaza al antiguo AgentTickets3B (análisis de tickets sobre Microsoft Fabric). Toda la integración Fabric/Azure AD fue eliminada; la fuente de datos ahora es SAP HANA, igual que el proyecto hermano `../report` (versión batch sin chat).

## Arquitectura

```
src/
├── config.ts                  # Validación de ENV vars con zod
├── index.ts                   # Entry point (modo chat)
├── test-connection.ts         # Prueba de conexión HANA + las 5 queries
├── report-preview.ts          # Envía reports/report-preview.html por email (dev)
├── agent/
│   ├── index.ts               # Options del query() del SDK
│   ├── prompts.ts             # System prompt (dominio inventarios)
│   └── tools.ts               # MCP server en proceso con 4 tools
├── tools/
│   ├── hana.ts                # Conexión SAP HANA + queries Q1-Q5 + SQL ad-hoc
│   └── sendgrid.ts            # Envío de emails vía SendGrid (fetch nativo)
├── templates/
│   └── report-template.ts     # HTML oficial del reporte (portado de ../report)
└── modes/
    └── chat.ts                # CLI interactiva (readline + streaming)
```

## Herramientas del Agente (MCP en proceso)

Definidas en `src/agent/tools.ts` con `createSdkMcpServer` / `tool`. El servidor se llama `inventario`, por lo que los nombres completos son `mcp__inventario__<tool>`:

| Tool | Función |
|------|---------|
| `get_inventory_data` | Ejecuta las 5 queries oficiales (Q1-Q5) y cachea el resultado |
| `run_inventory_sql` | SELECT ad-hoc de solo lectura (máx. 100 filas) para preguntas puntuales |
| `build_inventory_report` | Genera el HTML oficial (template determinístico), lo guarda en `reports/` y lo cachea |
| `send_report_email` | Envía el último HTML generado vía SendGrid |

El HTML y los datos se cachean en módulo (`lastData` / `lastHtml`) para que el modelo no copie payloads grandes entre turnos.

## Datos: SAP HANA (esquema TRESB)

- `TRESB."BI_MAESTROART"`: maestro de artículos ("ItemCode", "OnHand", "PrecioCompraUnitario", "Status", "ItmsGrpNam", "ArtInventariable")
- `TRESB."BI_Salidas+Integrador"`: salidas ("Fecha", "Motivo BAJA", "Costo Total", "Codigo SKU", "Nombre SKU")

Reglas SQL HANA: columnas/vistas SIEMPRE entre comillas dobles; `ADD_DAYS(CURRENT_DATE, -7)` para fechas relativas; `SELECT TOP n` para limitar. HANA devuelve alias en MAYÚSCULAS y números como texto — `normalizeRow` uniforma las claves a MAYÚSCULAS.

## Variables de Entorno

| Variable | Propósito | Obligatoria |
|----------|-----------|-------------|
| `ANTHROPIC_API_KEY` | API key de Anthropic | Sí |
| `HANA_HOST` / `HANA_PORT` / `HANA_USER` / `HANA_PASS` | Conexión SAP HANA | Sí (puerto default 30015) |
| `SENDGRID_API_KEY` | API key de SendGrid | Sí |
| `REPORT_FROM_EMAIL` | Email remitente | Sí |
| `REPORT_RECIPIENTS` | Destinatarios (CSV) | Sí |
| `LLM_MODEL` | Modelo Claude (default `claude-sonnet-4-6`) | No |

## Comandos

```bash
npm run chat             # Chat interactivo (comandos: /report, /new, /help, /exit)
npm run test:connection  # Prueba HANA + las 5 queries
npm run report-preview   # Envía reports/report-preview.html por email
npm run build            # tsc → dist/
```

En el chat, `/report` dispara el flujo completo: datos → análisis → HTML → email → resumen ejecutivo.

## Convenciones

- TypeScript estricto, ESM (`"type": "module"`, imports con extensión `.js`)
- Español en logs, prompts y comentarios; inglés en nombres de código
- Sin SDKs pesados: SendGrid vía fetch nativo, HANA vía `hdb`
- El template HTML del reporte es determinístico (no lo genera el LLM) para formato consistente en email
