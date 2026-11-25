"use client";

import {Check, RotateCcw} from "lucide-react";
import {Button} from "@/components/ui/button";
import {useAdminAction} from "@/components/admin/kit";
import type {AdminDictionary} from "@/lib/admin-i18n";
import {setInquiryStatusAction} from "@/app/admin/sales-actions";

export function InquiryToggle({texts, id, status}: { texts: AdminDictionary; id: number; status: "new" | "done" }) {
    const {run, pending} = useAdminAction(texts);
    const next = status === "new" ? "done" : "new";
    return (
        <Button
            variant={status === "new" ? "default" : "outline"}
            size="sm"
            disabled={pending}
            className="shrink-0"
            onClick={() => run(() => setInquiryStatusAction(id, next))}
        >
            {status === "new" ? <Check className="size-4"/> : <RotateCcw className="size-4"/>}
            {status === "new" ? texts.inquiriesPage.markDone : texts.inquiriesPage.markNew}
        </Button>
    );
}
