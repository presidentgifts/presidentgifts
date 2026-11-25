"use client";

import {FormEvent, useState} from "react";
import {KeyRound, MoreHorizontal, Pencil, Plus, ShieldCheck, UserMinus} from "lucide-react";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Card,
    ConfirmDialog,
    EmptyRow,
    Field,
    PageHeader,
    PasswordDialog,
    StatusBadge,
    SubmitButton,
    td,
    th,
    theadClass,
    ToggleRow,
    useAdminAction,
} from "@/components/admin/kit";
import {format, type AdminDictionary} from "@/lib/admin-i18n";
import {
    createStaffAction,
    removeStaffFromCountryAction,
    resetStaffPasswordAction,
    setStaffRoleAction,
    updateStaffProfileAction,
} from "./actions";

interface Person {
    id: string;
    email: string;
    fullName: string;
    isActive: boolean;
    lastLoginAt: string | null;
}

interface StaffRow extends Person {
    roleKey: string;
    otherCountries: string[];
}

interface RoleOption {
    key: string;
    name: string;
    description: string | null;
}

interface Props {
    texts: AdminDictionary;
    currentUserId: string;
    isSuperAdmin: boolean;
    country: { code: string; name: string };
    staff: StaffRow[];
    superAdmins: Person[];
    roles: RoleOption[];
}

type Editing = { person: Person; roleKey?: string; canEditAccount: boolean };

function formatDate(iso: string | null, never: string) {
    if (!iso) return never;
    return new Date(iso).toLocaleString(undefined, {dateStyle: "medium", timeStyle: "short"});
}

function initials(name: string) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

export function StaffManager({texts, currentUserId, isSuperAdmin, country, staff, superAdmins, roles}: Props) {
    const t = texts.staffPage;
    const [creating, setCreating] = useState<"country" | "super" | null>(null);
    const [editing, setEditing] = useState<Editing | null>(null);
    const [resetting, setResetting] = useState<Person | null>(null);
    const [removing, setRemoving] = useState<Person | null>(null);
    const [shownPassword, setShownPassword] = useState<{ name: string; password: string } | null>(null);
    const {run} = useAdminAction(texts);

    // A country admin can't change accounts of people who also work elsewhere (the server checks this too).
    const canEditAccount = (row: StaffRow) => isSuperAdmin || row.otherCountries.length === 0;

    function personCell(person: Person) {
        return (
            <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-600">
                    {initials(person.fullName)}
                </span>
                <div className="min-w-0">
                    <p className="truncate font-medium">
                        {person.fullName}
                        {person.id === currentUserId && <span className="ml-1.5 text-xs font-normal text-neutral-400">({t.you})</span>}
                    </p>
                    <p className="truncate text-xs text-neutral-500">{person.email}</p>
                </div>
            </div>
        );
    }

    function rowMenu({person, editingValue, removable, accountEditable}: {
        person: Person;
        editingValue: Editing;
        removable: boolean;
        accountEditable: boolean;
    }) {
        if (person.id === currentUserId) return null;
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={texts.actions.edit}>
                        <MoreHorizontal className="size-4"/>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem onSelect={() => setEditing(editingValue)}>
                        <Pencil className="size-4"/>
                        {texts.actions.edit}
                    </DropdownMenuItem>
                    {accountEditable && (
                        <DropdownMenuItem onSelect={() => setResetting(person)}>
                            <KeyRound className="size-4"/>
                            {t.resetPassword}
                        </DropdownMenuItem>
                    )}
                    {removable && (
                        <>
                            <DropdownMenuSeparator/>
                            <DropdownMenuItem onSelect={() => setRemoving(person)} className="text-red-600 focus:text-red-700">
                                <UserMinus className="size-4"/>
                                {texts.actions.remove}
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    return (
        <div className="space-y-8">
            <PageHeader title={t.title} subtitle={format(t.subtitle, {country: country.name})}>
                <Button size="lg" onClick={() => setCreating("country")}>
                    <Plus className="size-4"/>
                    {t.add}
                </Button>
            </PageHeader>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className={theadClass}>
                        <tr>
                            <th className={th}>{texts.fields.fullName}</th>
                            <th className={th}>{texts.fields.role}</th>
                            <th className={th}>{texts.fields.status}</th>
                            <th className={th}>{texts.fields.lastLogin}</th>
                            <th className={th}/>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                        {staff.length === 0 && <EmptyRow colSpan={5} text={t.empty}/>}
                        {staff.map((row) => (
                            <tr key={row.id} className="hover:bg-neutral-50/60">
                                <td className={td}>{personCell(row)}</td>
                                <td className={td}>
                                    <p>{roles.find((r) => r.key === row.roleKey)?.name ?? row.roleKey}</p>
                                    {row.otherCountries.length > 0 && (
                                        <p className="text-xs text-neutral-400">{format(t.alsoIn, {countries: row.otherCountries.join(", ")})}</p>
                                    )}
                                </td>
                                <td className={td}><StatusBadge active={row.isActive} texts={texts}/></td>
                                <td className={`${td} whitespace-nowrap text-neutral-500`}>{formatDate(row.lastLoginAt, texts.fields.never)}</td>
                                <td className={`${td} text-right`}>
                                    {rowMenu({
                                        person: row,
                                        removable: true,
                                        accountEditable: canEditAccount(row),
                                        editingValue: {person: row, roleKey: row.roleKey, canEditAccount: canEditAccount(row)},
                                    })}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {isSuperAdmin && (
                <div className="space-y-4">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <h2 className="flex items-center gap-2 text-lg font-semibold">
                                <ShieldCheck className="size-5 text-neutral-400"/>
                                {t.superAdmins}
                            </h2>
                            <p className="text-sm text-neutral-500">{t.superAdminsHint}</p>
                        </div>
                        <Button variant="outline" size="lg" onClick={() => setCreating("super")}>
                            <Plus className="size-4"/>
                            {t.addSuperAdmin}
                        </Button>
                    </div>
                    <Card className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className={theadClass}>
                                <tr>
                                    <th className={th}>{texts.fields.fullName}</th>
                                    <th className={th}>{texts.fields.status}</th>
                                    <th className={th}>{texts.fields.lastLogin}</th>
                                    <th className={th}/>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100">
                                {superAdmins.map((person) => (
                                    <tr key={person.id} className="hover:bg-neutral-50/60">
                                        <td className={td}>{personCell(person)}</td>
                                        <td className={td}><StatusBadge active={person.isActive} texts={texts}/></td>
                                        <td className={`${td} whitespace-nowrap text-neutral-500`}>{formatDate(person.lastLoginAt, texts.fields.never)}</td>
                                        <td className={`${td} text-right`}>
                                            {rowMenu({person, removable: false, accountEditable: true, editingValue: {person, canEditAccount: true}})}
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            <CreateDialog
                key={creating ?? "closed"}
                texts={texts}
                kind={creating}
                country={country}
                roles={roles}
                onClose={() => setCreating(null)}
                onCreated={(name, result) => {
                    setCreating(null);
                    if (result.existing) toast.success(t.addedExisting);
                    else toast.success(texts.actions.saved);
                    if (result.password) setShownPassword({name, password: result.password});
                }}
            />

            <EditDialog key={editing?.person.id ?? "closed"} texts={texts} value={editing} country={country} roles={roles} onClose={() => setEditing(null)}/>

            <ConfirmDialog
                open={resetting !== null}
                onOpenChange={(open) => !open && setResetting(null)}
                title={format(t.resetTitle, {name: resetting?.fullName ?? ""})}
                description={t.resetText}
                confirmLabel={t.resetPassword}
                destructive={false}
                texts={texts}
                onConfirm={async () => {
                    if (!resetting) return;
                    const result = await run(() => resetStaffPasswordAction(resetting.id));
                    if (result.ok) {
                        setShownPassword({name: resetting.fullName, password: result.data});
                        setResetting(null);
                    }
                }}
            />

            <ConfirmDialog
                open={removing !== null}
                onOpenChange={(open) => !open && setRemoving(null)}
                title={format(t.removeTitle, {name: removing?.fullName ?? "", country: country.name})}
                description={t.removeText}
                confirmLabel={texts.actions.remove}
                texts={texts}
                onConfirm={async () => {
                    if (!removing) return;
                    const result = await run(() => removeStaffFromCountryAction(removing.id), {success: texts.actions.saved});
                    if (result.ok) setRemoving(null);
                }}
            />

            <PasswordDialog
                password={shownPassword?.password ?? null}
                name={shownPassword?.name ?? ""}
                texts={texts}
                onClose={() => setShownPassword(null)}
            />
        </div>
    );
}

function RoleSelect({value, onChange, roles, invalid}: {
    value: string;
    onChange: (value: string) => void;
    roles: RoleOption[];
    invalid?: boolean;
}) {
    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="w-full" aria-invalid={invalid}><SelectValue placeholder="—"/></SelectTrigger>
            <SelectContent>
                {roles.map((role) => (
                    <SelectItem key={role.key} value={role.key}>{role.name}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

function CreateDialog({texts, kind, country, roles, onClose, onCreated}: {
    texts: AdminDictionary;
    kind: "country" | "super" | null;
    country: { code: string; name: string };
    roles: RoleOption[];
    onClose: () => void;
    onCreated: (name: string, result: { password: string | null; existing: boolean }) => void;
}) {
    const t = texts.staffPage;
    const [form, setForm] = useState({email: "", fullName: "", password: "", roleKey: "content_manager"});
    const {run, pending, errorField} = useAdminAction(texts);
    const role = roles.find((r) => r.key === form.roleKey);

    async function submit(event: FormEvent) {
        event.preventDefault();
        const input = kind === "super"
            ? {kind: "super" as const, email: form.email, fullName: form.fullName, password: form.password}
            : {kind: "country" as const, ...form};
        const result = await run(() => createStaffAction(input));
        if (result.ok) onCreated(form.fullName, result.data);
    }

    return (
        <Dialog open={kind !== null} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <form onSubmit={submit} className="space-y-5">
                    <DialogHeader>
                        <DialogTitle>{kind === "super" ? t.superCreateTitle : `${t.createTitle} · ${country.name}`}</DialogTitle>
                        <DialogDescription>{kind === "super" ? t.superAdminsHint : t.createHint}</DialogDescription>
                    </DialogHeader>

                    <Field label={texts.fields.email} htmlFor="staff-email" error={errorField === "email"}>
                        <Input
                            id="staff-email"
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({...form, email: e.target.value})}
                            required
                            autoComplete="off"
                            aria-invalid={errorField === "email"}
                        />
                    </Field>
                    <Field label={texts.fields.fullName} htmlFor="staff-name" error={errorField === "fullName"}>
                        <Input
                            id="staff-name"
                            value={form.fullName}
                            onChange={(e) => setForm({...form, fullName: e.target.value})}
                            required
                            minLength={2}
                            maxLength={128}
                            aria-invalid={errorField === "fullName"}
                        />
                    </Field>
                    {kind === "country" && (
                        <Field label={texts.fields.role} hint={role?.description ?? undefined} error={errorField === "roleKey"}>
                            <RoleSelect value={form.roleKey} onChange={(roleKey) => setForm({...form, roleKey})} roles={roles} invalid={errorField === "roleKey"}/>
                        </Field>
                    )}
                    <Field label={texts.fields.password} htmlFor="staff-password" hint={t.passwordHint} error={errorField === "password"}>
                        <Input
                            id="staff-password"
                            type="text"
                            value={form.password}
                            onChange={(e) => setForm({...form, password: e.target.value})}
                            autoComplete="new-password"
                            minLength={10}
                            maxLength={128}
                            aria-invalid={errorField === "password"}
                        />
                    </Field>

                    <DialogFooter>
                        <Button type="button" variant="outline" size="lg" onClick={onClose}>{texts.actions.cancel}</Button>
                        <SubmitButton pending={pending}>{texts.actions.create}</SubmitButton>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function EditDialog({texts, value, country, roles, onClose}: {
    texts: AdminDictionary;
    value: Editing | null;
    country: { code: string; name: string };
    roles: RoleOption[];
    onClose: () => void;
}) {
    const t = texts.staffPage;
    const person = value?.person;
    const [form, setForm] = useState({
        fullName: person?.fullName ?? "",
        isActive: person?.isActive ?? true,
        roleKey: value?.roleKey ?? "",
    });
    const {run, pending, errorField} = useAdminAction(texts);

    async function submit(event: FormEvent) {
        event.preventDefault();
        if (!value || !person) return;

        if (value.roleKey && form.roleKey !== value.roleKey) {
            const result = await run(() => setStaffRoleAction(person.id, form.roleKey));
            if (!result.ok) return;
        }
        if (value.canEditAccount && (form.fullName !== person.fullName || form.isActive !== person.isActive)) {
            const result = await run(() => updateStaffProfileAction(person.id, {fullName: form.fullName, isActive: form.isActive}));
            if (!result.ok) return;
        }
        toast.success(texts.actions.saved);
        onClose();
    }

    return (
        <Dialog open={value !== null} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <form onSubmit={submit} className="space-y-5">
                    <DialogHeader>
                        <DialogTitle>{t.editTitle}</DialogTitle>
                        <DialogDescription>{person?.email}</DialogDescription>
                    </DialogHeader>

                    <Field label={texts.fields.fullName} htmlFor="edit-name" error={errorField === "fullName"}>
                        <Input
                            id="edit-name"
                            value={form.fullName}
                            onChange={(e) => setForm({...form, fullName: e.target.value})}
                            disabled={!value?.canEditAccount}
                            required
                            minLength={2}
                            maxLength={128}
                        />
                    </Field>
                    {value?.roleKey && (
                        <Field label={texts.fields.role} hint={format(t.roleHint, {country: country.name})}>
                            <RoleSelect value={form.roleKey} onChange={(roleKey) => setForm({...form, roleKey})} roles={roles}/>
                        </Field>
                    )}
                    <ToggleRow
                        label={texts.common.active}
                        hint={value?.canEditAccount ? t.activeHint : texts.errors.otherCountries}
                        checked={form.isActive}
                        disabled={!value?.canEditAccount}
                        onChange={(isActive) => setForm({...form, isActive})}
                    />

                    <DialogFooter>
                        <Button type="button" variant="outline" size="lg" onClick={onClose}>{texts.actions.cancel}</Button>
                        <SubmitButton pending={pending}>{texts.actions.save}</SubmitButton>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
