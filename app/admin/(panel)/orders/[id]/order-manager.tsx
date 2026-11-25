"use client";

import {FormEvent, useState} from "react";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Textarea} from "@/components/ui/textarea";
import {Field, SubmitButton, useAdminAction} from "@/components/admin/kit";
import type {AdminDictionary} from "@/lib/admin-i18n";
import type {OrderStatus} from "@/server/db/schema";
import {updateOrderAction} from "@/app/admin/sales-actions";

const STATUSES: OrderStatus[] = ["new", "confirmed", "in_progress", "shipped", "completed", "cancelled"];

export function OrderManager({texts, orderId, status: initial}: { texts: AdminDictionary; orderId: number; status: OrderStatus }) {
    const t = texts.ordersPage;
    const [status, setStatus] = useState<OrderStatus>(initial);
    const [note, setNote] = useState("");
    const {run, pending} = useAdminAction(texts);
    const changed = status !== initial || note.trim() !== "";

    async function submit(event: FormEvent) {
        event.preventDefault();
        if (!changed) return;
        const result = await run(() => updateOrderAction(orderId, {status, note}), {success: texts.actions.saved});
        if (result.ok) setNote("");
    }

    return (
        <form onSubmit={submit} className="space-y-4">
            <Field label={t.changeStatus}>
                <Select value={status} onValueChange={(v) => setStatus(v as OrderStatus)}>
                    <SelectTrigger className="w-full"><SelectValue/></SelectTrigger>
                    <SelectContent>
                        {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{texts.orderStatus[s]}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </Field>
            <Field label={t.note} htmlFor="order-note">
                <Textarea id="order-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={2000} placeholder={t.notePlaceholder}/>
            </Field>
            <SubmitButton pending={pending} className={changed ? "w-full" : "pointer-events-none w-full opacity-50"}>{t.update}</SubmitButton>
        </form>
    );
}
