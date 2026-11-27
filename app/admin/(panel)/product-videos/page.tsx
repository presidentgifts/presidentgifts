import {getCatalogContext} from "@/server/services/catalog/context";
import {CONTENT_WORKFLOW} from "@/server/services/catalog/common";
import {listProductVideos} from "@/server/services/content/product-videos";
import {Card, PageHeader} from "@/components/admin/kit";
import {ProductVideosManager} from "./product-videos-manager";

export const metadata = {title: "Product videos"};

export default async function ProductVideosPage() {
    const {texts, country} = await getCatalogContext(undefined, CONTENT_WORKFLOW);
    if (!country) {
        return (
            <div className="space-y-6">
                <PageHeader title={texts.productVideosPage.title}/>
                <Card className="p-10 text-center text-sm text-neutral-500">{texts.catalog.noCountry}</Card>
            </div>
        );
    }
    return (
        <ProductVideosManager
            key={country.code}
            texts={texts}
            country={country}
            videos={await listProductVideos(country.code)}
        />
    );
}
