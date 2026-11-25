"use client";

import {ReactNode, useState, useTransition} from "react";
import {Check, Copy, Loader2} from "lucide-react";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Label} from "@/components/ui/label";
import {cn} from "@/lib/utils";
import type {AdminDictionary} from "@/lib/admin-i18n";
import type {ActionResult} from "@/server/admin-action";

export function PageHeader({title, subtitle, children}: { title: string; subtitle?: string; children?: ReactNode }) {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                {subtitle && <p className="mt-1 max-w-2xl text-sm text-neutral-500">{subtitle}</p>}
            </div>
            {children && <div className="flex shrink-0 gap-2">{children}</div>}
        </div>
    );
}

export function Card({children, className}: { children: ReactNode; className?: string }) {
    return <section className={cn("rounded-lg border border-neutral-200 bg-white", className)}>{children}</section>;
}

export function StatusBadge({active, texts}: { active: boolean; texts: AdminDictionary }) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
                active ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500",
            )}
        >
            <span className={cn("size-1.5 rounded-full", active ? "bg-emerald-500" : "bg-neutral-400")}/>
            {active ? texts.common.active : texts.common.inactive}
        </span>
    );
}

export function EmptyRow({colSpan, text}: { colSpan: number; text: string }) {
    return (
        <tr>
            <td colSpan={colSpan} className="px-5 py-10 text-center text-sm text-neutral-500">
                {text}
            </td>
        </tr>
    );
}

export const th = "px-5 py-3 font-medium";
export const td = "px-5 py-3.5";
export const theadClass = "bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500";

/** A labelled form field with an optional hint below. */
export function Field({label, htmlFor, hint, error, children}: {
    label: string;
    htmlFor?: string;
    hint?: string;
    error?: boolean;
    children: ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <Label htmlFor={htmlFor} className={cn(error && "text-red-600")}>{label}</Label>
            {children}
            {hint && <p className="text-xs text-neutral-500">{hint}</p>}
        </div>
    );
}

/** A switch-like checkbox row: label on the left, toggle on the right. */
export function ToggleRow({label, hint, checked, onChange, disabled}: {
    label: string;
    hint?: string;
    checked: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <label className={cn("flex items-start justify-between gap-4 rounded-md border border-neutral-200 p-3", disabled ? "opacity-60" : "cursor-pointer")}>
            <span>
                <span className="block text-sm font-medium">{label}</span>
                {hint && <span className="mt-0.5 block text-xs text-neutral-500">{hint}</span>}
            </span>
            <Switch checked={checked} onChange={onChange} disabled={disabled} label={label}/>
        </label>
    );
}

export function Switch({checked, onChange, disabled, label}: {
    checked: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
    label?: string;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={cn(
                "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed",
                checked ? "bg-primary" : "bg-neutral-300",
            )}
        >
            <span className={cn("inline-block size-4 rounded-full bg-white shadow transition-transform", checked ? "translate-x-4.5" : "translate-x-0.5")}/>
        </button>
    );
}

/**
 * Runs a server action and shows its error as a toast in the panel language.
 * `run` resolves to the result so callers can react to success.
 */
export function useAdminAction(texts: AdminDictionary) {
    const [pending, startTransition] = useTransition();
    const [errorField, setErrorField] = useState<string | undefined>();

    function run<T>(action: () => Promise<ActionResult<T>>, options?: { success?: string }) {
        return new Promise<ActionResult<T>>((resolve) => {
            startTransition(async () => {
                let result: ActionResult<T>;
                try {
                    result = await action();
                } catch (error) {
                    console.error(error);
                    result = {ok: false, error: "server"};
                }
                if (result.ok) {
                    setErrorField(undefined);
                    if (options?.success) toast.success(options.success);
                } else {
                    setErrorField(result.field);
                    toast.error(texts.errors[result.error] ?? texts.errors.server);
                }
                resolve(result);
            });
        });
    }

    return {run, pending, errorField, clearError: () => setErrorField(undefined)};
}

export function SubmitButton({pending, children, className, variant}: {
    pending: boolean;
    children: ReactNode;
    className?: string;
    variant?: "default" | "destructive" | "outline";
}) {
    return (
        <Button type="submit" size="lg" variant={variant} disabled={pending} className={className}>
            {pending && <Loader2 className="size-4 animate-spin"/>}
            {children}
        </Button>
    );
}

/** A confirmation dialog for destructive actions. */
export function ConfirmDialog({open, onOpenChange, title, description, confirmLabel, onConfirm, texts, destructive = true}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    confirmLabel: string;
    onConfirm: () => Promise<unknown> | void;
    texts: AdminDictionary;
    destructive?: boolean;
}) {
    const [pending, setPending] = useState(false);

    return (
        <AlertDialog open={open} onOpenChange={(value) => !pending && onOpenChange(value)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={pending}>{texts.actions.cancel}</AlertDialogCancel>
                    <Button
                        size="lg"
                        variant={destructive ? "destructive" : "default"}
                        disabled={pending}
                        onClick={async () => {
                            setPending(true);
                            try {
                                await onConfirm();
                            } finally {
                                setPending(false);
                            }
                        }}
                    >
                        {pending && <Loader2 className="size-4 animate-spin"/>}
                        {confirmLabel}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

/** Shows a generated password once, with a copy button. */
export function PasswordDialog({password, name, onClose, texts}: {
    password: string | null;
    name: string;
    onClose: () => void;
    texts: AdminDictionary;
}) {
    const [copied, setCopied] = useState(false);

    return (
        <Dialog open={password !== null} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{texts.staffPage.passwordTitle}</DialogTitle>
                    <DialogDescription>{texts.staffPage.passwordText.replace("{name}", name)}</DialogDescription>
                </DialogHeader>
                <div className="flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-3">
                    <code className="flex-1 select-all break-all font-mono text-base">{password}</code>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                            await navigator.clipboard.writeText(password ?? "");
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                        }}
                    >
                        {copied ? <Check className="size-4"/> : <Copy className="size-4"/>}
                        {copied ? texts.actions.copied : texts.actions.copy}
                    </Button>
                </div>
                <DialogFooter>
                    <Button size="lg" onClick={onClose}>{texts.actions.close}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
