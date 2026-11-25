import {requireSuperAdmin} from "@/server/auth/access";
import {getAdminTexts} from "@/server/admin-locale";
import {listCurrencies} from "@/server/services/reference";
import {CurrenciesManager} from "./currencies-manager";

export const metadata = {title: "Currencies"};

export default async function CurrenciesPage() {
    await requireSuperAdmin();
    const [texts, currencies] = await Promise.all([getAdminTexts(), listCurrencies()]);

    return (
        <CurrenciesManager
            texts={texts}
            currencies={currencies.map(({code, name, symbol, symbolPosition, decimals, countries}) => ({
                code,
                name,
                symbol,
                symbolPosition,
                decimals,
                countries,
            }))}
        />
    );
}
