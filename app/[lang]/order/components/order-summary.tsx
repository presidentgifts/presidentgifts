"use client";

import {Button} from "@/components/ui/button";
import {useBasketStore} from "@/lib/set-basket.storage";
import {getCurrencyCode, getPriceFor} from "@/hooks/price-helpers";
import {formatCurrency} from "@/hooks/formatPrice";
import {useUiText} from "@/provider/ui-text-provider";

export default function OrderSummary({isSubmitting = false}: { isSubmitting?: boolean }) {
    const {items} = useBasketStore();
    const ui = useUiText();
    const t = ui.order;

    const code = getCurrencyCode();

    const totalQuantity = items.reduce((acc, item) => acc + (item.quantity ?? 0), 0);

    const subtotal = items.reduce((acc, item) => {
        const row = getPriceFor(item.price, code);
        return acc + ((row?.price ?? 0) * (item.quantity ?? 1));
    }, 0);

    const formattedSubtotal = formatCurrency({
        currency: {code} as never,
        price: subtotal,
    });

    return (
        <div className="w-full  md:max-w-sm max-w-full border rounded-[4px] p-6 space-y-4 h-[350px]  text-gray-800 sticky top-20 right-0">
            <h2 className="text-lg font-semibold">{t.summaryTitle}</h2>

            <div className="space-y-2">
                <div className="flex justify-between">
                    <span>{t.quantity}</span>
                    <span className="font-semibold">{totalQuantity} {ui.common.pcs}</span>
                </div>

                <div className="flex justify-between">
                    <span>{t.productsPrice}</span>
                    <span className="font-semibold">{formattedSubtotal}</span>
                </div>

                <hr/>

                <div className="flex justify-between text-lg font-semibold">
                    <span>{t.total}:</span>
                    <span>{formattedSubtotal}</span>
                </div>
            </div>

            <Button variant="default" type="submit" className="w-full" disabled={isSubmitting || items.length === 0}>
                {isSubmitting ? t.submitting : t.submit}
            </Button>
        </div>
    );
}
