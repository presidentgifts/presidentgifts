import Link from "next/link";
import {ArrowLeft, ChevronRight, FileText} from "lucide-react";
import {getCatalogContext} from "@/server/services/catalog/context";
import {CONTENT_WORKFLOW} from "@/server/services/catalog/common";
import {getPageEntries, listPages} from "@/server/services/content/pages";
import {Card, PageHeader} from "@/components/admin/kit";
import {format} from "@/lib/admin-i18n";
import {PAGE_KEY_PATTERN} from "@/lib/page-registry";
import {OtherPageForm, PageEditor} from "./page-editor";

export const metadata = {title: "Page texts"};

export default async function PageTextsPage({searchParams}: { searchParams: Promise<{ page?: string }> }) {
    const {texts, country} = await getCatalogContext(undefined, CONTENT_WORKFLOW);
    const t = texts.pagesPage;
    if (!country) {
        return (
            <div className="space-y-6">
                <PageHeader title={t.title}/>
                <Card className="p-10 text-center text-sm text-neutral-500">{texts.catalog.noCountry}</Card>
            </div>
        );
    }

    const pageKey = (await searchParams).page;
    if (pageKey && PAGE_KEY_PATTERN.test(pageKey)) {
        const entries = await getPageEntries(country.code, pageKey);
        return (
            <div className="space-y-6">
                <div>
                    <Link href="/admin/ui-texts" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900">
                        <ArrowLeft className="size-4"/>
                        {t.title}
                    </Link>
                    <h1 className="mt-3 text-2xl font-semibold tracking-tight">
                        {t.names[pageKey] ?? pageKey}
                        <span className="ml-3 font-mono text-sm font-normal text-neutral-400">{pageKey}</span>
                    </h1>
                </div>
                <PageEditor key={`${country.code}-${pageKey}`} texts={texts} country={country} pageKey={pageKey} entries={entries}/>
            </div>
        );
    }

    const pages = await listPages(country.code);

    return (
        <div className="space-y-6">
            <PageHeader title={t.title} subtitle={format(t.subtitle, {country: country.name})}/>
            {!country.canPublish && (
                <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">{t.readOnly}</p>
            )}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {pages.map((page) => (
                    <Link
                        key={page.key}
                        href={`/admin/ui-texts?page=${encodeURIComponent(page.key)}`}
                        className="group flex items-center gap-4 rounded-lg border border-neutral-200 bg-white p-5 transition-shadow hover:shadow-sm"
                    >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-neutral-100">
                            <FileText className="size-5 text-neutral-500"/>
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold">{t.names[page.key] ?? page.key}</span>
                            <span className="block text-xs text-neutral-500">
                                <span className="font-mono">{page.key}</span>
                                {" · "}
                                {page.expected > 0
                                    ? format(t.filled, {count: Math.min(page.entries, page.expected), total: page.expected})
                                    : format(t.entries, {count: page.entries})}
                            </span>
                        </span>
                        <ChevronRight className="size-4 text-neutral-400 transition-transform group-hover:translate-x-0.5"/>
                    </Link>
                ))}
            </div>
            {country.canPublish && <OtherPageForm texts={texts}/>}
        </div>
    );
}
