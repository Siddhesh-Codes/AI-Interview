// ============================================================
// Email Service — Gmail SMTP via Nodemailer
// Send interview invitations and admin notifications
// No domain verification needed — just a Gmail App Password
// ============================================================

import nodemailer from 'nodemailer';

// Create reusable transporter
function getTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn('[Email] SMTP_USER / SMTP_PASS not configured, skipping email');
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
  } as any);
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) return false;

  const from = process.env.SMTP_FROM || process.env.SMTP_USER || '';

  console.log(`[Email] Sending to ${options.to} from "${from}" — subject: "${options.subject}"`);

  try {
    const info = await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    console.log(`[Email] ✓ Sent successfully! Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('[Email] Failed to send:', error);
    return false;
  }
}

// ============================================================
// Interview Invitation Email
// ============================================================

export async function sendInterviewInvite(params: {
  to: string;
  candidateName: string;
  roleName: string;
  companyName: string;
  interviewUrl: string;
  expiresAt: string;
}): Promise<boolean> {
  const { to, candidateName, roleName, companyName, interviewUrl, expiresAt } = params;

  const expiryDate = new Date(expiresAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 16px;">
        <tr>
          <td align="center" valign="middle" style="width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#7c3aed,#6366f1);text-align:center;">
            <span style="color:#fff;font-weight:800;font-size:18px;line-height:56px;">AI</span>
          </td>
        </tr>
      </table>
      <h1 style="color:#fff;font-size:22px;font-weight:700;margin:0 0 4px;">Interview Invitation</h1>
      <p style="color:rgba(255,255,255,0.4);font-size:14px;margin:0;">${companyName}</p>
    </div>

    <!-- Card -->
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px;margin-bottom:24px;">
      <p style="color:rgba(255,255,255,0.7);font-size:15px;line-height:1.6;margin:0 0 20px;">
        Hi <strong style="color:#fff;">${candidateName}</strong>,
      </p>
      <p style="color:rgba(255,255,255,0.6);font-size:14px;line-height:1.6;margin:0 0 24px;">
        You've been invited to complete an AI-powered voice interview for the
        <strong style="color:#a855f7;">${roleName}</strong> position.
        The interview is automated — you'll answer questions using your microphone and camera.
      </p>

      <!-- Details -->
      <div style="background:rgba(255,255,255,0.03);border-radius:12px;padding:16px;margin-bottom:24px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="color:rgba(255,255,255,0.4);font-size:13px;">Duration</span>
          <span style="color:#fff;font-size:13px;font-weight:500;">15–30 minutes</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="color:rgba(255,255,255,0.4);font-size:13px;">Position</span>
          <span style="color:#fff;font-size:13px;font-weight:500;">${roleName}</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="color:rgba(255,255,255,0.4);font-size:13px;">Deadline</span>
          <span style="color:#fff;font-size:13px;font-weight:500;">${expiryDate}</span>
        </div>
      </div>

      <!-- CTA Button -->
      <a href="${interviewUrl}" style="display:block;text-align:center;padding:14px 24px;background:linear-gradient(135deg,#7c3aed,#6366f1);color:#fff;font-size:15px;font-weight:600;text-decoration:none;border-radius:12px;">
        Start Your Interview →
      </a>
    </div>

    <!-- Requirements -->
    <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="color:rgba(255,255,255,0.5);font-size:13px;font-weight:600;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.5px;">Before You Start</p>
      <ul style="color:rgba(255,255,255,0.5);font-size:13px;line-height:1.8;margin:0;padding-left:18px;">
        <li>Use a <strong style="color:rgba(255,255,255,0.7);">desktop/laptop</strong> with Chrome or Edge browser</li>
        <li>Enable your <strong style="color:rgba(255,255,255,0.7);">camera</strong> and <strong style="color:rgba(255,255,255,0.7);">microphone</strong></li>
        <li>Find a <strong style="color:rgba(255,255,255,0.7);">quiet environment</strong> with stable internet</li>
        <li>Do not switch tabs during the interview</li>
      </ul>
    </div>

    <!-- Footer -->
    <p style="color:rgba(255,255,255,0.2);font-size:12px;text-align:center;margin:0;">
      This link is unique to you. Do not share it with anyone.
    </p>
  </div>
</body>
</html>`;

  return sendEmail({
    to,
    subject: `Interview Invitation: ${roleName} at ${companyName}`,
    html,
  });
}

// ============================================================
// Admin Welcome Email
// ============================================================

export async function sendAdminWelcome(params: {
  to: string;
  name: string;
  role: string;
  loginUrl: string;
  tempPassword: string;
}): Promise<boolean> {
  const { to, name, role, loginUrl, tempPassword } = params;

  const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin',
    org_admin: 'Organization Admin',
    interviewer: 'Interviewer',
    reviewer: 'Reviewer',
  };

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 16px;">
        <tr>
          <td align="center" valign="middle" style="width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#7c3aed,#6366f1);text-align:center;">
            <span style="color:#fff;font-weight:800;font-size:18px;line-height:56px;">AI</span>
          </td>
        </tr>
      </table>
      <h1 style="color:#fff;font-size:22px;font-weight:700;margin:0 0 4px;">Welcome to the Team</h1>
    </div>

    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px;margin-bottom:24px;">
      <p style="color:rgba(255,255,255,0.7);font-size:15px;line-height:1.6;margin:0 0 20px;">
        Hi <strong style="color:#fff;">${name}</strong>,
      </p>
      <p style="color:rgba(255,255,255,0.6);font-size:14px;line-height:1.6;margin:0 0 24px;">
        An admin account has been created for you with <strong style="color:#a855f7;">${roleLabels[role] || role}</strong> access.
      </p>

      <div style="background:rgba(255,255,255,0.03);border-radius:12px;padding:16px;margin-bottom:24px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="color:rgba(255,255,255,0.4);font-size:13px;">Email</span>
          <span style="color:#fff;font-size:13px;font-family:monospace;">${to}</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="color:rgba(255,255,255,0.4);font-size:13px;">Temporary Password</span>
          <span style="color:#fff;font-size:13px;font-family:monospace;">${tempPassword}</span>
        </div>
      </div>

      <a href="${loginUrl}" style="display:block;text-align:center;padding:14px 24px;background:linear-gradient(135deg,#7c3aed,#6366f1);color:#fff;font-size:15px;font-weight:600;text-decoration:none;border-radius:12px;">
        Sign In to Dashboard →
      </a>
    </div>

    <p style="color:rgba(255,255,255,0.2);font-size:12px;text-align:center;margin:0;">
      Please change your password after your first login.
    </p>
  </div>
</body>
</html>`;

  return sendEmail({
    to,
    subject: 'Your Admin Account Has Been Created',
    html,
  });
}
