export interface TreeCategory {
    id: number;
    parentId: number | null;
    translations: { languageCode: string; name: string }[];
}

export interface TreeRow<T extends TreeCategory> {
    category: T;
    depth: number;
    name: string;
}

export function categoryName(category: TreeCategory, lang: string) {
    return category.translations.find((t) => t.languageCode === lang)?.name ?? category.translations[0]?.name ?? `#${category.id}`;
}

/** Orders categories as a tree (each parent followed by its children), with their depth. */
export function buildCategoryTree<T extends TreeCategory>(categories: T[], lang: string): TreeRow<T>[] {
    const ids = new Set(categories.map((c) => c.id));
    const seen = new Set<number>();
    const rows: TreeRow<T>[] = [];

    const visit = (parentId: number | null, depth: number) => {
        const children = categories.filter((c) =>
            parentId === null ? c.parentId === null || !ids.has(c.parentId) : c.parentId === parentId,
        );
        for (const category of children) {
            if (seen.has(category.id)) continue;
            seen.add(category.id);
            rows.push({category, depth, name: categoryName(category, lang)});
            visit(category.id, depth + 1);
        }
    };
    visit(null, 0);
    return rows;
}

/** The category and everything below it. */
export function descendantIds(categories: TreeCategory[], id: number): Set<number> {
    const result = new Set<number>([id]);
    let added = true;
    while (added) {
        added = false;
        for (const c of categories) {
            if (c.parentId !== null && result.has(c.parentId) && !result.has(c.id)) {
                result.add(c.id);
                added = true;
            }
        }
    }
    return result;
}
