"use client";

import { useEffect, useMemo, useState } from "react";
import {
  APP_MODULE_LABELS,
  APP_MODULES,
  APP_ROLE_LABELS,
  APP_ROLES,
  type AppModule,
  type AppRole,
} from "@/lib/auth/constants";
import { createDefaultPermissionRows } from "@/lib/auth/permissions";
import type { ModulePermission, WorkspaceUserListItem } from "@/lib/auth/types";

type UsersResponse = {
  users: WorkspaceUserListItem[];
  currentUsers: number;
  maxUsers: number;
};

const statusLabels: Record<WorkspaceUserListItem["status"], string> = {
  invited: "Convidado",
  active: "Ativo",
  suspended: "Suspenso",
  removed: "Removido",
};

function sortUsers(users: WorkspaceUserListItem[]) {
  return [...users].sort((left, right) => {
    const leftName = (left.fullName || left.email || "").toLowerCase();
    const rightName = (right.fullName || right.email || "").toLowerCase();
    return leftName.localeCompare(rightName, "pt-BR");
  });
}

export default function UsersManagementClient() {
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<WorkspaceUserListItem[]>([]);
  const [currentUsers, setCurrentUsers] = useState(0);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [maxUsers, setMaxUsers] = useState(10);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFullName, setInviteFullName] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("viewer");
  const [inviteMfaRequired, setInviteMfaRequired] = useState(false);
  const [invitePermissions, setInvitePermissions] = useState<ModulePermission[]>(
    createDefaultPermissionRows("viewer"),
  );

  async function fetchUsers() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const payload = (await response.json()) as UsersResponse | { error?: string };

      if (!response.ok) {
        setError(
          "error" in payload && payload.error
            ? payload.error
            : "Não foi possível carregar os usuários.",
        );
        setLoading(false);
        return;
      }

      const data = payload as UsersResponse;
      setUsers(sortUsers(data.users));
      setCurrentUsers(data.currentUsers);
      setMaxUsers(data.maxUsers);
      setLoading(false);
    } catch {
      setError("Não foi possível carregar os usuários.");
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return users;
    }

    return users.filter((user) => {
      const haystack = [user.fullName, user.email, APP_ROLE_LABELS[user.role]]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [search, users]);

  function updateUserState(
    memberId: string,
    updater: (current: WorkspaceUserListItem) => WorkspaceUserListItem,
  ) {
    setUsers((currentUsers) =>
      currentUsers.map((user) => (user.id === memberId ? updater(user) : user)),
    );
  }

  function handleInviteRoleChange(role: AppRole) {
    setInviteRole(role);
    setInvitePermissions(createDefaultPermissionRows(role));
  }

  function updateInvitePermission(
    module: AppModule,
    field: "canView" | "canEdit",
    value: boolean,
  ) {
    setInvitePermissions((current) =>
      current.map((permission) => {
        if (permission.module !== module) return permission;

        if (field === "canView" && !value) {
          return { ...permission, canView: false, canEdit: false };
        }

        if (field === "canEdit" && value) {
          return { ...permission, canView: true, canEdit: true };
        }

        return { ...permission, [field]: value };
      }),
    );
  }

  function updateRowPermission(
    memberId: string,
    module: AppModule,
    field: "canView" | "canEdit",
    value: boolean,
  ) {
    updateUserState(memberId, (user) => ({
      ...user,
      permissions: user.permissions.map((permission) => {
        if (permission.module !== module) return permission;

        if (field === "canView" && !value) {
          return { ...permission, canView: false, canEdit: false };
        }

        if (field === "canEdit" && value) {
          return { ...permission, canView: true, canEdit: true };
        }

        return { ...permission, [field]: value };
      }),
    }));
  }

  async function inviteUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyId("invite");
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: inviteEmail,
          fullName: inviteFullName,
          role: inviteRole,
          mfaRequired: inviteMfaRequired,
          permissions: invitePermissions,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      setBusyId(null);

      if (!response.ok) {
        setError(payload.error || "Não foi possível enviar o convite.");
        return;
      }

      setNotice("Convite enviado com sucesso.");
      setInviteEmail("");
      setInviteFullName("");
      setInviteRole("viewer");
      setInviteMfaRequired(false);
      setInvitePermissions(createDefaultPermissionRows("viewer"));
      setShowInviteForm(false);
      await fetchUsers();
    } catch {
      setBusyId(null);
      setError("Não foi possível enviar o convite.");
    }
  }

  async function saveUser(user: WorkspaceUserListItem) {
    setBusyId(user.id);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: user.fullName,
          role: user.role,
          status: user.status,
          mfaRequired: user.mfaRequired,
          permissions: user.permissions,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      setBusyId(null);

      if (!response.ok) {
        setError(payload.error || "Não foi possível salvar o usuário.");
        return;
      }

      setNotice(`Alterações salvas para ${user.fullName || user.email}.`);
      await fetchUsers();
    } catch {
      setBusyId(null);
      setError("Não foi possível salvar o usuário.");
    }
  }

  async function triggerPasswordReset(user: WorkspaceUserListItem) {
    setBusyId(`${user.id}:reset`);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: "POST",
      });

      const payload = (await response.json()) as { error?: string };

      setBusyId(null);

      if (!response.ok) {
        setError(
          payload.error || "Não foi possível enviar o e-mail de redefinição.",
        );
        return;
      }

      setNotice(`E-mail de redefinição enviado para ${user.email}.`);
    } catch {
      setBusyId(null);
      setError("Não foi possível enviar o e-mail de redefinição.");
    }
  }

  async function removeUser(user: WorkspaceUserListItem) {
    const confirmed = window.confirm(
      `Remover ${user.fullName || user.email} do dashboard? O histórico será preservado.`,
    );

    if (!confirmed) return;

    setBusyId(`${user.id}:remove`);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });

      const payload = (await response.json()) as { error?: string };

      setBusyId(null);

      if (!response.ok) {
        setError(payload.error || "Não foi possível remover o usuário.");
        return;
      }

      setNotice("Usuário removido do dashboard.");
      await fetchUsers();
    } catch {
      setBusyId(null);
      setError("Não foi possível remover o usuário.");
    }
  }

  if (loading) {
    return (
      <div className="card-surface rounded-[2rem] px-6 py-10 text-sm text-white/65">
        Carregando usuários e permissões...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="card-surface rounded-[2rem] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-white/55">
              {currentUsers} de {maxUsers} usuários em uso neste workspace.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowInviteForm((value) => !value)}
            className="h-11 rounded-full bg-[#3f80ea] px-5 text-sm font-medium text-white transition hover:brightness-110"
          >
            {showInviteForm ? "Fechar" : "+ Adicionar usuário"}
          </button>
        </div>

        {showInviteForm ? (
          <form onSubmit={inviteUser} className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-white/70">Nome</label>
              <input
                value={inviteFullName}
                onChange={(event) => setInviteFullName(event.target.value)}
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm"
                placeholder="Nome do usuário"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/70">E-mail</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm"
                placeholder="usuario@empresa.com.br"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/70">Papel</label>
              <select
                value={inviteRole}
                onChange={(event) =>
                  handleInviteRoleChange(event.target.value as AppRole)
                }
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm"
              >
                {APP_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {APP_ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </div>

            <label className="mt-7 flex items-center gap-3 text-sm text-white/75">
              <input
                type="checkbox"
                checked={inviteMfaRequired}
                onChange={(event) => setInviteMfaRequired(event.target.checked)}
              />
              Exigir 2FA neste usuário
            </label>

            <div className="md:col-span-2">
              <p className="mb-3 text-sm font-medium text-white/80">
                Permissões por módulo
              </p>
              <div className="overflow-hidden rounded-2xl border border-white/10">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-white/5 text-white/60">
                    <tr>
                      <th className="px-4 py-3">Módulo</th>
                      <th className="px-4 py-3">Visualizar</th>
                      <th className="px-4 py-3">Editar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {APP_MODULES.map((module) => {
                      const permission = invitePermissions.find(
                        (item) => item.module === module,
                      )!;

                      return (
                        <tr key={module} className="border-t border-white/10">
                          <td className="px-4 py-3">
                            {APP_MODULE_LABELS[module]}
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={permission.canView}
                              onChange={(event) =>
                                updateInvitePermission(
                                  module,
                                  "canView",
                                  event.target.checked,
                                )
                              }
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={permission.canEdit}
                              onChange={(event) =>
                                updateInvitePermission(
                                  module,
                                  "canEdit",
                                  event.target.checked,
                                )
                              }
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={busyId === "invite" || currentUsers >= maxUsers}
                className="h-11 rounded-2xl bg-[linear-gradient(90deg,#38e038_0%,#0465cd_100%)] px-5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyId === "invite" ? "Enviando convite..." : "Convidar usuário"}
              </button>
            </div>
          </form>
        ) : null}
      </section>

      <section className="card-surface rounded-[2rem] p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, e-mail ou perfil"
            className="h-11 w-full max-w-md rounded-full border border-white/10 bg-white/5 px-5 text-sm"
          />
        </div>

        {notice ? (
          <div className="mb-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
            {notice}
          </div>
        ) : null}

        {error ? (
          <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="min-w-[1080px] w-full text-left text-sm">
            <thead className="bg-white/5 text-white/55">
              <tr>
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Perfil</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">2FA</th>
                {APP_MODULES.map((module) => (
                  <th key={module} className="px-4 py-3">
                    {APP_MODULE_LABELS[module]}
                  </th>
                ))}
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-t border-white/10 align-top">
                  <td className="px-4 py-4">
                    <input
                      value={user.fullName ?? ""}
                      onChange={(event) =>
                        updateUserState(user.id, (current) => ({
                          ...current,
                          fullName: event.target.value,
                        }))
                      }
                      placeholder="Nome do usuário"
                      className="mb-2 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm"
                    />
                    <p className="text-sm text-white/65">{user.email}</p>
                  </td>

                  <td className="px-4 py-4">
                    <select
                      value={user.role}
                      onChange={(event) => {
                        const nextRole = event.target.value as AppRole;
                        updateUserState(user.id, (current) => ({
                          ...current,
                          role: nextRole,
                          permissions: createDefaultPermissionRows(nextRole),
                        }));
                      }}
                      className="h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-sm"
                    >
                      {APP_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {APP_ROLE_LABELS[role]}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="px-4 py-4">
                    <select
                      value={user.status}
                      onChange={(event) =>
                        updateUserState(user.id, (current) => ({
                          ...current,
                          status: event.target.value as WorkspaceUserListItem["status"],
                        }))
                      }
                      className="h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-sm"
                    >
                      {(["invited", "active", "suspended"] as const).map((status) => (
                        <option key={status} value={status}>
                          {statusLabels[status]}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="px-4 py-4">
                    <label className="flex items-center gap-2 text-sm text-white/75">
                      <input
                        type="checkbox"
                        checked={user.mfaRequired}
                        onChange={(event) =>
                          updateUserState(user.id, (current) => ({
                            ...current,
                            mfaRequired: event.target.checked,
                          }))
                        }
                      />
                      Obrigatório
                    </label>
                  </td>

                  {APP_MODULES.map((module) => {
                    const permission = user.permissions.find(
                      (item) => item.module === module,
                    )!;

                    return (
                      <td key={module} className="px-4 py-4">
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-xs text-white/70">
                            <input
                              type="checkbox"
                              checked={permission.canView}
                              onChange={(event) =>
                                updateRowPermission(
                                  user.id,
                                  module,
                                  "canView",
                                  event.target.checked,
                                )
                              }
                            />
                            Ver
                          </label>
                          <label className="flex items-center gap-2 text-xs text-white/70">
                            <input
                              type="checkbox"
                              checked={permission.canEdit}
                              onChange={(event) =>
                                updateRowPermission(
                                  user.id,
                                  module,
                                  "canEdit",
                                  event.target.checked,
                                )
                              }
                            />
                            Editar
                          </label>
                        </div>
                      </td>
                    );
                  })}

                  <td className="px-4 py-4">
                    <div className="flex min-w-[170px] flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => void saveUser(user)}
                        disabled={busyId === user.id}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm transition hover:border-white/20 hover:bg-white/10"
                      >
                        {busyId === user.id ? "Salvando..." : "Salvar"}
                      </button>

                      <button
                        type="button"
                        onClick={() => void triggerPasswordReset(user)}
                        disabled={busyId === `${user.id}:reset`}
                        className="rounded-xl border border-[#3f80ea]/30 bg-[#3f80ea]/10 px-3 py-2 text-sm text-[#b8d4ff] transition hover:bg-[#3f80ea]/20"
                      >
                        {busyId === `${user.id}:reset` ? "Enviando..." : "Resetar senha"}
                      </button>

                      <button
                        type="button"
                        onClick={() => void removeUser(user)}
                        disabled={busyId === `${user.id}:remove`}
                        className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-200 transition hover:bg-red-400/15"
                      >
                        {busyId === `${user.id}:remove` ? "Removendo..." : "Remover"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!filteredUsers.length ? (
            <div className="px-4 py-8 text-sm text-white/55">
              Nenhum usuário encontrado para o filtro informado.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}