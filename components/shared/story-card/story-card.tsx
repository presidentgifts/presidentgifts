"use client";
import {LangType} from "@/interface/lang/lang-type";
import {FC} from "react";
import Image, {StaticImageData} from "next/image";
import Link from "next/link";
import {Button} from "@/components/ui/button";

interface StoryCardProps {
    storyItem: {
        id: number;
        name: {
            uz: string;
            ru: string;
            en: string;
            az: string;
            tj: string;

        };
        link: string;
        image: StaticImageData;
    };
    dictionary:{
        homepage:{
            more:string
        },
        story:{
            story:string
        }
    },
    lang: LangType
}


export const StoryCard: FC<StoryCardProps> = ({storyItem,dictionary,lang}) => {

    return (
        <div className={"w-[100%] h-[100%] text-center"}>

            <Image
                src={storyItem.image}
                width={1000}
                height={1000}
                className={"w-full h-[400px] md:h-[500px] object-cover"}
                alt={`${storyItem.name[lang]}`}
            />
            <h4
                className={
                    "self-stretch justify-start text-gray-800 text-xl font-medium mt-2.5 leading-9"
                }
            >
                {storyItem?.name[lang]}
            </h4>
            <Link
                href={storyItem.link}
                passHref={true}
                className={"inline-block w-[70%] max-w-52"}
            >
                <Button variant={"secondary"} className={"w-full mt-5"}>
                    {dictionary.homepage.more}
                </Button>
            </Link>
        </div>
    );
};
