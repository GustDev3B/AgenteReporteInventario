# AgentInventarios3B

Agente conversacional de reportes de **inventario perpetuo** para Tiendas 3B. El usuario chatea con el agente, el agente consulta **SAP HANA**, construye el reporte HTML oficial y lo envia por correo via **SendGrid**.

Construido con el [Claude Agent SDK](https://github.com/anthropics/claude-agent-sdk) de Anthropic.

## Caracteristicas

- Chat interactivo en espanol con contexto acumulado por sesion
- Consultas a SAP HANA (esquema `TRESB`) con 5 queries oficiales de inventario
- SQL ad-hoc de solo lectura para preguntas puntuales
- Generacion de reporte HTML deterministico (no generado por el LLM)
- Envio de reportes por email via SendGrid
- Comando `/report` para disparar el flujo completo desde el chat
- Ejecucion automatica diaria via GitHub Actions

## Requisitos

- Node.js >= 18
- Acceso a SAP HANA (esquema `TRESB`)
- API keys de Anthropic y SendGrid

## Instalacion

```bash
npm install
cp .env.example .env
# Editar .env con las credenciales reales
```

## Variables de entorno

| Variable | Descripcion | Obligatoria |
|----------|-------------|-------------|
| `ANTHROPIC_API_KEY` | API key de Anthropic | Si |
| `HANA_HOST` | Host del servidor SAP HANA | Si |
| `HANA_PORT` | Puerto SAP HANA (default: `30015`) | No |
| `HANA_USER` | Usuario SAP HANA | Si |
| `HANA_PASS` | Contrasena SAP HANA | Si |
| `SENDGRID_API_KEY` | API key de SendGrid | Si |
| `REPORT_FROM_EMAIL` | Email remitente (verificado en SendGrid) | Si |
| `REPORT_RECIPIENTS` | Destinatarios separados por coma | Si |
| `LLM_MODEL` | Modelo Claude a usar (default: `claude-sonnet-4-6`) | No |

## Uso

```bash
# Chat interactivo
npm run chat
```

Comandos disponibles dentro del chat:

| Comando | Accion |
|---------|--------|
| `/report` | Flujo completo: datos, analisis, HTML, email, resumen |
| `/new` | Nueva conversacion (limpia contexto) |
| `/help` | Muestra ayuda |
| `/exit` | Sale del chat |

## Otros comandos

```bash
# Verificar conexion a HANA y ejecutar las 5 queries oficiales
npm run test:connection

# Reportes batch (sin chat)
npm run report-1    # Reporte de inventario tipo 1
npm run report-2    # Reporte de inventario tipo 2
npm run report-3    # Reporte de inventario tipo 3
npm run report-4    # Reporte de mermas + envio por email

# Enviar el ultimo HTML generado por email
npm run report-email

# Preview: envia reports/report-preview.html por email (desarrollo)
npm run report-preview

# Compilar TypeScript
npm run build
```

## Arquitectura

```
src/
├── config.ts                  # Validacion de ENV vars con zod
├── index.ts                   # Entry point (modo chat)
├── test-connection.ts         # Prueba de conexion HANA + las 5 queries
├── report-preview.ts          # Envia reports/report-preview.html por email
├── agent/
│   ├── index.ts               # Opciones del query() del SDK
│   ├── prompts.ts             # System prompt (dominio inventarios)
│   └── tools.ts               # MCP server en proceso con 4 tools
├── tools/
│   ├── hana.ts                # Conexion SAP HANA + queries Q1-Q5 + SQL ad-hoc
│   └── sendgrid.ts            # Envio de emails via SendGrid
├── templates/
│   └── report-template.ts     # HTML oficial del reporte
└── modes/
    └── chat.ts                # CLI interactiva (readline + streaming)
```

### Herramientas del agente (MCP en proceso)

| Tool | Funcion |
|------|---------|
| `get_inventory_data` | Ejecuta las 5 queries oficiales (Q1-Q5) y cachea el resultado |
| `run_inventory_sql` | SELECT ad-hoc de solo lectura (max. 100 filas) |
| `build_inventory_report` | Genera el HTML oficial y lo guarda en `reports/` |
| `send_report_email` | Envia el ultimo HTML generado via SendGrid |

## Despliegue

El workflow `.github/workflows/report.yml` ejecuta automaticamente el reporte de mermas todos los dias a las **11:00 AM Bolivia (15:00 UTC)**.

### 1. Agregar los secrets en GitHub

Ir a **Settings > Secrets and variables > Actions > New repository secret** y agregar las variables listadas en la seccion [Variables de entorno](#variables-de-entorno).

### 2. Cambiar el horario del cron

Editar la linea `cron` en `.github/workflows/report.yml`:

```yaml
on:
  schedule:
    - cron: "0 15 * * *"  # minuto hora dia mes dia_semana (UTC)
```

Ejemplos utiles:

| Hora Bolivia (UTC-4) | Cron UTC |
|---|---|
| 07:00 AM | `0 11 * * *` |
| 09:30 AM | `30 13 * * *` |
| 06:00 PM | `0 22 * * *` |
| Solo lunes a viernes | `30 13 * * 1-5` |

### 3. Disparar una ejecucion manual

Desde GitHub: **Actions > Reporte de Mermas > Run workflow**.

Desde la terminal con GitHub CLI:

```bash
gh workflow run report.yml
```
