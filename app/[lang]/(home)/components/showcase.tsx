import "@/app/globals.css";
import ShowcaseAnimation from "@/components/animation-section/showcase-animation";
import {ShowcaseDataFrom, ShowcaseItem} from "@/interface/showcase-type/showcase-type";
import {getshowCaseData} from "@/service/home-service/showcase-image.service";
import {showcaseService} from "@/service/home-service/showcase.service";
import {getLocaleContext} from "@/lib/locale-context";
import {getDictionary} from "@/lib/get-dictionary";
import {normalizeLocale} from "@/lib/i18n-config";
import {withFallbackTexts} from "@/lib/page-text";

export async function Showcase() {
    const {lang} = await getLocaleContext();
    const dictionary = await getDictionary(normalizeLocale(lang));
    const DataLayer = withFallbackTexts(
        (await showcaseService()) as Partial<ShowcaseDataFrom>,
        {
            "showcase.title": dictionary.showcase.title,
            "showcase.description": dictionary.showcase.description,
            "showcase.button": dictionary.showcase.button,
        },
    ) as ShowcaseDataFrom;
    const ImagesData: ShowcaseItem[] = await getshowCaseData() as ShowcaseItem[];

    return <ShowcaseAnimation DataLayer={DataLayer} showcase={ImagesData}/>;
};
