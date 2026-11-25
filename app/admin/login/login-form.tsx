"use client";

import {useActionState, useState} from "react";
import {AlertCircle, Eye, EyeOff, Loader2} from "lucide-react";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Button} from "@/components/ui/button";
import {loginAction, LoginState} from "@/app/admin/actions";
import type {AdminDictionary} from "@/lib/admin-i18n";

export function LoginForm({texts, next}: { texts: AdminDictionary["login"]; next?: string }) {
    const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});
    const [showPassword, setShowPassword] = useState(false);

    return (
        <form action={formAction} className="mt-8 space-y-5" noValidate>
            {next && <input type="hidden" name="next" value={next}/>}

            {state.error && (
                <div role="alert" className="flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <AlertCircle className="size-4 mt-0.5 shrink-0"/>
                    <span>{texts.errors[state.error]}</span>
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="email">{texts.email}</Label>
                <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    placeholder={texts.emailPlaceholder}
                    defaultValue={state.email}
                    required
                    autoFocus
                    className="h-11"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="password">{texts.password}</Label>
                <div className="relative">
                    <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder={texts.passwordPlaceholder}
                        required
                        className="h-11 pr-11"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? texts.hidePassword : texts.showPassword}
                        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-neutral-500 hover:text-neutral-900"
                    >
                        {showPassword ? <EyeOff className="size-4"/> : <Eye className="size-4"/>}
                    </button>
                </div>
            </div>

            <Button type="submit" disabled={pending} className="h-11 w-full px-4">
                {pending && <Loader2 className="size-4 animate-spin"/>}
                {pending ? texts.submitting : texts.submit}
            </Button>
        </form>
    );
}
