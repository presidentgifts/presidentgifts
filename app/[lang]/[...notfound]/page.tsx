import {LangType} from "@/interface/lang/lang-type";
import { getDictionary } from '@/lib/get-dictionary';
import ServerErrorPage from './notFound';

interface ServerErrorProps {
    params: Promise<{
      lang: LangType;
    }>;
  }
  
  export default async function ServerError({ params }: ServerErrorProps) {
    const param = await params.then((params) => params);
    const dictionary = await getDictionary(param.lang);

    return (
       <ServerErrorPage dictionary={dictionary}/>
    );
}
