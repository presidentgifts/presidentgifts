import {redirect} from "next/navigation";
import {getAdminContext} from "@/server/auth/session";
import {getAdminLanguage} from "@/server/admin-locale";
import {getAdminDictionary} from "@/lib/admin-i18n";
import {LoginForm} from "./login-form";
import FooterLogoIcon from "@/components/icon/footerLogoIcon";
import {AdminLanguageSwitcher} from "@/components/admin/language-switcher";

export const metadata = {title: "Login"};

export default async function AdminLoginPage({searchParams}: { searchParams: Promise<{ next?: string }> }) {
    if (await getAdminContext()) redirect("/admin");

    const lang = await getAdminLanguage();
    const t = getAdminDictionary(lang);
    const {next} = await searchParams;

    return (
        <main className="min-h-screen grid lg:grid-cols-2">
            <section className="hidden lg:flex flex-col justify-between bg-primary p-12 text-white">
                <div className="[&_svg]:h-10 [&_svg]:w-auto [&_path]:fill-white">
                    <FooterLogoIcon/>
                </div>
                <div className="max-w-md">
                    <p className="text-3xl font-semibold leading-tight">President Business Gifts</p>
                    <p className="mt-4 text-white/70">{t.dashboard.subtitle}</p>
                </div>
                <p className="text-sm text-white/50">© {new Date().getFullYear()} President Business Gifts</p>
            </section>

            <section className="flex flex-col p-6 sm:p-12">
                <div className="flex justify-end">
                    <AdminLanguageSwitcher current={lang}/>
                </div>
                <div className="flex flex-1 items-center justify-center">
                    <div className="w-full max-w-sm">
                        <div className="lg:hidden mb-10 [&_svg]:h-9 [&_svg]:w-auto">
                            <FooterLogoIcon/>
                        </div>
                        <h1 className="text-2xl font-semibold tracking-tight">{t.login.title}</h1>
                        <p className="mt-2 text-sm text-neutral-500">{t.login.subtitle}</p>
                        <LoginForm texts={t.login} next={next}/>
                    </div>
                </div>
            </section>
        </main>
    );
}
