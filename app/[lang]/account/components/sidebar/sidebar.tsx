"use client"

import Link from 'next/link'
import {usePathname} from 'next/navigation'
import clsx from 'clsx'
import {useState} from 'react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {signOut} from "next-auth/react"
import {useUiText} from "@/provider/ui-text-provider"

const links = [
    {href: '/account', key: 'details'},
    {href: '/account/favorite', key: 'favorites'},
    {href: '/account/order', key: 'orders'},
    {href: '/account/change-password', key: 'changePassword'},
    {href: '/account/change-email', key: 'changeEmail'},
] as const

export default function AccountSidebar({lang}: { lang: string | undefined }) {
    const pathname = usePathname()
    const t = useUiText()
    const [showLogoutModal, setShowLogoutModal] = useState(false)
    const normalizedPathname = pathname?.replace(`/${lang}`, '') || ''

    const handleLogout = () => {
        signOut({callbackUrl: '/'})
    }

    return (
        <>
            <div className="w-full md:max-w-[200px] flex md:flex-col gap-2 overflow-x-auto whitespace-nowrap">
                {links.map((link) => (
                    <Link
                        key={link.href}
                        href={lang ? `/${lang}${link.href}` : link.href}
                        className={clsx(
                            'px-4 py-2 rounded-md text-sm font-medium min-w-max',
                            normalizedPathname === link.href
                                ? 'bg-gray-200 text-black'
                                : 'text-gray-600 hover:bg-gray-100'
                        )}
                    >
                        {t.account.nav[link.key]}
                    </Link>
                ))}
                <button
                    onClick={() => setShowLogoutModal(true)}
                    className={clsx(
                        'px-4 py-2 rounded-md text-sm font-medium text-left',
                        'text-gray-600 hover:bg-gray-100 cursor-pointer'
                    )}
                >
                    {t.account.nav.logout}
                </button>
            </div>

            <AlertDialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t.account.logoutConfirm}</AlertDialogTitle>
                    </AlertDialogHeader>
                    <AlertDialogFooter className={"w-full flex items-center justify-center mt-5"}>
                        <AlertDialogCancel className={"w-[50%]"}>{t.common.no}</AlertDialogCancel>
                        <AlertDialogAction
                            className={"w-[50%]"}
                            onClick={handleLogout}
                        >
                            {t.common.yes}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
