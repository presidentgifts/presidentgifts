"use client";

import Image, {StaticImageData} from "next/image";
import React, {useState} from "react";
import Placeholder from "@/public/images/placeholder.png";
import RightImage from "@/app/[lang]/discover/components/b2b-card/right-image/right-image";
import {buttonVariants} from "@/components/ui/button";
import {ResponsiveValue} from "@/hooks/get-responsive-value";
import {useSession} from "next-auth/react";
import {toast} from "sonner";
import {useUiText} from "@/provider/ui-text-provider";

interface B2bCardProps {
    className?: string;
    image: StaticImageData;
    top: ResponsiveValue;
    right: ResponsiveValue;
    size: number;
    title: string;
    desc: string,
    /** Unique id of the file input (several cards are on one page). */
    inputId: string,
}

export const B2bCard = ({className, image, top, right, size, title, desc, inputId}: B2bCardProps) => {
    const t = useUiText().b2b;
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [processedImage, setProcessedImage] = useState<string | null>(null);
    const {data: session} = useSession();


    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {

        if (!session?.user?.serverData?.id) {
            toast.error(t.authErrorTitle, {
                description: t.authErrorDesc,
                className: "!bg-white !text-black",
                descriptionClassName: "!text-black"
            });
            return;
        }

        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 3 * 1024 * 1024) {
            toast.error(t.tooLarge);
            return;
        }


        setSelectedImage(file.name);
        const formData = new FormData();
        formData.append("file", file);
        // The server takes the user id from the session.

        try {
            setUploading(true);
            const res = await fetch("/api/remove-bg", {
                method: "POST",
                body: formData
            });

            if (!res.ok) throw new Error("Upload failed");

            const blob = await res.blob();
            setProcessedImage((previous) => {
                if (previous) URL.revokeObjectURL(previous);
                return URL.createObjectURL(blob);
            });

        } catch (error) {
            console.error("Upload error:", error);
            toast.error(t.uploadError);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className={`${className} flex justify-between items-center`}>
            <div>
                <h2 className="text-primary text-lg font-medium mb-5">{title}</h2>
                <p className="text-sm text-zinc-600 w-[300px] md:w-[450px]">
                    {desc}
                </p>

                <div data-aos="fade-right" className="mt-6 flex items-center gap-4 p-4 bg-white rounded border">
                    <Image src={Placeholder} alt="placeholder" width={96} height={96}/>
                    <div className="w-full">
                        <p className="text-sm text-primary mb-2">
                            {t.uploadHint}
                        </p>
                        <input id={inputId} type="file" accept="image/png" className="hidden"
                               onChange={handleImageChange}/>
                        <div className="w-full flex gap-2 items-center justify-between">
                            <div>{uploading ? t.uploading : selectedImage || t.noFile}</div>
                            <label htmlFor={inputId}
                                   className={`${buttonVariants({variant: "secondary"})} w-[30px] cursor-pointer`}>
                                {t.chooseFile}
                            </label>
                        </div>
                    </div>
                </div>

                {/*<div className="mt-6">*/}
                {/*    <p className="mb-4 text-zinc-700 text-sm font-normal leading-tight">Choose a color</p>*/}
                {/*    <RadioGroup defaultValue="indigo" className="flex gap-2">*/}
                {/*        {[*/}
                {/*            {color: "indigo", bg: "bg-indigo-300", ring: "ring-indigo-500"},*/}
                {/*            {color: "amber", bg: "bg-amber-400", ring: "ring-amber-500"},*/}
                {/*            {color: "green", bg: "bg-green-400", ring: "ring-green-500"},*/}
                {/*        ].map(({color, bg, ring}) => (*/}
                {/*            <div key={color} className="flex items-center">*/}
                {/*                <RadioGroupItem*/}
                {/*                    value={color}*/}
                {/*                    id={color}*/}
                {/*                    className={`w-6 h-6 rounded-full border-transparent cursor-pointer ${bg} */}
                {/*                    data-[state=checked]:ring-2 */}
                {/*                    data-[state=checked]:ring-offset-2 */}
                {/*                    data-[state=checked]:${ring}`}*/}
                {/*                />*/}
                {/*            </div>*/}
                {/*        ))}*/}
                {/*    </RadioGroup>*/}
                {/*</div>*/}
            </div>

            <RightImage top={top} right={right} size={size} image={image} uploadedSrc={processedImage}/>
        </div>
    );
};
