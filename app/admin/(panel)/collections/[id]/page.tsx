import {notFound} from "next/navigation";
import {getCatalogContext} from "@/server/services/catalog/context";
import {getCollectionDetail} from "@/server/services/catalog/collections";
import {getAdminLanguage} from "@/server/admin-locale";
import {CollectionEditor} from "../collection-editor";

export async function generateMetadata({params}: { params: Promise<{ id: string }> }) {
    return {title: `Collection #${(await params).id}`};
}

export default async function CollectionPage({params}: { params: Promise<{ id: string }> }) {
    const id = Number((await params).id);
    if (!Number.isInteger(id) || id <= 0) notFound();

    const detail = await getCollectionDetail(id, await getAdminLanguage());
    if (!detail) notFound();

    const {texts, country} = await getCatalogContext(detail.collection.countryCode);
    if (!country) notFound();
    const {collection} = detail;

    return (
        <CollectionEditor
            key={`${collection.id}-${collection.updatedAt.getTime()}`}
            texts={texts}
            country={country}
            collection={{
                id: collection.id,
                status: collection.status,
                sortOrder: collection.sortOrder,
                image: detail.image,
                translations: detail.translations,
                products: detail.products,
            }}
        />
    );
}
