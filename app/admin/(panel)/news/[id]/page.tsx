import {notFound} from "next/navigation";
import {getCatalogContext} from "@/server/services/catalog/context";
import {CONTENT_WORKFLOW} from "@/server/services/catalog/common";
import {getNewsDetail} from "@/server/services/content/news";
import {NewsEditor} from "../news-editor";

export async function generateMetadata({params}: { params: Promise<{ id: string }> }) {
    return {title: `News #${(await params).id}`};
}

export default async function NewsItemPage({params}: { params: Promise<{ id: string }> }) {
    const id = Number((await params).id);
    if (!Number.isInteger(id) || id <= 0) notFound();

    const detail = await getNewsDetail(id);
    if (!detail) notFound();
    const {texts, country} = await getCatalogContext(detail.item.countryCode, CONTENT_WORKFLOW);
    if (!country) notFound();
    const {item} = detail;

    return (
        <NewsEditor
            key={`${item.id}-${item.updatedAt.getTime()}`}
            texts={texts}
            country={country}
            item={{
                id: item.id,
                status: item.status,
                image: detail.image,
                pageImage: detail.pageImage,
                instagramLink: item.instagramLink,
                publishedAt: item.publishedAt?.toISOString() ?? null,
                translations: detail.translations,
            }}
        />
    );
}
