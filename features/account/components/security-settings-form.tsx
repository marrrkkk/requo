"use client";

import { useActionState, useState } from "react";
import { KeyRound, LogOut, Shield, Trash2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useActionStateWithSuccessToast } from "@/hooks/use-action-state-with-success-toast";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { PasswordInput } from "@/features/auth/components/password-input";
import type {
  AccountDeleteActionState,
  AccountPasswordActionState,
  AccountSecurityView,
  AccountSessionActionState,
} from "@/features/account/types";

type SecuritySettingsFormProps = {
  changePasswordAction: (
    state: AccountPasswordActionState,
    formData: FormData,
  ) => Promise<AccountPasswordActionState>;
  deleteAccountAction: (
    state: AccountDeleteActionState,
    formData: FormData,
  ) => Promise<AccountDeleteActionState>;
  revokeOtherSessionsAction: (
    state: AccountSessionActionState,
    formData: FormData,
  ) => Promise<AccountSessionActionState>;
  security: AccountSecurityView;
  setPasswordAction: (
    state: AccountPasswordActionState,
    formData: FormData,
  ) => Promise<AccountPasswordActionState>;
};

const initialPasswordState: AccountPasswordActionState = {};
const initialSessionState: AccountSessionActionState = {};
const initialDeleteState: AccountDeleteActionState = {};

export function SecuritySettingsForm({
  changePasswordAction,
  deleteAccountAction,
  revokeOtherSessionsAction,
  security,
  setPasswordAction,
}: SecuritySettingsFormProps) {
  const [revokeAfterPasswordChange, setRevokeAfterPasswordChange] = useState(true);
  const [setPasswordState, setPasswordFormAction, isSetPasswordPending] =
    useActionStateWithSuccessToast(setPasswordAction, initialPasswordState);
  const [changePasswordState, changePasswordFormAction, isChangePasswordPending] =
    useActionStateWithSuccessToast(changePasswordAction, initialPasswordState);
  const [sessionState, sessionFormAction, isSessionPending] =
    useActionStateWithSuccessToast(
      revokeOtherSessionsAction,
      initialSessionState,
    );
  const [deleteState, deleteFormAction, isDeletePending] = useActionState(
    deleteAccountAction,
    initialDeleteState,
  );
  const hasPassword = security.hasPassword || Boolean(setPasswordState.success);
  const activeSessionCount =
    sessionState.success ||
    (changePasswordState.success && revokeAfterPasswordChange)
      ? 1
      : security.activeSessionCount;
  const hasOtherSessions = activeSessionCount > 1;

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <section className="section-panel p-6">
          <div className="flex flex-col gap-5">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                {hasPassword ? "Change password" : "Set password"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {hasPassword
                  ? "Update the password used for email sign-in."
                  : "Add password sign-in to this account."}
              </p>
            </div>

            {hasPassword ? (
              <form action={changePasswordFormAction} className="form-stack">
                {changePasswordState.error ? (
                  <Alert variant="destructive">
                    <AlertTitle>We could not update your password.</AlertTitle>
                    <AlertDescription>{changePasswordState.error}</AlertDescription>
                  </Alert>
                ) : null}


                <FieldGroup>
                  <Field
                    data-invalid={
                      Boolean(changePasswordState.fieldErrors?.currentPassword) ||
                      undefined
                    }
                  >
                    <FieldLabel htmlFor="security-current-password">
                      Current password
                    </FieldLabel>
                    <FieldContent>
                      <PasswordInput
                        autoComplete="current-password"
                        disabled={isChangePasswordPending}
                        id="security-current-password"
                        name="currentPassword"
                        placeholder="Enter your current password"
                        required
                      />
                      <FieldError
                        errors={
                          changePasswordState.fieldErrors?.currentPassword?.[0]
                            ? [
                                {
                                  message:
                                    changePasswordState.fieldErrors.currentPassword[0],
                                },
                              ]
                            : undefined
                        }
                      />
                    </FieldContent>
                  </Field>

                  <div className="grid gap-5 lg:grid-cols-2">
                    <Field
                      data-invalid={
                        Boolean(changePasswordState.fieldErrors?.newPassword) ||
                        undefined
                      }
                    >
                      <FieldLabel htmlFor="security-new-password">
                        New password
                      </FieldLabel>
                      <FieldContent>
                        <PasswordInput
                          autoComplete="new-password"
                          disabled={isChangePasswordPending}
                          id="security-new-password"
                          name="newPassword"
                          placeholder="At least 8 characters"
                          required
                        />
                        <FieldError
                          errors={
                            changePasswordState.fieldErrors?.newPassword?.[0]
                              ? [
                                  {
                                    message:
                                      changePasswordState.fieldErrors.newPassword[0],
                                  },
                                ]
                              : undefined
                          }
                        />
                      </FieldContent>
                    </Field>

                    <Field
                      data-invalid={
                        Boolean(changePasswordState.fieldErrors?.confirmPassword) ||
                        undefined
                      }
                    >
                      <FieldLabel htmlFor="security-confirm-password">
                        Confirm password
                      </FieldLabel>
                      <FieldContent>
                        <PasswordInput
                          autoComplete="new-password"
                          disabled={isChangePasswordPending}
                          id="security-confirm-password"
                          name="confirmPassword"
                          placeholder="Re-enter your new password"
                          required
                        />
                        <FieldError
                          errors={
                            changePasswordState.fieldErrors?.confirmPassword?.[0]
                              ? [
                                  {
                                    message:
                                      changePasswordState.fieldErrors
                                        .confirmPassword[0],
                                  },
                                ]
                              : undefined
                          }
                        />
                      </FieldContent>
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel>Session handling</FieldLabel>
                    <FieldContent>
                      <input
                        name="revokeOtherSessions"
                        type="hidden"
                        value={String(revokeAfterPasswordChange)}
                      />
                      <label className="grid gap-4 rounded-2xl border border-border/70 bg-muted/15 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                        <div className="min-w-0 space-y-1">
                          <p className="text-sm font-medium text-foreground">
                            Sign out other sessions
                          </p>
                          <p className="text-sm leading-6 text-muted-foreground">
                            End sessions on other devices after the password change.
                          </p>
                        </div>
                        <Switch
                          checked={revokeAfterPasswordChange}
                          disabled={isChangePasswordPending}
                          onCheckedChange={setRevokeAfterPasswordChange}
                        />
                      </label>
                    </FieldContent>
                  </Field>
                </FieldGroup>

                <div className="flex justify-end">
                  <Button disabled={isChangePasswordPending} type="submit">
                    {isChangePasswordPending ? (
                      <>
                        <Spinner data-icon="inline-start" aria-hidden="true" />
                        Updating password...
                      </>
                    ) : (
                      <>
                        <KeyRound data-icon="inline-start" />
                        Update password
                      </>
                    )}
                  </Button>
                </div>
              </form>
            ) : (
              <form action={setPasswordFormAction} className="form-stack">
                {setPasswordState.error ? (
                  <Alert variant="destructive">
                    <AlertTitle>We could not set your password.</AlertTitle>
                    <AlertDescription>{setPasswordState.error}</AlertDescription>
                  </Alert>
                ) : null}


                <FieldGroup>
                  <Field
                    data-invalid={
                      Boolean(setPasswordState.fieldErrors?.newPassword) || undefined
                    }
                  >
                    <FieldLabel htmlFor="security-set-password">
                      New password
                    </FieldLabel>
                    <FieldContent>
                      <PasswordInput
                        autoComplete="new-password"
                        disabled={isSetPasswordPending}
                        id="security-set-password"
                        name="newPassword"
                        placeholder="At least 8 characters"
                        required
                      />
                      <FieldDescription>
                        This enables email + password sign-in in addition to any connected provider.
                      </FieldDescription>
                      <FieldError
                        errors={
                          setPasswordState.fieldErrors?.newPassword?.[0]
                            ? [
                                {
                                  message:
                                    setPasswordState.fieldErrors.newPassword[0],
                                },
                              ]
                            : undefined
                        }
                      />
                    </FieldContent>
                  </Field>

                  <Field
                    data-invalid={
                      Boolean(setPasswordState.fieldErrors?.confirmPassword) ||
                      undefined
                    }
                  >
                    <FieldLabel htmlFor="security-set-confirm-password">
                      Confirm password
                    </FieldLabel>
                    <FieldContent>
                      <PasswordInput
                        autoComplete="new-password"
                        disabled={isSetPasswordPending}
                        id="security-set-confirm-password"
                        name="confirmPassword"
                        placeholder="Re-enter your new password"
                        required
                      />
                      <FieldError
                        errors={
                          setPasswordState.fieldErrors?.confirmPassword?.[0]
                            ? [
                                {
                                  message:
                                    setPasswordState.fieldErrors.confirmPassword[0],
                                },
                              ]
                            : undefined
                        }
                      />
                    </FieldContent>
                  </Field>
                </FieldGroup>

                <div className="flex justify-end">
                  <Button disabled={isSetPasswordPending} type="submit">
                    {isSetPasswordPending ? (
                      <>
                        <Spinner data-icon="inline-start" aria-hidden="true" />
                        Setting password...
                      </>
                    ) : (
                      <>
                        <KeyRound data-icon="inline-start" />
                        Set password
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
      </section>

      <section className="section-panel p-6">
          <div className="flex flex-col gap-5">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Session security
              </h2>
              <p className="text-sm text-muted-foreground">
                Control who stays signed in to this account.
              </p>
            </div>

            {sessionState.error ? (
              <Alert variant="destructive">
                <AlertTitle>We could not update your sessions.</AlertTitle>
                <AlertDescription>{sessionState.error}</AlertDescription>
              </Alert>
            ) : null}


            <div className="rounded-2xl border border-border/70 bg-muted/15 px-4 py-4">
              <p className="text-sm font-medium text-foreground">
                {hasOtherSessions
                  ? `${activeSessionCount} sessions are active.`
                  : "Only this session is active."}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Sign out every other browser or device while keeping this one open.
              </p>
            </div>

            <form action={sessionFormAction}>
              <Button
                disabled={isSessionPending || !hasOtherSessions}
                type="submit"
                variant="outline"
              >
                {isSessionPending ? (
                  <>
                    <Spinner data-icon="inline-start" aria-hidden="true" />
                    Signing out other sessions...
                  </>
                ) : (
                  <>
                    <LogOut data-icon="inline-start" />
                    Sign out other sessions
                  </>
                )}
              </Button>
            </form>
          </div>
      </section>

      <section className="section-panel border-destructive/25 p-6">
          <div className="flex flex-col gap-5">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Delete account
              </h2>
              <p className="text-sm text-muted-foreground">
                Permanently remove this owner account and its owned workspace data.
              </p>
            </div>

            <Alert variant="destructive">
              <Shield data-icon="inline-start" />
              <AlertTitle>This action is permanent.</AlertTitle>
              <AlertDescription>
                {getDeleteDescription(security.ownedBusinessCount)}
              </AlertDescription>
            </Alert>

            {!hasPassword ? (
              <Alert>
                <AlertTitle>Provider-only sign-in detected</AlertTitle>
                <AlertDescription>
                  This account does not currently use a password. If deletion fails,
                  sign in again and retry from a fresh session.
                </AlertDescription>
              </Alert>
            ) : null}

            {deleteState.error ? (
              <Alert variant="destructive">
                <AlertTitle>We could not delete your account.</AlertTitle>
                <AlertDescription>{deleteState.error}</AlertDescription>
              </Alert>
            ) : null}

            <form action={deleteFormAction} className="form-stack">
              <FieldGroup>
                <Field data-invalid={Boolean(deleteState.fieldErrors?.email) || undefined}>
                  <FieldLabel htmlFor="security-delete-email">
                    Confirm account email
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      autoComplete="email"
                      disabled={isDeletePending}
                      id="security-delete-email"
                      name="email"
                      placeholder={security.email}
                      required
                      type="email"
                    />
                    <FieldDescription>
                      Enter {security.email} to confirm deletion.
                    </FieldDescription>
                    <FieldError
                      errors={
                        deleteState.fieldErrors?.email?.[0]
                          ? [{ message: deleteState.fieldErrors.email[0] }]
                          : undefined
                      }
                    />
                  </FieldContent>
                </Field>

                {hasPassword ? (
                  <Field
                    data-invalid={Boolean(deleteState.fieldErrors?.password) || undefined}
                  >
                    <FieldLabel htmlFor="security-delete-password">
                      Current password
                    </FieldLabel>
                    <FieldContent>
                      <PasswordInput
                        autoComplete="current-password"
                        disabled={isDeletePending}
                        id="security-delete-password"
                        name="password"
                        placeholder="Enter your current password"
                        required
                      />
                      <FieldError
                        errors={
                          deleteState.fieldErrors?.password?.[0]
                            ? [{ message: deleteState.fieldErrors.password[0] }]
                            : undefined
                        }
                      />
                    </FieldContent>
                  </Field>
                ) : null}
              </FieldGroup>

              <div className="flex justify-end">
                <Button
                  disabled={isDeletePending}
                  type="submit"
                  variant="destructive"
                >
                  {isDeletePending ? (
                    <>
                      <Spinner data-icon="inline-start" aria-hidden="true" />
                      Deleting account...
                    </>
                  ) : (
                    <>
                      <Trash2 data-icon="inline-start" />
                      Delete account
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
      </section>
    </div>
  );
}

function getDeleteDescription(ownedBusinessCount: number) {
  if (ownedBusinessCount <= 0) {
    return "Your profile, sessions, and account access will be permanently deleted.";
  }

  return `Your profile, sessions, and ${ownedBusinessCount} owned ${
    ownedBusinessCount === 1 ? "business" : "businesses"
  } will be permanently deleted, including related inquiries, quotes, knowledge files, and uploaded assets.`;
}
