"use client"

import {AccountTitle} from "@/app/[lang]/account/account-title/account-title";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {type ChangePasswordFormValues, ChangePasswordSchema} from "@/interface/account-schema/change-password-schema";
import {toast} from "sonner";
import {useUiText} from "@/provider/ui-text-provider";

export default function ChangePasswordPage() {
    const ui = useUiText();
    const t = ui.account.changePassword;

    const form = useForm<ChangePasswordFormValues>({
        resolver: zodResolver(ChangePasswordSchema),
        defaultValues: {currentPassword: "", newPassword: "", confirmPassword: ""},
    });

    // The backend has no endpoint for changing the password yet.
    const onSubmit = () => {
        toast.info(ui.common.notAvailable);
    };

    const fields = [
        {name: "currentPassword", label: t.current, placeholder: t.currentPlaceholder},
        {name: "newPassword", label: t.new, placeholder: t.newPlaceholder},
        {name: "confirmPassword", label: t.confirm, placeholder: t.confirmPlaceholder},
    ] as const;

    return (
        <div className={"w-full md:max-w-[500px]"}>
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
                                        <Input type="password" placeholder={item.placeholder} {...field}/>
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                    ))}
                    <Button type="submit" variant={"default"} className={"mt-10"}>
                        {ui.common.save}
                    </Button>
                </form>
            </Form>
        </div>
    );
}
