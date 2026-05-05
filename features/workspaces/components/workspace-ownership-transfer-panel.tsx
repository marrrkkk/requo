"use client";

import { useState } from "react";
import { ShieldAlert, UserRoundCog } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import { useProgressRouter } from "@/hooks/use-progress-router";
import type { WorkspaceOwnershipTransferActionState } from "@/features/workspaces/types";

type EligibleMember = {
  membershipId: string;
  name: string;
  email: string;
  role: string;
};

type WorkspaceOwnershipTransferPanelProps = {
  transferAction: (
    state: WorkspaceOwnershipTransferActionState,
    formData: FormData,
  ) => Promise<WorkspaceOwnershipTransferActionState>;
  eligibleMembers: EligibleMember[];
  redirectHref: string;
};

const initialState: WorkspaceOwnershipTransferActionState = {};

export function WorkspaceOwnershipTransferPanel({
  transferAction,
  eligibleMembers,
  redirectHref,
}: WorkspaceOwnershipTransferPanelProps) {
  const router = useProgressRouter();
  const [selectedMembershipId, setSelectedMembershipId] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [state, formAction, isPending] = useActionStateWithSonner(
    transferAction,
    initialState,
  );

  const selectedMember = eligibleMembers.find(
    (m) => m.membershipId === selectedMembershipId,
  );

  const memberOptions = eligibleMembers.map((member) => ({
    label: member.name,
    searchText: `${member.name} ${member.email}`,
    value: member.membershipId,
  }));

  const hasEligibleMembers = eligibleMembers.length > 0;

  // After successful transfer, redirect since the current user is
  // no longer the owner and will lose access to this settings page.
  if (state.success) {
    queueMicrotask(() => router.replace(redirectHref));
  }

  return (
    <>
      <Card className="gap-0 border-border/70 bg-card/97">
        <CardHeader className="gap-2.5 pb-5">
          <CardTitle>Transfer ownership</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 pt-0">
          <Alert>
            <ShieldAlert data-icon="inline-start" />
            <AlertTitle>High-risk action</AlertTitle>
            <AlertDescription>
              Transfer full ownership of this workspace, including billing and
              deletion control. You&apos;ll become an admin after the transfer.
            </AlertDescription>
          </Alert>

          {hasEligibleMembers ? (
            <div className="flex flex-col gap-4">
              <div className="max-w-sm">
                <Combobox
                  id="ownership-transfer-target"
                  options={memberOptions}
                  value={selectedMembershipId}
                  onValueChange={setSelectedMembershipId}
                  placeholder="Select a member..."
                  searchPlaceholder="Search members"
                  renderOption={(option) => {
                    const member = eligibleMembers.find(
                      (m) => m.membershipId === option.value,
                    );

                    return (
                      <div className="min-w-0">
                        <p className="truncate font-medium">{option.label}</p>
                        {member ? (
                          <p className="truncate text-xs text-muted-foreground">
                            {member.email}
                          </p>
                        ) : null}
                      </div>
                    );
                  }}
                />
              </div>

              <div className="dashboard-actions">
                <Button
                  disabled={!selectedMember}
                  onClick={() => setConfirmOpen(true)}
                  type="button"
                  variant="outline"
                >
                  <UserRoundCog data-icon="inline-start" />
                  Transfer ownership
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Invite at least one other member before transferring ownership.
            </p>
          )}
        </CardContent>
      </Card>

      {selectedMember ? (
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Transfer ownership?</DialogTitle>
              <DialogDescription>
                Transfer full workspace ownership to{" "}
                <strong>{selectedMember.name}</strong> ({selectedMember.email}).
                You&apos;ll become an admin and lose owner-level control over
                billing and workspace deletion.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                disabled={isPending}
                onClick={() => setConfirmOpen(false)}
                type="button"
                variant="ghost"
              >
                Cancel
              </Button>
              <form action={formAction}>
                <input
                  name="targetMembershipId"
                  type="hidden"
                  value={selectedMember.membershipId}
                />
                <Button disabled={isPending} type="submit">
                  {isPending ? (
                    <>
                      <Spinner data-icon="inline-start" aria-hidden="true" />
                      Transferring...
                    </>
                  ) : (
                    "Confirm transfer"
                  )}
                </Button>
              </form>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
