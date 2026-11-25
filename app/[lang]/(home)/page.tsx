import {LangType} from "@/interface/lang/lang-type";
import {Showcase} from "@/app/[lang]/(home)/components/showcase";
import {ShowcaseSkeleton} from "@/app/[lang]/(home)/components/showcase-skeleton";
import {News} from "@/app/[lang]/(home)/components/news";
import {About} from "./components/about";
import {Collections} from "@/app/[lang]/(home)/components/collections";
import {ProductVideos} from "./components/productVideos";
import {SupportForm} from "@/app/[lang]/(home)/components/support-form";
import AnimatedSection from "@/components/animation-section/animation-section";
import BusinessGifts from "@/app/[lang]/(home)/components/businessgifts";
import Location from "@/app/[lang]/(home)/components/location";
import {getDictionary} from "@/lib/get-dictionary";
import React, {Suspense} from "react";
import {Category} from "@/app/[lang]/(home)/components/category";
import {StorySection} from "@/app/[lang]/(home)/components/story";

interface HomePageProps {
    params: Promise<{ lang: LangType, category: string }>;
}

export default async function Home({params}: HomePageProps) {

    const HomePageParam: { lang: LangType, category: string } = await params;
    const dictionary = await getDictionary(HomePageParam.lang);


    return (
        <>
            <section>
                <Suspense fallback={<ShowcaseSkeleton/>}>
                    <Showcase/>
                </Suspense>
            </section>
            <section className="mt-10 md:mt-[100px]">
                <AnimatedSection animation={"fade-right"}>
                    <News dictionary={dictionary}/>
                </AnimatedSection>
            </section>
            <section className="mt-[100px]">
                <AnimatedSection animation={"fade-left"}>
                    <About/>
                </AnimatedSection>
            </section>
            <section className={"mt-[100px]"}>
                {/* <AnimatedSection animation={"fade-left"}> */}
                    <Category dictionary={dictionary} lang={HomePageParam.lang}/>
                {/* </AnimatedSection> */}
            </section>
            <section className={"mt-[100px]"}>
                <Collections dictionary={dictionary}/>
            </section>
            <section className="mt-[100px]">
                <ProductVideos dictionary={dictionary}/>
            </section>
            <section className="mt-[100px] bg-[#F6F6F6] py-8">
                <SupportForm showtime={true} dictionary={dictionary}></SupportForm>
            </section>
            <section className="mt-[100px]  ">
                <BusinessGifts dictionary={dictionary}/>
            </section>
            <section className={'mt-[100px]'}>
                <StorySection dictionary={dictionary} lang={HomePageParam.lang}/>
            </section>
            <section className="mt-[100px] py-10 ">
                <Location lang={HomePageParam.lang} dictionary={dictionary}/>
            </section>
        </>
    );
}
