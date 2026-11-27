"use client";

import React, {useEffect, useRef, useState} from "react";
import {ProductVideoProps} from "@/interface/product-videos-type/product-video";

const ProductVideoCard: React.FC<{ productItem: ProductVideoProps }> = ({productItem}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const play = async () => {
        const video = videoRef.current;
        if (!video || !video.paused) return;
        try {
            await video.play();
            setIsPlaying(true);
        } catch {
            // Autoplay can be refused (e.g. low-power mode); the poster frame stays.
        }
    };

    const stop = () => {
        const video = videoRef.current;
        if (!video || video.paused) return;
        video.pause();
        video.currentTime = 0;
        setIsPlaying(false);
    };

    // Touch screens have no hover: play while the card is on screen instead.
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !window.matchMedia("(hover: none)").matches) return;
        const observer = new IntersectionObserver(
            ([entry]) => (entry.isIntersecting ? void play() : stop()),
            {threshold: 0.6},
        );
        observer.observe(video);
        return () => observer.disconnect();
    }, []);

    const card = (
        <div
            className="group relative h-full overflow-hidden rounded-[4px] bg-neutral-900"
            onMouseEnter={play}
            onMouseLeave={stop}
        >
            <video
                ref={videoRef}
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                src={productItem.video}
                muted
                loop
                preload="metadata"
                playsInline
                suppressHydrationWarning
            />

            <div
                className={`pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity duration-300 ${isPlaying ? "opacity-0" : "opacity-100"}`}
            >
                <div className="flex size-12 items-center justify-center rounded-full bg-white/50 backdrop-blur-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="ml-1 size-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6 4l10 6-10 6V4z"/>
                    </svg>
                </div>
            </div>
        </div>
    );

    if (!productItem.instaLink) return card;
    return (
        <a href={productItem.instaLink} target="_blank" rel="noopener noreferrer" className="block h-full cursor-pointer">
            {card}
        </a>
    );
};

export default ProductVideoCard;
