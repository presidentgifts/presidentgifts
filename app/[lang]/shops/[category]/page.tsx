import {LangType} from "@/interface/lang/lang-type";
import { BreadcrumbDynamic } from "@/components/shared/breadcrumb-dynamic/breadcrumb-dynamic";
import SortAndViewToggleWrapper from "@/components/shared/sort-View-toggle/sort-viewtoggle";
import CategoryCarousel from "@/app/[lang]/shops/components/category-carusel/category-carusel";
import { CategoryChildServiceUZ } from "@/service/category-service/category.shops.service";
import { CategoryInterface } from "@/interface/category-type/category-interface";
import { ProductChildService } from "@/service/products-service/products.service";
import { ProductsInterface } from "@/interface/products-interface/products-interface";
import { splitNameAndIdFromParam } from "@/hooks/get-breadcrumb";
import { CategoryDetailService } from "@/service/category-service/category-child.service";
import { AlertTriangle } from "lucide-react";
import { getDictionary } from "@/lib/get-dictionary";
import { notFound } from "next/navigation";

interface CategoryPageProps {
  params: Promise<{ lang: LangType; category: string }>;
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const categoryParam = await params;
  const categoryId = splitNameAndIdFromParam(categoryParam.category);
  if (!categoryId.id) notFound();
  const dictionary = await getDictionary(categoryParam.lang);

  const CategoryChildData = (await CategoryChildServiceUZ(
    Number(categoryId.id)
  )) as CategoryInterface | null;
  const ProductList = ((await ProductChildService(Number(categoryId.id))) ?? {data: []}) as {
    data: ProductsInterface[];
    totalElements?: number;
  };
  ProductList.data ??= [];
  const CategoryDetailData2 = (await CategoryDetailService(
    categoryId.id || ""
  )) as CategoryInterface | null;
  if (!CategoryDetailData2) notFound();
  

    return (
        <div className="container md:!mt-26 !mt-42">
            <BreadcrumbDynamic url={CategoryDetailData2.name || undefined}/>
            <div>
                <h2 className="text-primary mt-10 text-xl font-medium leading-loose">
                    {CategoryDetailData2.name}
                </h2>
                <p className="text-zinc-700 text-sm font-normal leading-tight mt-4 mb-11">
                    {CategoryDetailData2.description}
                </p>

        {CategoryChildData && CategoryChildData.children?.length > 0 && (
          <CategoryCarousel
            categories={CategoryChildData}
            lang={categoryParam.lang}
            dictionary={dictionary}
          />
        )}

        {ProductList.data.length === 0 ? (
          <div className="w-full flex flex-col items-center justify-center py-20 text-center">
            <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-800">
              {dictionary.category.not_found}
            </h2>
            <p className="text-gray-600 mt-2 max-w-md">
              {dictionary.category.unavailable}
            </p>
          </div>
        ) : (
          <SortAndViewToggleWrapper
            products={ProductList.data}
            total={ProductList.totalElements}
            categoryId={Number(categoryId.id)}
            dictionary={dictionary}
          />
        )}
      </div>
    </div>
  );
}
