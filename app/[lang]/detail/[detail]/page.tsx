import {LangType} from "@/interface/lang/lang-type";
import {ProductDetailService} from "@/service/products-service/product-detail.service";
import {ProductsInterface} from "@/interface/products-interface/products-interface";
import ProductDetailPage from "./product-detail";
import {notFound} from "next/navigation";

interface DetailPageProps {
    params: Promise<{ lang: LangType, detail: string }>;
}

export default async function Page({params}: DetailPageProps) {


    const DetailPageParam: { lang: LangType, detail: string } = await params;
    const productId = Number(DetailPageParam.detail);
    if (!Number.isInteger(productId) || productId <= 0) notFound();

    const product = await ProductDetailService(productId).catch(() => null) as ProductsInterface | null;
    if (!product?.id) notFound();

    return <ProductDetailPage product={product}/>;
}
