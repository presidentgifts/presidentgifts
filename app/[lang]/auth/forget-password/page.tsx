"use client"


import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {ForgetPasswordSchema} from "@/interface/auth-schema/forget-password";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {z} from "zod";
import {Button} from "@/components/ui/button";
import {useUiText} from "@/provider/ui-text-provider";
import {toast} from "sonner";


type ForgetPasswordFormValues = z.infer<typeof ForgetPasswordSchema>


export default function ForgetPassword() {
    const ui = useUiText();
    const t = ui.auth.forgot;

    const form = useForm<ForgetPasswordFormValues>({
        resolver: zodResolver(ForgetPasswordSchema),
        defaultValues: {
            email: "",
        },
    })

    // The backend has no password-reset endpoint yet.
    const onSubmit = () => {
        toast.info(ui.common.notAvailable)
    }


    return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-white">
            <div className={"w-full max-w-sm space-y-6"}>
                <h3 className="self-stretch justify-start text-primary text-lg font-medium  leading-7">{t.title}</h3>
                <p className="text-gray-500 text-base font-normal  leading-normal">{t.description}</p>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className={"space-y-4"}>
                        <FormField
                            control={form.control}
                            name="email"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>{ui.auth.login.email}</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder={ui.auth.login.emailPlaceholder} {...field} />
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                        <Button type="submit" variant={"default"} className={"w-full"}>
                            {t.submit}
                        </Button>
                    </form>
                </Form>
            </div>
        </div>
    )
}
