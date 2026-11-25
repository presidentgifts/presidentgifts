import Image from "next/image";
import {useEffect, useState} from "react";
import {getProductDetail} from "@/service/products-service/product-item.service";
import {ProductsInterface} from "@/interface/products-interface/products-interface";
import Link from "next/link";
import {formatCurrency} from "@/hooks/formatPrice";
import {useUiText} from "@/provider/ui-text-provider";
import {mediaSrc} from "@/lib/media-src";


export const OrderCardItem = ({elementID}: { elementID: number }) => {
    const [productDetail, setProductDetail] = useState<ProductsInterface>()
    const t = useUiText().account.orders;

    useEffect(() => {
        getProductDetail(elementID)
            .then(setProductDetail)
            .catch((error) => console.error("Error fetching product:", error));
    }, [elementID]);



    return (
        <div className={"flex items-center justify-between w-full"}>
            <div className={'flex gap-8'}>
                {productDetail?.media?.[0]?.filePath ? (
                    <Image
                        src={mediaSrc(productDetail.media[0].filePath)}
                        alt={'Order image'}
                        width={80}
                        height={80}
                    />
                ) : (
                    <div className="w-[80px] h-[80px] bg-gray-200 rounded"/>
                )}

                <div className={"flex flex-col justify-start items-start gap-2"}>
                    <h4 className="text-center justify-start text-primary text-sm font-medium leading-tight">
                        {productDetail?.name}
                    </h4>
                    <p className="justify-start text-primary text-xs font-medium leading-none">
                        {productDetail?.locale_price
                            ? formatCurrency(productDetail.locale_price)
                            : "-"}
                    </p>

                </div>
            </div>
            {productDetail?.id && (
                <Link href={`/detail/${productDetail.id}`}>{t.viewItem}</Link>
            )}
        </div>
    )
}
