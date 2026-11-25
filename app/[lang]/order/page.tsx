'use client'

import {useMemo, useState} from "react";
import {FormProvider, useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {toast} from "sonner";
import {BreadcrumbDynamic} from "@/components/shared/breadcrumb-dynamic/breadcrumb-dynamic";
import AddressForm from "@/app/[lang]/order/components/delivery-method";
import OrderSummary from "@/app/[lang]/order/components/order-summary";
import {createOrderSchema, OrderFormData} from "@/interface/order-schema/order-schema";
import CheckoutForm from "@/app/[lang]/order/components/checkout-form";
import OrderedProducts from "@/app/[lang]/order/components/order-produc-list";
import {useBasketStore} from "@/lib/set-basket.storage";
import OrderSuccessModal from "@/components/shared/order-modal/Order-success-modal";
import {useUiText} from "@/provider/ui-text-provider";
import {getClientCountryCode} from "@/lib/locale-context-client";
import {formatDate} from "@/hooks/format-data";
import {useParams} from "next/navigation";
import {normalizeLocale} from "@/lib/i18n-config";

export default function OrderPage() {
    const t = useUiText().order;
    const {lang} = useParams<{ lang: string }>();
    const {items, clearBasket} = useBasketStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isOrderPlaced, setIsOrderPlaced] = useState(false);
    const [createdAt] = useState(() => new Date().toISOString());

    const schema = useMemo(() => createOrderSchema(t.validation), [t.validation]);

    const methods = useForm<OrderFormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            address: {text: "", location: null},
            userInformation: {name: "", secondment: "", phone: "", secondPhone: ""},
        },
    });

    const onSubmit = async (data: OrderFormData) => {
        const location = data.address.location!;
        const payload = {
            status: "CONFIRMED",
            client_first_phone: data.userInformation.phone,
            client_second_phone: data.userInformation.secondPhone,
            client_full_name: `${data.userInformation.name} ${data.userInformation.secondment}`.trim(),
            address: {
                countryCode: getClientCountryCode(),
                location: data.address.text,
                latitude: location.lat,
                longitude: location.lng,
            },
            // Amounts are stored by the backend in USD.
            totalAmount: items.reduce((total, item) => total + item.basePriceToUSD * item.quantity, 0),
            items: items.map((item) => ({
                productId: item.id,
                quantity: item.quantity,
                unitPrice: item.basePriceToUSD,
                totalPrice: item.basePriceToUSD * item.quantity,
            })),
        };

        try {
            // customerId is filled in by the server from the signed-in session.
            const res = await fetch("/api/backend/orders/create", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error(`Order failed: ${res.status}`);

            setIsOrderPlaced(true);
            clearBasket();
            setIsModalOpen(true);
        } catch (error) {
            console.error("Order error:", error);
            toast.error(t.error);
        }
    };

    return (
        <div>
            <div className={"container md:!mt-26 !mt-42"}>
                <BreadcrumbDynamic/>
                <h2 className="text-primary text-4xl font-medium leading-10 my-5">{t.title}</h2>
                <p className="text-gray-500 text-base font-medium leading-tight tracking-tight">
                    {t.createdAt}: {formatDate(createdAt, normalizeLocale(lang))}
                </p>
            </div>

            <FormProvider {...methods}>
                <form onSubmit={methods.handleSubmit(onSubmit)}>
                    <div className="container flex flex-col-reverse md:flex-row justify-between gap-10 !mt-5 relative">
                        <div className={'w-full'}>
                            <AddressForm/>
                            <OrderedProducts products={items} redirectWhenEmpty={!isOrderPlaced}/>
                            <CheckoutForm/>
                        </div>
                        <OrderSummary isSubmitting={methods.formState.isSubmitting}/>
                    </div>
                </form>
            </FormProvider>

            <OrderSuccessModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}/>
        </div>
    );
}
