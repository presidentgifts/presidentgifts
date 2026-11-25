"use client"

import {AccountTitle} from "@/app/[lang]/account/account-title/account-title";
import {useWishlistStore} from "@/lib/set-wishlist.storage";
import {Button} from "@/components/ui/button";
import FavoriteCard from "@/components/shared/favorite-card/favorite-card";
import Link from "next/link";
import {Heart} from "lucide-react";
import {formatText, useUiText} from "@/provider/ui-text-provider";

interface FavoriteProps{
    dictionary:{
        like: {
            addToBasket: string;
          };
    }
}

export default function FavoritePage({dictionary}:FavoriteProps) {
    const {items, removeFromWishlist} = useWishlistStore();
    const t = useUiText().account.favorites;

    return (
        <div>
            <AccountTitle text={t.title}/>
            {items.length > 0 && (<p className="text-primary text-sm font-medium leading-tight mt-3">
                {formatText(t.count, {count: items.length})}
            </p>)}

            {items.length === 0 ? (
                <div className="mt-10 text-center">
                    <div className="mb-4">
                        <Heart className="w-12 h-12 mx-auto text-gray-400"/>
                    </div>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                        {t.emptyText}
                    </p>
                    <Link href="/shops/news">
                        <Button variant="default">
                            {t.continueShopping}
                        </Button>
                    </Link>
                </div>
            ) : (
                <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((item) => (
                        <FavoriteCard
                            key={item}
                            itemID={item}
                            onRemove={() => removeFromWishlist(item)}
                            dictionary={dictionary}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}