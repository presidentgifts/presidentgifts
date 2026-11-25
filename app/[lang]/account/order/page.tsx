"use client"

import {AccountTitle} from "@/app/[lang]/account/account-title/account-title";
import OrderCard from "@/app/[lang]/account/components/order-card/order-card";
import {useEffect, useState} from "react";
import {UserOrderService} from "@/service/order.service/user-order.service";
import {useSession} from "next-auth/react";
import {OrderDataInterface} from "@/interface/order-data/order-data";
import {useUiText} from "@/provider/ui-text-provider";
import {Skeleton} from "@/components/ui/skeleton";

interface OrderInterface {
    content: OrderDataInterface[],
    first: boolean,
    last: boolean,
    page: number,
    size: number,
    totalElements: number,
    totalPages: number,
}

export default function OrderPage() {
    const t = useUiText().account.orders;
    const [orderData, setOrderData] = useState<OrderInterface>();
    const [loading, setLoading] = useState(true);
    const {data: session, status} = useSession();
    const customerId = session?.user.serverData?.id;

    useEffect(() => {
        if (status === "loading") return;
        if (!customerId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        UserOrderService(customerId)
            .then(setOrderData)
            .catch(() => setOrderData(undefined))
            .finally(() => setLoading(false));
    }, [customerId, status]);

    const orders = orderData?.content ?? [];

    return (
        <div>
            <AccountTitle text={t.title}/>

            {loading ? (
                <div className="mt-10 space-y-4">
                    <Skeleton className="h-40 w-full"/>
                    <Skeleton className="h-40 w-full"/>
                </div>
            ) : orders.length === 0 ? (
                <p className="text-primary text-sm font-medium leading-tight mt-3">{t.empty}</p>
            ) : (
                <div className={'mt-10'}>
                    {orders.map((item) => (
                        <OrderCard key={item.id} orderData={item}/>
                    ))}
                </div>
            )}
        </div>
    )
}
