import {LangType} from "@/interface/lang/lang-type";
import React from "react";

import CustomAccordion from "@/components/shared/custom-accordion/custom-accordion";
import { tabsType } from "@/constants/care-services-items";
const InstrumentAccordion = ({
  data,
  lang,
}: {
  data: tabsType[];
  lang: LangType;
}) => {
  return (
    <>
      {data.map((item) => (
        <CustomAccordion
          key={item.id}
          itemValue={item.value}
          accordionTrigger={item.accordionTrigger[lang]}
          accordionContent={item.accordionContent[lang]}
          accordionContentStyles="text-sm font-normal"
          accordionTriggerStyles="font-medium"
          className="my-3 md:my-4 border-b"
        />
      ))}
    </>
  );
};

export default InstrumentAccordion;
