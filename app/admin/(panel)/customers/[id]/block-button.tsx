"use client";

import {useState} from "react";
import {Ban, CheckCircle2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {ConfirmDialog, useAdminAction} from "@/components/admin/kit";
import {format, type AdminDictionary} from "@/lib/admin-i18n";
import {setCustomerActiveAction} from "@/app/admin/sales-actions";

export function CustomerBlockButton({texts, id, name, isActive}: { texts: AdminDictionary; id: string; name: string; isActive: boolean }) {
    const t = texts.customersPage;
    const [confirming, setConfirming] = useState(false);
    const {run, pending} = useAdminAction(texts);

    if (!isActive) {
        return (
            <Button variant="outline" size="lg" disabled={pending} onClick={() => run(() => setCustomerActiveAction(id, true), {success: texts.actions.saved})}>
                <CheckCircle2 className="size-4"/>
                {t.unblock}
            </Button>
        );
    }

    return (
        <>
            <Button variant="outline" size="lg" className="text-red-600" onClick={() => setConfirming(true)}>
                <Ban className="size-4"/>
                {t.block}
            </Button>
            <ConfirmDialog
                open={confirming}
                onOpenChange={setConfirming}
                title={format(t.blockTitle, {name})}
                description={t.blockText}
                confirmLabel={t.block}
                texts={texts}
                onConfirm={async () => {
                    const result = await run(() => setCustomerActiveAction(id, false), {success: texts.actions.saved});
                    if (result.ok) setConfirming(false);
                }}
            />
        </>
    );
}
