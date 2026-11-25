'use client';

import {Heart} from "lucide-react";
import {Button} from "@/components/ui/button";
import {useRouter} from "next/navigation";
import {useUiText} from "@/provider/ui-text-provider";


export const LikeNotFound = () => {
    const router = useRouter();
    const t = useUiText().account.favorites;

    return (
        <div className="text-center max-w-md flex flex-col gap-4 items-center mx-auto px-4">
            <div className="flex justify-center mb-6">
                <Heart size={100} className="text-primary" fill="#00093f"/>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-primary mb-2">
                {t.title}
            </h2>
            <p className="text-primary">
                {t.emptyText}
            </p>
            <Button
                onClick={() => router.push("/shops/news")}
                variant={"default"}
                className={"mt-10"}
            >
                {t.continueShopping} →
            </Button>
        </div>
    )
};
