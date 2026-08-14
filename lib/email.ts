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

function getAppUrl(): string {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

export interface EmailContent {
  subject: string;
  html: string;
  /** Plain-text alternative — sending HTML with no text part is itself a spam-filter signal. */
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
      from: `"LevelUp" <${EMAIL_USER}>`,
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

/**
 * Clean, modern light-themed shell for LevelUp email notifications.
 */
function emailShell(title: string, subtitle: string, bodyHtml: string): string {
  const appUrl = getAppUrl();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #0f172a;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; table-layout: fixed; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 0 15px 0 rgba(2, 132, 199, 0.08);">
          
          <!-- Top Accent Line -->
          <tr>
            <td height="5" style="background: linear-gradient(90deg, #0284c7, #06b6d4, #f97316);"></td>
          </tr>

          <!-- LevelUp Header (No ASCEND) -->
          <tr>
            <td style="padding: 28px 32px 20px; text-align: center; border-bottom: 1px solid #f1f5f9;">
              <span style="font-family: 'Courier New', Courier, monospace; font-size: 11px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #0284c7; display: block; margin-bottom: 6px;">
                ✦ ${subtitle} ✦
              </span>
              <h1 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 0.12em; color: #0f172a; text-transform: uppercase;">
                LEVELUP
              </h1>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 28px 32px 24px;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 4px; font-family: 'Courier New', Courier, monospace; font-size: 10px; letter-spacing: 0.15em; color: #64748b; text-transform: uppercase;">
                LEVELUP SYSTEM &bull; GYM NUDGE SERVICE
              </p>
              <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                Level Up Your Training &bull; <a href="${appUrl}" style="color: #0284c7; font-weight: 600; text-decoration: none;">Open App</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function welcomeEmail(name: string): EmailContent {
  const appUrl = getAppUrl();
  return {
    subject: "Welcome to LevelUp — Ready to Train!",
    html: emailShell(
      "Welcome to LevelUp",
      "GET STARTED",
      `
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="margin: 0 0 12px; font-size: 20px; font-weight: 700; color: #0f172a;">
          Welcome, <span style="color: #0284c7;">${name}</span>!
        </h2>
        <p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.6;">
          Your account is ready. Pick your workout routine, head to the gym, and start logging your workouts to earn XP and level up.
        </p>
      </div>

      <div style="text-align: center; margin: 28px 0 12px;">
        <a href="${appUrl}/dashboard" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #0284c7, #06b6d4); color: #ffffff; text-decoration: none; font-weight: 800; font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase; border-radius: 12px; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35);">
          START YOUR WORKOUT &rarr;
        </a>
      </div>
      `
    ),
    text: `Welcome to LevelUp, ${name}.\n\nYour account is ready. Complete onboarding, pick a routine, and log your first workout to start earning XP.\n\nEnter LevelUp: ${appUrl}/dashboard`,
  };
}

export function otpEmail(code: string): EmailContent {
  const appUrl = getAppUrl();

  const bodyHtml = `
    <div style="text-align: center; margin-bottom: 8px;">
      <h2 style="margin: 0 0 12px; font-size: 20px; font-weight: 700; color: #0f172a;">
        Verify your email
      </h2>
      <p style="margin: 0 0 24px; font-size: 14px; color: #475569; line-height: 1.6;">
        Enter this code to finish setting up your LevelUp account.
      </p>
    </div>

    <div style="text-align: center; margin: 0 0 20px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px;">
        <tr>
          <td style="padding: 18px 36px;">
            <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 0.35em; color: #0284c7;">
              ${code}
            </span>
          </td>
        </tr>
      </table>
    </div>

    <p style="margin: 0 0 24px; font-size: 13px; color: #64748b; text-align: center; line-height: 1.5;">
      This code expires in 10 minutes. Didn&rsquo;t request it? You can safely ignore this email.
    </p>
  `;

  return {
    subject: `${code} is your LevelUp verification code`,
    html: emailShell("Verify Your Email", "EMAIL VERIFICATION", bodyHtml),
    text: `Your LevelUp verification code is: ${code}\n\nEnter this code in the app to finish setting up your account. It expires in 10 minutes.\n\nDidn't request this? You can safely ignore this email.\n\n${appUrl}`,
  };
}

const CHEER_QUOTES = [
  "Lace up your shoes, head to the gym, and crush your sets today!",
  "The hardest rep is walking through the gym door. Get moving!",
  "No excuses today! The weights are waiting for you at the gym.",
  "Your party is putting in the sweat at the gym — don't fall behind!",
  "Show up to the gym today, level up tomorrow. Every set counts!",
  "Consistency is built at the gym. Step up and clear today's workout!",
  "Transformations happen in the gym. Get in there and get it done!",
];

function pickCheerQuote(): string {
  return CHEER_QUOTES[Math.floor(Math.random() * CHEER_QUOTES.length)];
}

export function cheerEmail(actorName: string): EmailContent {
  const quote = pickCheerQuote();
  const appUrl = getAppUrl();

  const bodyHtml = `
    <!-- Hero Cheer Banner -->
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background: linear-gradient(135deg, #fff7ed, #ffedd5); border: 1px solid #fed7aa; border-radius: 9999px; padding: 8px 20px; margin-bottom: 20px;">
        <span style="font-size: 13px; font-weight: 800; letter-spacing: 0.1em; color: #ea580c; text-transform: uppercase;">
          🏋️‍♂️ TIME TO HIT THE GYM
        </span>
      </div>

      <h2 style="margin: 0 0 12px; font-size: 22px; font-weight: 800; color: #0f172a; line-height: 1.3;">
        <span style="color: #0284c7;">${actorName}</span> is calling you to the gym!
      </h2>

      <p style="margin: 0; font-size: 15px; color: #475569; line-height: 1.6;">
        <strong style="color: #0f172a;">${actorName}</strong> noticed you haven't logged your workout today. It's time to head to the gym, get your sets done, and keep your streak strong!
      </p>
    </div>

    <!-- Motivational Gym Directive Box -->
    <div style="margin: 24px 0;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background: #f0f9ff; border-left: 4px solid #0284c7; border-radius: 8px; border-top: 1px solid #e0f2fe; border-right: 1px solid #e0f2fe; border-bottom: 1px solid #e0f2fe;">
        <tr>
          <td style="padding: 18px 22px;">
            <div style="font-family: 'Courier New', Courier, monospace; font-size: 10px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #0284c7; margin-bottom: 6px;">
              [ GYM MOTIVATION ]
            </div>
            <p style="margin: 0; font-size: 14px; font-style: italic; color: #0369a1; line-height: 1.6; font-weight: 500;">
              &ldquo;${quote}&rdquo;
            </p>
          </td>
        </tr>
      </table>
    </div>

    <!-- Call to Action Button -->
    <div style="text-align: center; margin: 28px 0 12px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto;">
        <tr>
          <td align="center" style="border-radius: 12px; background: linear-gradient(135deg, #0284c7, #06b6d4); box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35);">
            <a href="${appUrl}/quest" target="_blank" style="display: inline-block; padding: 15px 36px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 800; letter-spacing: 0.12em; color: #ffffff; text-decoration: none; text-transform: uppercase; border-radius: 12px;">
              HIT THE GYM NOW &rarr;
            </a>
          </td>
        </tr>
      </table>
    </div>
  `;

  return {
    subject: `${actorName} is calling you to the gym! 🏋️‍♂️🔥`,
    html: emailShell(`${actorName} called you to the gym`, "PARTY GYM NUDGE", bodyHtml),
    text: `${actorName} noticed you haven't logged your workout today. It's time to head to the gym, get your sets done, and keep your streak strong!\n\n"${quote}"\n\nHit the gym and log your workout: ${appUrl}/quest`,
  };
}
