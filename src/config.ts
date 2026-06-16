import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY es requerido"),
  INVENTORY_API_URL: z.string().url("INVENTORY_API_URL debe ser una URL válida"),
  INVENTORY_API_KEY: z.string().min(1, "INVENTORY_API_KEY es requerido"),
  SENDGRID_API_KEY: z.string().min(1, "SENDGRID_API_KEY es requerido"),
  REPORT_FROM_EMAIL: z
    .string()
    .email("REPORT_FROM_EMAIL debe ser un email válido"),
  REPORT_RECIPIENTS: z.string().min(1, "REPORT_RECIPIENTS es requerido"),
  LLM_MODEL: z.string().default("claude-sonnet-4-6"),
});

type Config = z.infer<typeof envSchema>;

function validateConfig(): Config {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("❌ Errores de configuración:");
    parsed.error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    });
    process.exit(1);
  }

  return parsed.data;
}

export const config = validateConfig();

export function getReportRecipients(): string[] {
  return config.REPORT_RECIPIENTS.split(",")
    .map((email) => email.trim())
    .filter((email) => email.length > 0);
}
