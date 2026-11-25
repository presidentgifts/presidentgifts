import {z} from "zod";
import type {UiTexts} from "@/provider/ui-text-provider";

const digitsCount = (value: string) => value.replace(/\D/g, "").length;
const phonePattern = /^\+?[\d\s()-]+$/;
const isPhone = (value: string) => phonePattern.test(value) && digitsCount(value) >= 9 && digitsCount(value) <= 15;

export function createOrderSchema(t: UiTexts["order"]["validation"]) {
    return z.object({
        address: z.object({
            text: z.string().trim().min(1, t.addressRequired),
            location: z
                .object({lat: z.number(), lng: z.number()})
                .nullable()
                .refine((value) => value !== null, {message: t.chooseOnMap}),
        }),
        userInformation: z.object({
            name: z.string().trim().min(2, t.nameMin).max(50, t.nameMax),
            secondment: z.string().trim().min(2, t.nameMin).max(50, t.nameMax),
            phone: z.string().trim().refine(isPhone, t.phoneInvalid),
            secondPhone: z
                .string()
                .trim()
                .optional()
                .refine((value) => !value || isPhone(value), t.secondPhoneInvalid),
        }),
    });
}

export type OrderFormData = z.input<ReturnType<typeof createOrderSchema>>;
