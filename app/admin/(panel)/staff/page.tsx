import {ForbiddenError, getAccessibleCountries, getActiveCountryCode, hasPermission, requireAdmin} from "@/server/auth/access";
import {PERMISSIONS} from "@/server/auth/permissions";
import {getAdminTexts} from "@/server/admin-locale";
import {listCountryStaff, listRoles, listSuperAdmins} from "@/server/services/staff";
import {Card, PageHeader} from "@/components/admin/kit";
import {StaffManager} from "./staff-manager";

export const metadata = {title: "Staff"};

export default async function StaffPage() {
    const ctx = await requireAdmin();
    const texts = await getAdminTexts();
    const t = texts.staffPage;

    const countryCode = await getActiveCountryCode(ctx);
    if (!countryCode) {
        return (
            <div className="space-y-6">
                <PageHeader title={t.title}/>
                <Card className="p-10 text-center text-sm text-neutral-500">{t.noCountry}</Card>
            </div>
        );
    }

    if (!hasPermission(ctx, PERMISSIONS.usersManage, countryCode)) throw new ForbiddenError();
    const isSuper = ctx.user.isSuperAdmin;

    const [countries, staff, roles, superAdmins] = await Promise.all([
        getAccessibleCountries(ctx),
        listCountryStaff(countryCode),
        listRoles(),
        isSuper ? listSuperAdmins() : Promise.resolve([]),
    ]);
    const countryName = countries.find((c) => c.code === countryCode)?.name ?? countryCode;

    // Only the parts of each account the page shows; dates as ISO strings for the client.
    const toRow = (u: { id: string; email: string; fullName: string; isActive: boolean; lastLoginAt: Date | null }) => ({
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        isActive: u.isActive,
        lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    });

    return (
        <StaffManager
            texts={texts}
            currentUserId={ctx.user.id}
            isSuperAdmin={isSuper}
            country={{code: countryCode, name: countryName}}
            staff={staff.map((s) => ({...toRow(s), roleKey: s.roleKey, otherCountries: s.otherCountries}))}
            superAdmins={superAdmins.map(toRow)}
            roles={roles.map((r) => ({key: r.key, name: texts.roles[r.key] ?? r.name, description: r.description}))}
        />
    );
}
