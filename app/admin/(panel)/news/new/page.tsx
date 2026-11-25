import {getCatalogContext} from "@/server/services/catalog/context";
import {CONTENT_WORKFLOW} from "@/server/services/catalog/common";
import {Card, PageHeader} from "@/components/admin/kit";
import {NewsEditor} from "../news-editor";

export const metadata = {title: "New news item"};

export default async function NewNewsPage() {
    const {texts, country} = await getCatalogContext(undefined, CONTENT_WORKFLOW);
    if (!country) {
        return (
            <div className="space-y-6">
                <PageHeader title={texts.newsPage.createTitle}/>
                <Card className="p-10 text-center text-sm text-neutral-500">{texts.catalog.noCountry}</Card>
            </div>
        );
    }
    return <NewsEditor key={country.code} texts={texts} country={country} item={null}/>;
}
