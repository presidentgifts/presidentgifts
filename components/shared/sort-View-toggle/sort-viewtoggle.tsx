"use client";

import {useMemo, useState} from "react";
import {Button} from "@/components/ui/button";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,} from "@/components/ui/dropdown-menu";
import {Grid2X2, List, Loader2} from "lucide-react";
import {ProductsInterface} from "@/interface/products-interface/products-interface";
import {ProductsCard} from "@/components/shared/products-cards/products-card";
import {CATEGORY_PAGE_SIZE, getCategoryProductsPage} from "@/service/products-service/category-products-client.service";

type SortValue = "newest" | "priceAsc" | "priceDesc";

interface Props {
    products: ProductsInterface[];
    /** Total number of products, if the backend reports it. */
    total?: number;
    /** When set, "Show more" loads the next page of this category from the backend. */
    categoryId?: number;
    dictionary: {
        category: {
            title: string;
            new: string;
            not_found: string;
            unavailable: string;
            show_more: string;
        };
        sortAndView: {
            productsLabel: string;
            sortBy: string;
            options: {
                newest: string;
                priceAsc: string;
                priceDesc: string;
            };
        };
    };
}

const CLIENT_PAGE_SIZE = 12;

function priceOf(product: ProductsInterface): number {
    return product.locale_price?.price ?? product.basePriceToUSD ?? 0;
}

export default function SortAndViewToggleWrapper({products, total, categoryId, dictionary}: Props) {
    const [view, setView] = useState<"grid" | "list">("grid");
    const [sort, setSort] = useState<SortValue>("newest");
    const [items, setItems] = useState(products);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(false);
    const [serverHasMore, setServerHasMore] = useState(products.length >= CATEGORY_PAGE_SIZE);
    const [visibleCount, setVisibleCount] = useState(CLIENT_PAGE_SIZE);

    const sortOptions: { label: string; value: SortValue }[] = [
        {label: dictionary.sortAndView.options.newest, value: "newest"},
        {label: dictionary.sortAndView.options.priceAsc, value: "priceAsc"},
        {label: dictionary.sortAndView.options.priceDesc, value: "priceDesc"},
    ];

    const sorted = useMemo(() => {
        if (sort === "newest") return items;
        const direction = sort === "priceAsc" ? 1 : -1;
        return [...items].sort((a, b) => (priceOf(a) - priceOf(b)) * direction);
    }, [items, sort]);

    const visible = categoryId ? sorted : sorted.slice(0, visibleCount);
    const hasMore = categoryId ? serverHasMore : visibleCount < sorted.length;

    const loadMore = async () => {
        if (!categoryId) {
            setVisibleCount((count) => count + CLIENT_PAGE_SIZE);
            return;
        }
        setLoading(true);
        try {
            const next = page + 1;
            const res = (await getCategoryProductsPage(categoryId, next)) as { data?: ProductsInterface[] } | null;
            const data = res?.data ?? [];
            setItems((prev) => {
                const ids = new Set(prev.map((p) => p.id));
                return [...prev, ...data.filter((p) => !ids.has(p.id))];
            });
            setPage(next);
            setServerHasMore(data.length >= CATEGORY_PAGE_SIZE);
        } catch {
            setServerHasMore(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between w-full py-4">
                <span className="text-sm text-muted-foreground">
                    {total ?? items.length} {dictionary.sortAndView.productsLabel}
                </span>

                <div className="flex items-center gap-4">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                                {dictionary.sortAndView.sortBy} {sortOptions.find((o) => o.value === sort)?.label}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {sortOptions.map((option) => (
                                <DropdownMenuItem key={option.value} onClick={() => setSort(option.value)}>
                                    {option.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="flex gap-2">
                        <Button
                            variant={view === "grid" ? "default" : "outline"}
                            size="icon"
                            aria-label="grid"
                            onClick={() => setView("grid")}
                        >
                            <Grid2X2 className="h-4 w-4"/>
                        </Button>
                        <Button
                            variant={view === "list" ? "default" : "outline"}
                            size="icon"
                            aria-label="list"
                            onClick={() => setView("list")}
                        >
                            <List className="h-4 w-4"/>
                        </Button>
                    </div>
                </div>
            </div>

            <div
                className={`grid gap-6 ${
                    view === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-2"
                }`}
            >
                {visible.map((product) => (
                    <ProductsCard key={product.id} productData={product} dictionary={dictionary}/>
                ))}
            </div>

            {hasMore && (
                <div className="flex justify-center mt-11">
                    <Button className="border-primary" variant="outline" onClick={loadMore} disabled={loading}>
                        {loading && <Loader2 className="h-4 w-4 animate-spin"/>}
                        {dictionary.category.show_more}
                    </Button>
                </div>
            )}
        </div>
    );
}
