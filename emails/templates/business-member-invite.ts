import {
  businessMemberRoleMeta,
  type BusinessMemberAssignableRole,
} from "@/lib/business-members";
import {
  emailBrand,
  escapeHtml,
  renderDetailsCard,
  renderEmailLayout,
} from "./shared";

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
  const subject = `${inviterName} invited you to join ${businessName} on Requo`;
  const text = `Hi,

${inviterName} invited you to join ${businessName} on Requo as a ${roleLabel}.

Open your invite here:
${inviteUrl}

If you were not expecting this invite, you can ignore this email.`;

  const html = renderEmailLayout({
    label: "Invite",
    title: `Join ${businessName}`,
    preheader: `${inviterName} invited you to join ${businessName} on Requo.`,
    footerContext: businessName,
    cta: {
      href: inviteUrl,
      label: "Open invite",
    },
    children: `
      <p style="margin: 0; color: ${emailBrand.foregroundColor}; font-size: 15px; line-height: 24px;">
        <strong>${escapeHtml(inviterName)}</strong> invited you to join <strong>${escapeHtml(businessName)}</strong> on Requo.
      </p>
      ${renderDetailsCard("Invite details", [
        { label: "Business", value: businessName },
        { label: "Role", value: roleLabel },
      ])}
      <p style="margin: 18px 0 0; color: ${emailBrand.mutedTextColor}; font-size: 13px; line-height: 20px;">If you were not expecting this invite, you can ignore this email.</p>
    `,
  });

  return {
    subject,
    text,
    html,
  };
}
