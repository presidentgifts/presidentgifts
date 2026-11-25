import {notFound} from "next/navigation";
import {getCatalogContext} from "@/server/services/catalog/context";
import {listCategories} from "@/server/services/catalog/categories";
import {getProductDetail} from "@/server/services/catalog/products";
import {buildCategoryTree} from "@/lib/category-tree";
import {ProductEditor} from "../product-editor";

export async function generateMetadata({params}: { params: Promise<{ id: string }> }) {
    return {title: `Product #${(await params).id}`};
}

export default async function ProductPage({params}: { params: Promise<{ id: string }> }) {
    const id = Number((await params).id);
    if (!Number.isInteger(id) || id <= 0) notFound();

    const detail = await getProductDetail(id);
    if (!detail) notFound();

    // Opened in the product's own country, whichever country is chosen in the top bar.
    const {texts, country} = await getCatalogContext(detail.product.countryCode);
    if (!country) notFound();

    const categories = buildCategoryTree(await listCategories(country.code), country.defaultLanguageCode);
    const {product} = detail;

    return (
        <ProductEditor
            key={`${product.id}-${product.updatedAt.getTime()}`}
            texts={texts}
            country={country}
            categories={categories.map((row) => ({id: row.category.id, name: row.name, depth: row.depth}))}
            product={{
                id: product.id,
                sku: product.sku,
                categoryId: product.categoryId,
                // Never sent to people who can't see prices.
                priceUsd: country.canEditPrices ? product.priceUsd : null,
                stock: product.stock,
                isNew: product.isNew,
                isFeatured: product.isFeatured,
                status: product.status,
                translations: detail.translations,
                media: detail.media,
            }}
        />
    );
}
