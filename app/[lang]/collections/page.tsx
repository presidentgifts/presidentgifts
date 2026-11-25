import {LangType} from "@/interface/lang/lang-type";
import React from "react";
import { Collections } from "./components/collections";
import { getDictionary } from "@/lib/get-dictionary";

export interface HomePageProps {
    params: Promise<{ lang: LangType }>;
}

export default async function Home({ params }: HomePageProps) {

    const HomePageParam: { lang: LangType } = await params;
    const dictionary = await getDictionary(HomePageParam.lang);
    return (
        <section className="mt-36">
            <Collections dictionary={dictionary} lang={HomePageParam.lang}/>
        </section>
    );
}
