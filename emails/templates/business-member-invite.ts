import {
  businessMemberRoleMeta,
  type BusinessMemberAssignableRole,
} from "@/lib/business-members";

type BusinessMemberInviteTemplateInput = {
  businessName: string;
  inviterName: string;
  role: BusinessMemberAssignableRole;
  inviteUrl: string;
};

export function renderBusinessMemberInviteEmail({
  businessName,
  inviterName,
  role,
  inviteUrl,
}: BusinessMemberInviteTemplateInput) {
  const roleLabel = businessMemberRoleMeta[role].label;
  const subject = `${inviterName} invited you to ${businessName} on Requo`;
  const text = `Hi,

${inviterName} invited you to join ${businessName} on Requo as a ${roleLabel}.

Open your invite here:
${inviteUrl}

If you were not expecting this invite, you can ignore this email.`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #172033;">
      <h1 style="font-size: 24px; margin-bottom: 16px;">Join ${businessName} on Requo</h1>
      <p>${inviterName} invited you to join <strong>${businessName}</strong> as a ${roleLabel}.</p>
      <p style="margin: 20px 0;">
        <a href="${inviteUrl}" style="display: inline-block; padding: 12px 18px; border-radius: 12px; background: #2d4ea0; color: #ffffff; text-decoration: none; font-weight: 600;">
          Open invite
        </a>
      </p>
      <p>If you were not expecting this invite, you can ignore this email.</p>
    </div>
  `;

  return {
    subject,
    text,
    html,
  };
}
