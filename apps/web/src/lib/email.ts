import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import nodemailer from "nodemailer";
import type { AuthEnvironment } from "./auth-environment";

export interface AuthenticationEmail {
  to: string;
  subject: string;
  text: string;
}

export interface EmailDelivery {
  send(message: AuthenticationEmail): Promise<void>;
}

export function createEmailDelivery(
  environment: AuthEnvironment,
): EmailDelivery {
  if (environment.EMAIL_DELIVERY_MODE === "smtp") {
    const transporter = nodemailer.createTransport({
      host: environment.SMTP_HOST,
      port: Number(environment.SMTP_PORT),
      secure: Number(environment.SMTP_PORT) === 465,
      auth: { user: environment.SMTP_USER, pass: environment.SMTP_PASSWORD },
    });

    return {
      async send(message) {
        await transporter.sendMail({ ...message, from: environment.SMTP_FROM });
      },
    };
  }

  return {
    async send(message) {
      const directory = resolve(process.cwd(), "../../.auth-emails");
      await mkdir(directory, { recursive: true });
      const filename = `${Date.now()}-${crypto.randomUUID()}.txt`;
      await writeFile(
        resolve(directory, filename),
        `To: ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n`,
        { encoding: "utf8", mode: 0o600 },
      );
    },
  };
}
