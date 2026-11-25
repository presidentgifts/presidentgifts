import {ProductsInterface} from "@/interface/products-interface/products-interface";
import {ProductCardProps} from "@/interface/product-card-type";

/** Converts a product from the backend into a basket entry. */
export function toBasketItem(product: ProductsInterface): ProductCardProps {
    return {
        id: product.id,
        name: product.name,
        basePriceToUSD: product.basePriceToUSD,
        price: product.prices,
        sku: product.sku,
        imgUrl: product.media?.[0]?.filePath ?? "",
    };
}
