import "server-only";

import {and, asc, eq} from "drizzle-orm";
import {z} from "zod";
import {getDb, schema} from "@/server/db/client";
import {ActionError, parseInput} from "@/server/admin-action";
import type {AdminContext} from "@/server/auth/session";
import {assertCountryMedia, getMediaViews, type MediaView} from "@/server/services/catalog/common";
import {assertCanEditPages} from "./pages";

export const productVideoInput = z.object({
    videoId: z.string().uuid(),
    link: z
        .string()
        .trim()
        .max(500)
        .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), "Must be an http(s) link")
        .transform((v) => v || null),
    isActive: z.boolean(),
    sortOrder: z.number().int().min(0).max(100000),
});

export type ProductVideoInput = z.input<typeof productVideoInput>;

export interface ProductVideoView {
    id: number;
    video: MediaView | null;
    link: string | null;
    isActive: boolean;
    sortOrder: number;
}

async function withMedia(rows: (typeof schema.productVideos.$inferSelect)[]): Promise<ProductVideoView[]> {
    const media = await getMediaViews(rows.map((r) => r.videoId));
    return rows.map((row) => ({
        id: row.id,
        video: media.get(row.videoId) ?? null,
        link: row.link,
        isActive: row.isActive,
        sortOrder: row.sortOrder,
    }));
}

export async function listProductVideos(countryCode: string) {
    const rows = await getDb()
        .select()
        .from(schema.productVideos)
        .where(eq(schema.productVideos.countryCode, countryCode))
        .orderBy(asc(schema.productVideos.sortOrder), asc(schema.productVideos.id));
    return withMedia(rows);
}

/** Active videos of a country, in display order, for the site. */
export async function listSiteProductVideos(countryCode: string) {
    const rows = await getDb()
        .select()
        .from(schema.productVideos)
        .where(and(eq(schema.productVideos.countryCode, countryCode), eq(schema.productVideos.isActive, true)))
        .orderBy(asc(schema.productVideos.sortOrder), asc(schema.productVideos.id));
    return (await withMedia(rows)).filter((v) => v.video !== null);
}

/** Videos go live as soon as they are saved, so they are edited by people who can publish content. */
export async function saveProductVideo(ctx: AdminContext, countryCode: string, id: number | null, input: unknown) {
    const data = parseInput(productVideoInput, input);
    assertCanEditPages(ctx, countryCode);
    await assertCountryMedia(countryCode, [data.videoId]);
    const [media] = [...(await getMediaViews([data.videoId])).values()];
    if (!media?.contentType.startsWith("video/")) throw new ActionError("invalid", "video");

    const values = {
        videoId: data.videoId,
        link: data.link,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
        updatedById: ctx.user.id,
    };
    if (id === null) {
        const [row] = await getDb()
            .insert(schema.productVideos)
            .values({...values, countryCode})
            .returning({id: schema.productVideos.id});
        return row.id;
    }
    const [row] = await getDb()
        .update(schema.productVideos)
        .set(values)
        .where(and(eq(schema.productVideos.id, id), eq(schema.productVideos.countryCode, countryCode)))
        .returning({id: schema.productVideos.id});
    if (!row) throw new ActionError("notFound");
    return row.id;
}

export async function deleteProductVideo(ctx: AdminContext, countryCode: string, id: number) {
    assertCanEditPages(ctx, countryCode);
    const [row] = await getDb()
        .delete(schema.productVideos)
        .where(and(eq(schema.productVideos.id, id), eq(schema.productVideos.countryCode, countryCode)))
        .returning({id: schema.productVideos.id});
    if (!row) throw new ActionError("notFound");
}

/** Swaps the display order of a video with its neighbour (up = -1, down = +1). */
export async function moveProductVideo(ctx: AdminContext, countryCode: string, id: number, direction: -1 | 1) {
    assertCanEditPages(ctx, countryCode);
    const list = await listProductVideos(countryCode);
    const index = list.findIndex((v) => v.id === id);
    if (index === -1) throw new ActionError("notFound");
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    const ordered = [...list];
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    await getDb().transaction(async (tx) => {
        for (const [position, video] of ordered.entries()) {
            await tx
                .update(schema.productVideos)
                .set({sortOrder: position})
                .where(and(eq(schema.productVideos.id, video.id), eq(schema.productVideos.countryCode, countryCode)));
        }
    });
}
