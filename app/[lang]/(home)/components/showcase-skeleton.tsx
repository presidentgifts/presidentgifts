export function ShowcaseSkeleton() {
    return (
        <div className="relative h-screen shadow-2xl overflow-hidden bg-neutral-900">
            <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-neutral-800 via-neutral-900 to-neutral-800" />

            {/* shimmer overlay */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-[1]" />

            <div className="relative z-10 h-full w-full flex flex-col justify-end py-8 px-4 md:pb-[90px]">
                <div className="container space-y-4">
                    {/* title skeleton */}
                    <div className="space-y-3 mb-3">
                        <div className="h-10 md:h-14 w-full md:w-[580px] rounded-lg bg-white/10 animate-pulse" />
                        <div className="h-10 md:h-14 w-3/4 md:w-[420px] rounded-lg bg-white/10 animate-pulse" />
                    </div>

                    {/* description skeleton */}
                    <div className="space-y-2 mb-10">
                        <div className="h-4 w-56 md:w-[480px] rounded bg-white/10 animate-pulse" />
                        <div className="h-4 w-44 md:w-[380px] rounded bg-white/10 animate-pulse" />
                    </div>

                    {/* button skeleton */}
                    <div className="h-12 w-full sm:w-52 rounded-[12px] bg-white/10 animate-pulse" />
                </div>
            </div>
        </div>
    );
}
