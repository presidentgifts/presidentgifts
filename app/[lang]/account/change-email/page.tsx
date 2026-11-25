"use client";

import {useEffect} from "react";
import {AccountTitle} from "@/app/[lang]/account/account-title/account-title";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {type ChangeEmailFormValues, ChangeEmailSchema} from "@/interface/account-schema/change-email-schema";
import {useSession} from "next-auth/react";
import {toast} from "sonner";
import {useUiText} from "@/provider/ui-text-provider";

export default function ChangeEmailPage() {
    const ui = useUiText();
    const t = ui.account.changeEmail;
    const {data: session} = useSession();

    const form = useForm<ChangeEmailFormValues>({
        resolver: zodResolver(ChangeEmailSchema),
        defaultValues: {currentEmail: "", newEmail: "", confirmEmail: ""},
    });

    useEffect(() => {
        if (!session?.user) return;
        form.setValue("currentEmail", session.user.serverData?.email ?? session.user.email ?? "");
    }, [session, form]);

    // The backend has no endpoint for changing the email yet.
    const onSubmit = () => {
        toast.info(ui.common.notAvailable);
    };

    const fields = [
        {name: "currentEmail", label: t.current, placeholder: "", disabled: true},
        {name: "newEmail", label: t.new, placeholder: t.newPlaceholder, disabled: false},
        {name: "confirmEmail", label: t.confirm, placeholder: t.confirmPlaceholder, disabled: false},
    ] as const;

    return (
        <div className="w-full md:max-w-[500px]">
            <AccountTitle text={t.title}/>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-7">
                    {fields.map((item) => (
                        <FormField
                            key={item.name}
                            control={form.control}
                            name={item.name}
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>{item.label}</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="email"
                                            placeholder={item.placeholder}
                                            {...field}
                                            disabled={item.disabled}
                                            value={field.value ?? ""}
                                        />
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                    ))}
                    <Button type="submit" variant="default" className="mt-10">
                        {ui.common.save}
                    </Button>
                </form>
            </Form>
        </div>
    );
}
