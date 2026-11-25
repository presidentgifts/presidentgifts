import {LangType} from "@/interface/lang/lang-type";
import { getDictionary } from "@/lib/get-dictionary";
import LikePage from "./like";

interface LikeProps {
  params: Promise<{
    lang: LangType;
  }>;
}

export default async function Like({ params }: LikeProps) {
  const param = await params.then((params) => params);
  const dictionary = await getDictionary(param.lang);

  return (
   <LikePage dictionary={dictionary} lang={param.lang}/>
  );
}
