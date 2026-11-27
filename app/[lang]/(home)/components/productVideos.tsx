import ProductVideoCard from "@/components/shared/product-video-card/video-card";
import {Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious} from "@/components/ui/carousel";
import {SectionTitle} from "@/components/ui/sectionTitle";
import {productItem} from "@/constants/product-videos-item";
import {ProductVideoProps} from "@/interface/product-videos-type/product-video";
import {getLocaleContext} from "@/lib/locale-context";
import {isLocalDataSource} from "@/server/storefront/source";

interface ProductVideosProps {
    dictionary: {
        productVideos: {
            title: string;
        };
    };
}

/** Videos managed in the admin panel (Product videos); the built-in ones until any are added. */
async function loadVideos(): Promise<ProductVideoProps[]> {
    if (!isLocalDataSource()) return productItem;
    try {
        const {countryCode} = await getLocaleContext();
        const {listSiteProductVideos} = await import("@/server/services/content/product-videos");
        const videos = await listSiteProductVideos(countryCode);
        if (videos.length === 0) return productItem;
        return videos.map((v) => ({id: v.id, video: v.video!.url, instaLink: v.link}));
    } catch (error) {
        console.error("[product videos] falling back to built-in videos:", error instanceof Error ? error.message : error);
        return productItem;
    }
}

const arrowClass =
    "static translate-x-0 translate-y-0 size-11 rounded-full border border-neutral-300 bg-white text-primary shadow-none " +
    "hover:bg-primary hover:text-white disabled:opacity-30 transition-colors";

export const ProductVideos = async ({dictionary}: ProductVideosProps) => {
    const videos = await loadVideos();
    if (videos.length === 0) return null;

    return (
        <div className="relative w-full bg-white py-8">
            <Carousel opts={{align: "start", slidesToScroll: 1, containScroll: "trimSnaps"}}>
                <div className="container flex items-end justify-between gap-6">
                    <SectionTitle text={dictionary.productVideos.title}/>
                    {/* Arrows sit next to the title, never on top of a video, so a click on them can't open a video link. */}
                    <div className="hidden shrink-0 gap-3 md:flex">
                        <CarouselPrevious className={arrowClass}/>
                        <CarouselNext className={arrowClass}/>
                    </div>
                </div>

                <div className="mx-auto mt-5 w-full max-w-[1400px] px-4 sm:px-6 md:mt-12 md:px-8">
                    <CarouselContent>
                        {videos.map((item) => (
                            <CarouselItem
                                key={item.id}
                                className="h-[420px] basis-[78%] sm:h-[450px] sm:basis-[45%] md:basis-[31%] lg:basis-[23%] xl:basis-[20%]"
                            >
                                <ProductVideoCard productItem={item}/>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                </div>
            </Carousel>
        </div>
    );
};
