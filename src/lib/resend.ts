import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (resendClient) {
    return resendClient;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  resendClient = new Resend(apiKey);
  return resendClient;
}

export async function sendOtpEmail(params: {
  to: string;
  code: string;
  ttlSeconds: number;
}): Promise<void> {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new Error("RESEND_FROM_EMAIL is not configured");
  }

  const minutes = Math.max(1, Math.ceil(params.ttlSeconds / 60));
  const client = getResendClient();

  await client.emails.send({
    from,
    to: params.to,
    subject: "Your Flash Card sign-in code",
    text: `Your Flash Card sign-in code is ${params.code}. It expires in ${minutes} minute(s). If you did not request this, you can ignore this email.`,
  });
}
