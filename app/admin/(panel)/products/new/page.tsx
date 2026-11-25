import {getCatalogContext} from "@/server/services/catalog/context";
import {listCategories} from "@/server/services/catalog/categories";
import {Card, PageHeader} from "@/components/admin/kit";
import {buildCategoryTree} from "@/lib/category-tree";
import {ProductEditor} from "../product-editor";

export const metadata = {title: "New product"};

export default async function NewProductPage() {
    const {texts, country} = await getCatalogContext();
    if (!country) {
        return (
            <div className="space-y-6">
                <PageHeader title={texts.productsPage.createTitle}/>
                <Card className="p-10 text-center text-sm text-neutral-500">{texts.catalog.noCountry}</Card>
            </div>
        );
    }

    const categories = buildCategoryTree(await listCategories(country.code), country.defaultLanguageCode);
    return (
        <ProductEditor
            key={country.code}
            texts={texts}
            country={country}
            categories={categories.map((row) => ({id: row.category.id, name: row.name, depth: row.depth}))}
            product={null}
        />
    );
}
