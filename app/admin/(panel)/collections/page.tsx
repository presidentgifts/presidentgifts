import Link from "next/link";
import {Boxes, Plus} from "lucide-react";
import {getCatalogContext} from "@/server/services/catalog/context";
import {listCollections} from "@/server/services/catalog/collections";
import {Card, PageHeader} from "@/components/admin/kit";
import {ContentStatusBadge} from "@/components/admin/catalog/editor-parts";
import {Button} from "@/components/ui/button";
import {format} from "@/lib/admin-i18n";

export const metadata = {title: "Collections"};

export default async function CollectionsPage() {
    const {texts, lang, country} = await getCatalogContext();
    const t = texts.collectionsPage;
    if (!country) {
        return (
            <div className="space-y-6">
                <PageHeader title={t.title}/>
                <Card className="p-10 text-center text-sm text-neutral-500">{texts.catalog.noCountry}</Card>
            </div>
        );
    }

    const collections = await listCollections(country.code, lang);

    return (
        <div className="space-y-6">
            <PageHeader title={t.title} subtitle={format(t.subtitle, {country: country.name})}>
                <Button size="lg" asChild>
                    <Link href="/admin/collections/new">
                        <Plus className="size-4"/>
                        {t.add}
                    </Link>
                </Button>
            </PageHeader>

            {collections.length === 0 && <Card className="p-10 text-center text-sm text-neutral-500">{t.empty}</Card>}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {collections.map((c) => (
                    <Link
                        key={c.id}
                        href={`/admin/collections/${c.id}`}
                        className="group overflow-hidden rounded-lg border border-neutral-200 bg-white transition-shadow hover:shadow-sm"
                    >
                        <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-neutral-100">
                            {c.image ? (
                                // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail
                                <img src={c.image} alt="" className="size-full object-cover transition-transform group-hover:scale-[1.02]"/>
                            ) : (
                                <Boxes className="size-8 text-neutral-300"/>
                            )}
                        </div>
                        <div className="space-y-2 p-4">
                            <p className="truncate font-semibold">{c.name || `#${c.id}`}</p>
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-neutral-500">{format(t.count, {count: c.products})}</span>
                                <ContentStatusBadge status={c.status} texts={texts}/>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
