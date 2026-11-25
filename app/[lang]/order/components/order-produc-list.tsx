"use client";

import Image from "next/image";
import {useRouter} from "next/navigation";
import {useEffect} from "react";
import {Trash2} from "lucide-react";
import {ProductCardProps} from "@/interface/product-card-type";
import {useBasketStore} from "@/lib/set-basket.storage";

import {getCurrencyCode, getPriceFor} from "@/hooks/price-helpers";
import {formatCurrency} from "@/hooks/formatPrice";
import {useUiText} from "@/provider/ui-text-provider";
import {mediaSrc} from "@/lib/media-src";

export default function OrderedProducts({products, redirectWhenEmpty = true}: {
    products: ProductCardProps[];
    redirectWhenEmpty?: boolean;
}) {
    const t = useUiText().order;
    const router = useRouter();
    const {removeFromBasket} = useBasketStore();

    useEffect(() => {
        if (redirectWhenEmpty && products.length === 0) router.push("/basket");
    }, [products.length, redirectWhenEmpty, router]);

    const code = getCurrencyCode();

    return (
        <div className="bg-white p-4 sm:p-6 rounded-[4px] border mt-4">
            <h2 className="text-lg sm:text-xl font-bold mb-4">{t.orderedProducts}</h2>

            <div className="space-y-4">
                {products.map((product) => {
                    const row = getPriceFor(product.price, code);
                    const quantity = (product as ProductCardProps & { quantity?: number }).quantity ?? 1;

                    return (
                        <div
                            key={product.id}
                            className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 border-b pb-4 last:border-b-0"
                        >
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="shrink-0">
                                    <Image
                                        src={mediaSrc(product.imgUrl)}
                                        alt={`product name ${product.name}`}
                                        width={64}
                                        height={64}
                                        className="rounded-md object-cover"
                                    />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-semibold text-sm truncate">{product.name}</h3>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {t.sku}: {product.sku}
                                    </p>
                                </div>
                            </div>

                            <div
                                className="flex items-center gap-2 sm:gap-10 w-full sm:w-auto justify-between sm:justify-end">
                                <p className="font-medium text-sm whitespace-nowrap">
                                    {quantity > 1 && `${quantity} × `}{row ? formatCurrency({currency: row.currency, price: row.price}) : "-"}
                                </p>

                                <button
                                    type="button"
                                    className="bg-[#f4f4f4] hover:bg-[#dfdfdf] text-primary p-2 rounded-full shrink-0 cursor-pointer"
                                    onClick={() => removeFromBasket(product.id)}
                                >
                                    <Trash2 className="w-5 h-5"/>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
