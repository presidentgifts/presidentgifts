"use client";

import React, {useEffect, useState} from "react";
import Image, {StaticImageData} from "next/image";
import {useWindowSize} from "@/hooks/use-window-size";
import {getResponsiveValue, ResponsiveValue} from "@/hooks/get-responsive-value";
import {getB2bImages} from "@/service/b2b/b2b-upload";
import {useSession} from "next-auth/react";
import {MediaInterface} from "@/interface/products-interface/products-interface";
import {mediaSrc} from "@/lib/media-src";

interface RightImageProps {
    image: StaticImageData;
    size: number;
    top?: ResponsiveValue;
    right?: ResponsiveValue;
    /** Logo the user has just uploaded (shown instead of the saved one). */
    uploadedSrc?: string | null;
}

interface ImageProps {
    "id": null,
    media_file: MediaInterface
}

export default function RightImage({image, size, top, right, uploadedSrc}: RightImageProps): React.ReactElement {
    const {width} = useWindowSize();
    const adjustedTop = getResponsiveValue(top, width);
    const adjustedRight = getResponsiveValue(right, width);
    const [images, setImages] = useState<ImageProps>()
    const {data: session} = useSession();

    useEffect(() => {
        const userId = session?.user.serverData?.id;
        if (!userId) return;

        getB2bImages(userId)
            .then((response) => {
                if (response?.media_file?.filePath) setImages(response);
            })
            .catch(() => undefined);
    }, [session?.user.serverData?.id])


    let imageSrc = uploadedSrc ?? null;
    if (!imageSrc && images?.media_file?.filePath) {
        imageSrc = mediaSrc(images.media_file.filePath);
    }



    return (
        <div className="relative" data-aos="fade-left">
            <Image src={image} alt="b2b background image" width={500} height={500} className="relative"/>
            <div
                style={{
                    position: "absolute",
                    top: adjustedTop ? `${adjustedTop}px` : "auto",
                    right: adjustedRight ? `${adjustedRight}px` : "auto",
                    transform: "translate(-50%, -50%)",
                }}
            >
                {imageSrc && (
                    <Image src={imageSrc} alt="b2b image" width={size} height={size}/>
                )}
            </div>
        </div>
    );
}