"use client";

import {
  assignableOrganisationRoles,
  canManageOrganisationRoles,
  organisationRoleCodes,
  organisationRoles,
  type OrganisationRole,
} from "@pbcoms/shared";
import { Button } from "@pbcoms/ui";
import { useRouter } from "next/navigation";
import React, { useState, type FormEvent } from "react";

export type OrganisationMember = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: OrganisationRole;
  createdAt: Date | string;
};

function RoleControl({
  member,
  disabled,
  save,
}: {
  member: OrganisationMember;
  disabled: boolean;
  save: (id: string, role: OrganisationRole) => Promise<void>;
}) {
  const [role, setRole] = useState(member.role);
  return (
    <form
      className="mt-3 flex flex-wrap items-end gap-3"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        void save(member.id, role);
      }}
    >
      <label className="grid min-w-0 max-w-full gap-1 break-all text-sm font-medium">
        Role for {member.email}
        <select
          aria-label={`Role for ${member.email}`}
          className="min-w-0 max-w-full rounded-md border border-slate-300 bg-white p-2"
          value={role}
          disabled={disabled}
          onChange={(event) => setRole(event.target.value as OrganisationRole)}
        >
          {assignableOrganisationRoles.map((code) => (
            <option key={code} value={code}>
              {organisationRoles[code].label}
            </option>
          ))}
        </select>
      </label>
      <Button
        disabled={disabled || role === member.role}
        type="submit"
        aria-label={`Save role for ${member.email}`}
      >
        Save role
      </Button>
    </form>
  );
}

export function MemberRoleManagement({
  organisationId,
  members,
  currentUserId,
  currentRole,
}: {
  organisationId: string;
  members: OrganisationMember[];
  currentUserId: string;
  currentRole: OrganisationRole;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const canManage = canManageOrganisationRoles(currentRole);
  const ownerCount = members.filter((member) => member.role === "owner").length;
  async function save(membershipId: string, role: OrganisationRole) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/organisations/${organisationId}/members/${membershipId}/role`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ role }),
          cache: "no-store",
        },
      );
      const result = (await response.json()) as { ok?: boolean; code?: string };
      if (response.ok && result.ok) {
        setMessage("Role updated successfully.");
        router.refresh();
      } else
        setMessage(
          result.code === "last_owner"
            ? "The final owner cannot be demoted."
            : result.code === "ownership_protected"
              ? "Ownership changes are not available here."
              : result.code === "not_found"
                ? "Access or membership changed. Refresh the page before trying again."
                : "The role could not be updated. Check your access and try again.",
        );
    } catch {
      setMessage("The role could not be updated. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <p className="mt-3 text-sm text-slate-600">
        Your role: <strong>{organisationRoles[currentRole].label}</strong>.{" "}
        {canManage
          ? "You can change non-owner roles."
          : "Only owners can change roles. Your roster access is read-only."}
      </p>
      <p className="mt-2 text-sm text-slate-600">
        Ownership changes and member removal are not available here. Every
        organisation must retain an owner.
      </p>
      <p role="status" aria-live="polite" className="mt-4 text-sm">
        {message}
      </p>
      <ul aria-label="Organisation members" className="mt-4 grid gap-4">
        {members.map((member) => (
          <li
            key={member.id}
            className="min-w-0 rounded-lg border border-slate-200 p-4"
          >
            <h2 className="break-words font-semibold">
              {member.name}
              {member.userId === currentUserId && " (you)"}
            </h2>
            <p className="break-all text-sm text-slate-600">{member.email}</p>
            <p className="mt-2 text-sm">
              Current role:{" "}
              <strong>{organisationRoles[member.role].label}</strong>
            </p>
            <p className="text-xs text-slate-500">
              Joined{" "}
              {new Date(member.createdAt).toLocaleDateString("en-GB", {
                timeZone: "UTC",
              })}
            </p>
            {member.role === "owner" ? (
              <p className="mt-3 text-sm text-slate-600">
                {ownerCount === 1
                  ? "The final owner cannot be demoted."
                  : "Existing owners are protected; ownership changes are deferred."}
              </p>
            ) : (
              canManage && (
                <RoleControl
                  key={`${member.id}:${member.role}`}
                  member={member}
                  disabled={busy}
                  save={save}
                />
              )
            )}
          </li>
        ))}
      </ul>
      <section className="mt-10" aria-label="Role definitions">
        <h2 className="text-xl font-semibold">About organisation roles</h2>
        <p className="mt-2 text-sm text-slate-600">
          Role names do not grant new operational permissions. Business
          onboarding and invitation management remain owner-only.
        </p>
        <dl className="mt-4 grid gap-3">
          {organisationRoleCodes.map((code) => (
            <div key={code}>
              <dt className="font-medium">{organisationRoles[code].label}</dt>
              <dd className="text-sm text-slate-600">
                {organisationRoles[code].description}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
