import {requireSuperAdmin} from "@/server/auth/access";
import {getAdminTexts} from "@/server/admin-locale";
import {listLanguages} from "@/server/services/reference";
import {LanguagesManager} from "./languages-manager";

export const metadata = {title: "Languages"};

export default async function LanguagesPage() {
    await requireSuperAdmin();
    const [texts, languages] = await Promise.all([getAdminTexts(), listLanguages()]);

    return (
        <LanguagesManager
            texts={texts}
            languages={languages.map(({code, name, nativeName, isActive, countries}) => ({code, name, nativeName, isActive, countries}))}
        />
    );
}
