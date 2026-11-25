"use client";

import {useState} from "react";
import {Card, CardContent} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Tooltip, TooltipTrigger,} from "@/components/ui/tooltip";
import {OrderCardItem} from "../order-item-card/order-item-card";
import {AnimatePresence, motion} from "framer-motion";
import {OrderDataInterface} from "@/interface/order-data/order-data";
import {formatDate} from "@/hooks/format-data";
import {useUiText} from "@/provider/ui-text-provider";
import {useParams} from "next/navigation";
import {normalizeLocale} from "@/lib/i18n-config";

export default function OrderCard({orderData}: { orderData: OrderDataInterface }) {
    const [showAll, setShowAll] = useState(false);
    const ui = useUiText();
    const t = ui.account.orders;
    const {lang} = useParams<{ lang: string }>();

    return (
        <Card className="mx-auto p-4 space-y-4 border border-amber-50 mb-4">
            <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p className="text-base font-semibold text-primary">
                    {t.orderId}: <span className="text-primary">{orderData.id}</span>
                </p>

                <div className="flex items-center justify-between">
                    <span>{t.status}</span>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button className={"w-[90px] p-0"} variant="link">
                                {orderData.status}
                            </Button>
                        </TooltipTrigger>
                    </Tooltip>
                </div>

                <div className="flex justify-between">
                    <span>{t.createdAt}</span>
                    <span>{formatDate(orderData.createdAt, normalizeLocale(lang))}</span>
                </div>

                <div className="flex justify-between">
                    <span>{t.address}</span>
                    <span className="font-medium text-right max-w-[60%]">{orderData?.address?.location}</span>
                </div>

                <div className="flex justify-between">
                    <span>{t.quantity}</span>
                    <span>{orderData.items.length} {ui.common.pcs}</span>
                </div>

                <div className="flex justify-between font-semibold mb-5 text-black">
                    <span>{t.total}:</span>
                    <span>{new Intl.NumberFormat("en-US", {maximumFractionDigits: 2}).format(orderData.totalAmount ?? 0)} USD</span>
                </div>

                <AnimatePresence initial={false}>
                    {showAll && <motion.div
                        key="items"
                        initial={{height: 0, opacity: 0}}
                        animate={{height: "auto", opacity: 1}}
                        exit={{height: 0, opacity: 0}}
                        transition={{duration: 0.3, ease: "easeInOut"}}
                        className="overflow-hidden"
                    >
                        <div className="border-t border-gray-200 py-4 space-y-4">
                            {orderData.items.map((element, index) => (
                                <OrderCardItem key={index} elementID={element.productId}/>
                            ))}
                        </div>
                    </motion.div>}
                </AnimatePresence>

                <Button
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => setShowAll(!showAll)}
                >
                    {showAll ? t.hide : `${t.showProducts} (${orderData?.items?.length ?? 0})`}
                </Button>
            </CardContent>
        </Card>
    );
}
