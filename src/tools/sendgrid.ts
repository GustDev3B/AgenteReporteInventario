import { config } from "../config.js";

interface EmailContent {
  type: "text/html" | "text/plain";
  value: string;
}

interface PersonalizationEmail {
  email: string;
  name?: string;
}

interface Personalization {
  to: PersonalizationEmail[];
  subject: string;
}

interface SendGridMailPayload {
  personalizations: Personalization[];
  from: PersonalizationEmail;
  content: EmailContent[];
  reply_to?: PersonalizationEmail;
}

interface SendGridErrorResponse {
  errors?: Array<{
    message: string;
    field?: string;
  }>;
}

export async function sendReport(
  htmlContent: string,
  subject: string,
  recipients: string[]
): Promise<{ success: boolean; message: string; recipientCount: number }> {
  if (recipients.length === 0) {
    throw new Error("No hay destinatarios especificados");
  }

  const payload: SendGridMailPayload = {
    personalizations: [
      {
        to: recipients.map((email) => ({
          email,
        })),
        subject,
      },
    ],
    from: {
      email: config.REPORT_FROM_EMAIL,
      name: "AgentInventarios3B - Reporte de Inventario",
    },
    content: [
      {
        type: "text/html",
        value: htmlContent,
      },
    ],
  };

  console.log(`📧 Enviando reporte a ${recipients.length} destinatario(s)...`);
  console.log(`   Remitente: ${config.REPORT_FROM_EMAIL}`);
  console.log(`   Asunto: "${subject}"`);
  console.log(`   Destinatarios: ${recipients.join(", ")}`);

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 202) {
      const message = `Reporte enviado exitosamente a ${recipients.length} destinatario(s)`;
      console.log(`✓ ${message}`);
      return {
        success: true,
        message,
        recipientCount: recipients.length,
      };
    }

    if (!response.ok) {
      const errorData = (await response.json()) as SendGridErrorResponse;
      const errorMessage = errorData.errors
        ?.map((e) => `${e.field || "error"}: ${e.message}`)
        .join(", ");

      throw new Error(
        `SendGrid API error (${response.status}): ${errorMessage || response.statusText}`
      );
    }

    throw new Error(`Respuesta inesperada: ${response.status}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error al enviar reporte: ${errorMsg}`);
    throw new Error(`Failed to send report: ${errorMsg}`);
  }
}
