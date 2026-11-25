import {BreadcrumbDynamic} from "@/components/shared/breadcrumb-dynamic/breadcrumb-dynamic";
import image3 from "@/public/images/soat.jpg";
import image2 from "@/public/images/sumka.jpg";
import image1 from "@/public/images/klatch.jpg";
import {B2bCard} from "@/app/[lang]/discover/components/b2b-card/b2b-card";
import {getDictionary} from "@/lib/get-dictionary";
import {normalizeLocale} from "@/lib/i18n-config";


export default async function B2BPage({params}: { params: Promise<{ lang: string }> }) {
    const dictionary = await getDictionary(normalizeLocale((await params).lang));
    const t = dictionary.ui.b2b;
    
    return (
        <div className={"container md:!mt-26 !mt-42"}>
            <BreadcrumbDynamic/>
            <div className={"md:flex  justify-between flex-col  mt-10 "}>
                <h2 className={"text-lg whitespace-pre-wrap mb-5"}>{t.title}</h2>
                <div className={"md:w-1/2 w-full"}>
                    <p className={"text-sm mb-5"}>{t.description}</p>
                </div>
            </div>

            <div>
                <B2bCard
                    top={{base: 140, md: 210, lg: 180}}
                    right={{base: 150, md: 240, lg: 190}}
                    size={45}
                    image={image1}
                    className="mt-[100px] flex-col lg:flex-row gap-10"
                    inputId="b2b-clutch"
                    title={t.clutch.title}
                    desc={t.clutch.desc}
                />
                <B2bCard
                    top={{base: 150, md: 200, lg: 180}}
                    right={{base: 90, md: 180, lg: 185}}
                    size={70}
                    image={image2}
                    className="mt-[100px] flex-col lg:flex-row-reverse gap-10"
                    inputId="b2b-bag"
                    title={t.bag.title}
                    desc={t.bag.desc}
                />
                <B2bCard
                    top={{base: 86, md: 135, lg: 130}}
                    right={{base: 142, md: 235, lg: 235}}
                    size={30}
                    image={image3}
                    className="mt-[100px] flex-col lg:flex-row gap-10"
                    inputId="b2b-watch"
                    title={t.watch.title}
                    desc={t.watch.desc}
                />
            </div>
        </div>
    )
}