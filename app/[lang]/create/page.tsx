import {LangType} from "@/interface/lang/lang-type";
import { getDictionary } from "@/lib/get-dictionary";
import { CreateContentClient } from "./CreateContentClient";

interface CreatePageProps {
        params: Promise<{ lang: LangType }>;
}

export default async function CreateContentPage({ params }: CreatePageProps) {
    
   const CreatePageParam : {lang: LangType} = await params;
   const dictionary = await getDictionary(CreatePageParam.lang);

    return <CreateContentClient dictionary={dictionary} />;
}
