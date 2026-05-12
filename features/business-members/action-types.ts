export type BusinessMemberInviteActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  inviteLink?: string;
};

export type BusinessMemberAction = (
  state: BusinessMemberInviteActionState,
  formData: FormData,
) => Promise<BusinessMemberInviteActionState>;

