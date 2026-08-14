import nodemailer from "nodemailer";

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_APP_PASSWORD = process.env.EMAIL_APP_PASSWORD;

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!EMAIL_USER || !EMAIL_APP_PASSWORD) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: EMAIL_USER, pass: EMAIL_APP_PASSWORD },
    });
  }
  return transporter;
}

export interface EmailContent {
  subject: string;
  html: string;
  /** Plain-text alternative — sending HTML with no text part is itself a spam-filter signal,
   * on top of everything else a brand-new sending account is already fighting against. */
  text: string;
}

/**
 * Best-effort email send — never throws. A missing SMTP config or a delivery failure just
 * logs and returns false; nothing that depends on this (registration, cheering a party
 * member) should ever fail or block just because a notification email couldn't go out.
 */
export async function sendEmail(params: { to: string } & EmailContent): Promise<boolean> {
  const t = getTransporter();
  if (!t) {
    console.warn("[email] EMAIL_USER/EMAIL_APP_PASSWORD not set — skipping email to", params.to);
    return false;
  }

  try {
    await t.sendMail({
      from: `"ASCEND" <${EMAIL_USER}>`,
      replyTo: EMAIL_USER,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    return true;
  } catch (err) {
    console.error("[email] Failed to send to", params.to, err);
    return false;
  }
}

// Plain, light-background, minimal-styling shell. A heavily-themed dark HTML template with no
// plain-text alternative reads as "marketing/automated" to spam filters — deliberately kept
// simple here since that matters more for a brand-new sending account than visual polish does.
function emailShell(title: string, bodyHtml: string): string {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
      <p style="font-size: 12px; letter-spacing: 0.1em; color: #666666; text-transform: uppercase; margin: 0 0 8px;">ASCEND</p>
      <h1 style="font-size: 18px; margin: 0 0 16px;">${title}</h1>
      ${bodyHtml}
      <p style="font-size: 12px; color: #888888; margin-top: 24px; border-top: 1px solid #eeeeee; padding-top: 12px;">
        Sent by ASCEND. Reply to this email if you have questions.
      </p>
    </div>
  `;
}

export function welcomeEmail(name: string): EmailContent {
  return {
    subject: "Welcome to ASCEND",
    html: emailShell(
      `Welcome, ${name}`,
      `<p style="font-size: 14px; line-height: 1.6;">Your account is ready. Complete onboarding, pick a routine, and log your first workout to start earning XP.</p>`
    ),
    text: `Welcome to ASCEND, ${name}.\n\nYour account is ready. Complete onboarding, pick a routine, and log your first workout to start earning XP.`,
  };
}

export function cheerEmail(actorName: string): EmailContent {
  return {
    subject: `${actorName} sent you a cheer`,
    html: emailShell(
      "You've been cheered on",
      `<p style="font-size: 14px; line-height: 1.6;"><strong>${actorName}</strong> noticed you haven't started today's workout yet and sent you a quick cheer.</p>
       <p style="font-size: 14px; line-height: 1.6;">Open ASCEND when you get a chance.</p>`
    ),
    text: `${actorName} noticed you haven't started today's workout yet and sent you a quick cheer.\n\nOpen ASCEND when you get a chance.`,
  };
}
