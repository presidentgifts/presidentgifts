"use client";

import {fetcherClient} from "@/lib/fetcher-client";

export const UserOrderService = async (customerId: string) => {
    return fetcherClient(`/api/v1/orders/by_customer_id?customerId=${encodeURIComponent(customerId)}&page=0&size=10`);
};
