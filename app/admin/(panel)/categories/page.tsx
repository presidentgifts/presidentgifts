import {getCatalogContext} from "@/server/services/catalog/context";
import {listCategories} from "@/server/services/catalog/categories";
import {Card, PageHeader} from "@/components/admin/kit";
import {CategoriesManager} from "./categories-manager";

export const metadata = {title: "Categories"};

export default async function CategoriesPage() {
    const {texts, country} = await getCatalogContext();
    if (!country) {
        return (
            <div className="space-y-6">
                <PageHeader title={texts.categoriesPage.title}/>
                <Card className="p-10 text-center text-sm text-neutral-500">{texts.catalog.noCountry}</Card>
            </div>
        );
    }

    const categories = await listCategories(country.code);
    return <CategoriesManager key={country.code} texts={texts} country={country} categories={categories}/>;
}
