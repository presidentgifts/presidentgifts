"use client";

import {useEffect} from "react";
import {useSession} from "next-auth/react";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {z} from "zod";
import {toast} from "sonner";

import {AccountTitle} from "@/app/[lang]/account/account-title/account-title";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {useUiText} from "@/provider/ui-text-provider";

const AccountDetailSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
});

type AccountDetailFormValues = z.infer<typeof AccountDetailSchema>;

export default function AccountPage() {
    const ui = useUiText();
    const t = ui.account;
    const {data: session} = useSession();

    const form = useForm<AccountDetailFormValues>({
        resolver: zodResolver(AccountDetailSchema),
        defaultValues: {name: "", email: ""},
        mode: "onChange",
    });

    useEffect(() => {
        if (!session?.user) return;
        const user = session.user;
        form.reset({
            name: (user.authType === "custom" ? user.serverData?.full_name : user.name) ?? "",
            email: user.serverData?.email ?? user.email ?? "",
        });
    }, [session, form]);

    // The backend has no endpoint for updating the profile yet.
    const onSubmit = () => {
        toast.info(ui.common.notAvailable);
    };

    return (
        <div className="w-full md:max-w-[500px]">
            <AccountTitle text={t.details}/>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-7">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({field}) => (
                            <FormItem>
                                <FormLabel>{t.fullName}</FormLabel>
                                <FormControl>
                                    <Input type="text" placeholder={t.fullNamePlaceholder} {...field} value={field.value ?? ""}/>
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="email"
                        render={({field}) => (
                            <FormItem>
                                <FormLabel>{t.email}</FormLabel>
                                <FormControl>
                                    <Input type="email" placeholder={t.emailPlaceholder} {...field} value={field.value ?? ""} disabled/>
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />
                    <Button type="submit" variant="default" className="mt-10">
                        {ui.common.save}
                    </Button>
                </form>
            </Form>
        </div>
    );
}
