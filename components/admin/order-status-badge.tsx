import {cn} from "@/lib/utils";
import type {AdminDictionary} from "@/lib/admin-i18n";
import type {OrderStatus} from "@/server/db/schema";

const STYLES: Record<OrderStatus, string> = {
    new: "bg-blue-50 text-blue-700",
    confirmed: "bg-indigo-50 text-indigo-700",
    in_progress: "bg-amber-50 text-amber-700",
    shipped: "bg-violet-50 text-violet-700",
    completed: "bg-emerald-50 text-emerald-700",
    cancelled: "bg-neutral-100 text-neutral-500",
};

export function OrderStatusBadge({status, texts}: { status: OrderStatus; texts: AdminDictionary }) {
    return (
        <span className={cn("inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium", STYLES[status])}>
            {texts.orderStatus[status]}
        </span>
    );
}
