"use client";
import { FC } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { NewsItemInterface } from "@/interface/news-home-page/news";
import {mediaSrc} from "@/lib/media-src";
// import {NewsItem} from "@/interface/news-home-page/news";

interface DictionaryProps {
  homepage: { more: string };
  news: {
    title: string;
    newArrival: string;
};
}

export const NewsCard: FC<{
  newsItem: NewsItemInterface;
  dictionary: DictionaryProps;
}> = ({ newsItem, dictionary }) => {
  return (
    <div
      className={"w-[100%] h-[100%] text-center mb-14 flex flex-col relative"}
    >
      {newsItem?.image_page?.filePath && (
        <Image
          src={mediaSrc(newsItem?.image_page?.filePath)}
          width={1000}
          height={1000}
          className={"w-full h-[400px] md:h-[500px] object-cover"}
          alt={`${newsItem.title}`}
        />
      )}
      <h4
        className={
          "self-stretch justify-start text-gray-800 text-xl font-medium mt-2.5 leading-7 line-clamp-2 px-3"
        }
      >
        {newsItem?.title}
      </h4>
      <Link
        href={`/new/${newsItem.title}id${newsItem.id}`}
        passHref={true}
        className={` absolute -bottom-0  w-full`}
      >
        <Button variant={"secondary"} className={"w-[70%] max-w-52 mt-5"}>
          {dictionary?.homepage.more}
        </Button>
      </Link>
    </div>
  );
};
