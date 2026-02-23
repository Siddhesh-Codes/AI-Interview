// ============================================================
// Email Service — Resend (Free: 3,000 emails/month)
// ============================================================

import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_ENABLED = !!RESEND_API_KEY && RESEND_API_KEY !== 'dummy';

let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (!EMAIL_ENABLED) return null;
  if (!_resend) {
    _resend = new Resend(RESEND_API_KEY);
  }
  return _resend;
}
const FROM_EMAIL = process.env.EMAIL_FROM || 'onboarding@resend.dev';
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'AI Interview Platform';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function sendInterviewInvite(params: {
  to: string;
  candidateName: string;
  roleName: string;
  inviteToken: string;
  expiresAt: string;
  orgName: string;
}) {
  const resend = getResend();
  if (!resend) {
    console.log(`[Email] Skipped — RESEND_API_KEY not configured. Interview link: ${APP_URL}/interview/${params.inviteToken}`);
    return;
  }

  const interviewUrl = `${APP_URL}/interview/${params.inviteToken}`;

  await resend.emails.send({
    from: `${APP_NAME} <${FROM_EMAIL}>`,
    to: params.to,
    subject: `Interview Invitation — ${params.roleName} at ${params.orgName}`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f17; color: #ffffff; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #7c3aed, #6366f1); padding: 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; color: white;">Interview Invitation</h1>
          <p style="margin: 8px 0 0; opacity: 0.9; color: #e0e0e0;">${params.orgName}</p>
        </div>
        <div style="padding: 32px;">
          <p style="color: #d1d5db;">Hi ${params.candidateName},</p>
          <p style="color: #d1d5db;">You've been invited to complete an AI-powered voice interview for the <strong style="color: #a855f7;">${params.roleName}</strong> position.</p>

          <div style="background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.3); border-radius: 8px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 8px; color: #9ca3af; font-size: 14px;">What to expect:</p>
            <ul style="margin: 0; padding-left: 20px; color: #d1d5db;">
              <li>5 interview questions read by AI voice</li>
              <li>Record your spoken answers</li>
              <li>AI evaluates each response</li>
              <li>Takes approximately 15-20 minutes</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${interviewUrl}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #6366f1); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
              Start Interview →
            </a>
          </div>

          <p style="color: #6b7280; font-size: 13px; text-align: center;">
            This link expires on ${new Date(params.expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendInterviewCompleted(params: {
  to: string;
  candidateName: string;
  roleName: string;
  orgName: string;
}) {
  const resend = getResend();
  if (!resend) {
    console.log('[Email] Skipped interview-completed email — RESEND_API_KEY not configured.');
    return;
  }
  await resend.emails.send({
    from: `${APP_NAME} <${FROM_EMAIL}>`,
    to: params.to,
    subject: `Interview Completed — ${params.roleName}`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f17; color: #ffffff; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; color: white;">✓ Interview Completed</h1>
        </div>
        <div style="padding: 32px;">
          <p style="color: #d1d5db;">Hi ${params.candidateName},</p>
          <p style="color: #d1d5db;">Thank you for completing your interview for the <strong style="color: #22c55e;">${params.roleName}</strong> position at ${params.orgName}.</p>
          <p style="color: #d1d5db;">Your responses are being reviewed by our team. We'll be in touch soon.</p>
          <p style="color: #6b7280; font-size: 13px; margin-top: 32px;">Best regards,<br/>${params.orgName} Hiring Team</p>
        </div>
      </div>
    `,
  });
}

export async function sendReviewNotification(params: {
  to: string;
  reviewerName: string;
  candidateName: string;
  roleName: string;
  sessionId: string;
  orgSlug: string;
}) {
  const resend = getResend();
  if (!resend) {
    console.log('[Email] Skipped review-notification email — RESEND_API_KEY not configured.');
    return;
  }
  const reviewUrl = `${APP_URL}/${params.orgSlug}/interviews/${params.sessionId}`;

  await resend.emails.send({
    from: `${APP_NAME} <${FROM_EMAIL}>`,
    to: params.to,
    subject: `New Interview Ready for Review — ${params.candidateName}`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f17; color: #ffffff; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #3b82f6, #6366f1); padding: 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; color: white;">Interview Ready for Review</h1>
        </div>
        <div style="padding: 32px;">
          <p style="color: #d1d5db;">Hi ${params.reviewerName},</p>
          <p style="color: #d1d5db;"><strong style="color: #60a5fa;">${params.candidateName}</strong> has completed their interview for <strong>${params.roleName}</strong>.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${reviewUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #6366f1); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Review Interview →
            </a>
          </div>
        </div>
      </div>
    `,
  });
}
