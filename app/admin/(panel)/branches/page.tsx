import {getCatalogContext} from "@/server/services/catalog/context";
import {CONTENT_WORKFLOW} from "@/server/services/catalog/common";
import {listBranches} from "@/server/services/content/branches";
import {Card, PageHeader} from "@/components/admin/kit";
import {BranchesManager} from "./branches-manager";

export const metadata = {title: "Branches"};

export default async function BranchesPage() {
    const {texts, country} = await getCatalogContext(undefined, CONTENT_WORKFLOW);
    if (!country) {
        return (
            <div className="space-y-6">
                <PageHeader title={texts.branchesPage.title}/>
                <Card className="p-10 text-center text-sm text-neutral-500">{texts.catalog.noCountry}</Card>
            </div>
        );
    }
    return <BranchesManager key={country.code} texts={texts} country={country} branches={await listBranches(country.code)}/>;
}
