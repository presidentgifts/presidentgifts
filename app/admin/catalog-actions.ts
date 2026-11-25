"use server";

import {hasPermission, requireAdmin, requirePermission} from "@/server/auth/access";
import {PERMISSIONS} from "@/server/auth/permissions";
import {logAudit} from "@/server/audit";
import {ActionError, ActionResult, runAction} from "@/server/admin-action";
import {getAdminLanguage} from "@/server/admin-locale";
import type {ContentStatus} from "@/server/db/schema";
import type {MediaView} from "@/server/services/catalog/common";
import {registerMedia, requestUpload} from "@/server/services/catalog/media";
import {CategoryInput, createCategory, deleteCategory, updateCategory} from "@/server/services/catalog/categories";
import {
    createProduct,
    deleteProduct,
    ProductInput,
    searchProducts,
    setProductStatus,
    updateProduct,
} from "@/server/services/catalog/products";
import {CollectionInput, createCollection, deleteCollection, updateCollection} from "@/server/services/catalog/collections";

function assertCountry(code: string) {
    if (!/^[A-Z]{2}$/.test(code)) throw new ActionError("invalid");
}

/* ---------- media ---------- */

/** Uploading images is allowed to anyone who edits the catalog or the content of the country. */
async function requireMediaAccess(countryCode: string) {
    const ctx = await requireAdmin();
    if (!hasPermission(ctx, PERMISSIONS.catalogEdit, countryCode) && !hasPermission(ctx, PERMISSIONS.contentEdit, countryCode)) {
        throw new ActionError("forbidden");
    }
    return ctx;
}

export async function requestUploadAction(
    countryCode: string,
    input: { contentType: string; size: number },
): Promise<ActionResult<{ key: string; uploadUrl: string }>> {
    return runAction(async () => {
        assertCountry(countryCode);
        await requireMediaAccess(countryCode);
        return requestUpload(countryCode, input);
    }, {revalidate: false});
}

export async function registerMediaAction(
    countryCode: string,
    input: { key: string; contentType: string; size: number; width: number | null; height: number | null; originalName: string | null },
): Promise<ActionResult<MediaView>> {
    return runAction(async () => {
        assertCountry(countryCode);
        const ctx = await requireMediaAccess(countryCode);
        const media = await registerMedia(ctx, countryCode, input);
        await logAudit({userId: ctx.user.id, countryCode, action: "media.upload", entityType: "media", entityId: media.id, changes: {key: input.key}});
        return media;
    }, {revalidate: false});
}

/* ---------- categories ---------- */

export async function saveCategoryAction(countryCode: string, id: number | null, input: CategoryInput): Promise<ActionResult<number>> {
    return runAction(async () => {
        assertCountry(countryCode);
        const ctx = await requirePermission(PERMISSIONS.catalogEdit, countryCode);
        const savedId = id === null ? await createCategory(ctx, countryCode, input) : (await updateCategory(ctx, countryCode, id, input), id);
        await logAudit({
            userId: ctx.user.id,
            countryCode,
            action: id === null ? "category.create" : "category.update",
            entityType: "category",
            entityId: savedId,
            changes: input,
        });
        return savedId;
    });
}

export async function deleteCategoryAction(countryCode: string, id: number): Promise<ActionResult> {
    return runAction(async () => {
        assertCountry(countryCode);
        const ctx = await requirePermission(PERMISSIONS.catalogEdit, countryCode);
        await deleteCategory(ctx, countryCode, id);
        await logAudit({userId: ctx.user.id, countryCode, action: "category.delete", entityType: "category", entityId: id});
    });
}

/* ---------- products ---------- */

export async function saveProductAction(countryCode: string, id: number | null, input: ProductInput): Promise<ActionResult<number>> {
    return runAction(async () => {
        assertCountry(countryCode);
        const ctx = await requirePermission(PERMISSIONS.catalogEdit, countryCode);
        const savedId = id === null ? await createProduct(ctx, countryCode, input) : (await updateProduct(ctx, countryCode, id, input), id);
        await logAudit({
            userId: ctx.user.id,
            countryCode,
            action: id === null ? "product.create" : "product.update",
            entityType: "product",
            entityId: savedId,
            changes: input,
        });
        return savedId;
    });
}

export async function setProductStatusAction(countryCode: string, id: number, status: ContentStatus): Promise<ActionResult> {
    return runAction(async () => {
        assertCountry(countryCode);
        const ctx = await requirePermission(PERMISSIONS.catalogEdit, countryCode);
        const previous = await setProductStatus(ctx, countryCode, id, status);
        await logAudit({userId: ctx.user.id, countryCode, action: "product.status", entityType: "product", entityId: id, changes: {from: previous, to: status}});
    });
}

export async function deleteProductAction(countryCode: string, id: number): Promise<ActionResult> {
    return runAction(async () => {
        assertCountry(countryCode);
        const ctx = await requirePermission(PERMISSIONS.catalogEdit, countryCode);
        const removed = await deleteProduct(ctx, countryCode, id);
        await logAudit({userId: ctx.user.id, countryCode, action: "product.delete", entityType: "product", entityId: id, changes: {sku: removed.sku}});
    });
}

export async function searchProductsAction(countryCode: string, q: string) {
    return runAction(async () => {
        assertCountry(countryCode);
        await requirePermission(PERMISSIONS.catalogEdit, countryCode);
        return searchProducts(countryCode, await getAdminLanguage(), q.slice(0, 100));
    }, {revalidate: false});
}

/* ---------- collections ---------- */

export async function saveCollectionAction(countryCode: string, id: number | null, input: CollectionInput): Promise<ActionResult<number>> {
    return runAction(async () => {
        assertCountry(countryCode);
        const ctx = await requirePermission(PERMISSIONS.catalogEdit, countryCode);
        const savedId = id === null ? await createCollection(ctx, countryCode, input) : (await updateCollection(ctx, countryCode, id, input), id);
        await logAudit({
            userId: ctx.user.id,
            countryCode,
            action: id === null ? "collection.create" : "collection.update",
            entityType: "collection",
            entityId: savedId,
            changes: input,
        });
        return savedId;
    });
}

export async function deleteCollectionAction(countryCode: string, id: number): Promise<ActionResult> {
    return runAction(async () => {
        assertCountry(countryCode);
        const ctx = await requirePermission(PERMISSIONS.catalogEdit, countryCode);
        await deleteCollection(ctx, countryCode, id);
        await logAudit({userId: ctx.user.id, countryCode, action: "collection.delete", entityType: "collection", entityId: id});
    });
}
