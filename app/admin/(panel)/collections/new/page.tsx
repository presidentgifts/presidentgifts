import {getCatalogContext} from "@/server/services/catalog/context";
import {Card, PageHeader} from "@/components/admin/kit";
import {CollectionEditor} from "../collection-editor";

export const metadata = {title: "New collection"};

export default async function NewCollectionPage() {
    const {texts, country} = await getCatalogContext();
    if (!country) {
        return (
            <div className="space-y-6">
                <PageHeader title={texts.collectionsPage.createTitle}/>
                <Card className="p-10 text-center text-sm text-neutral-500">{texts.catalog.noCountry}</Card>
            </div>
        );
    }
    return <CollectionEditor key={country.code} texts={texts} country={country} collection={null}/>;
}
