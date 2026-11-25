"use client";

import {AlertTriangle} from "lucide-react";
import {Button} from "@/components/ui/button";

export default function AdminError({error, reset}: { error: Error & { digest?: string }; reset: () => void }) {
    const forbidden = error.name === "ForbiddenError" || error.message === "Forbidden";

    return (
        <div className="mx-auto mt-16 max-w-md rounded-lg border border-neutral-200 bg-white p-8 text-center">
            <AlertTriangle className="mx-auto size-8 text-amber-500"/>
            <p className="mt-4 font-semibold">{forbidden ? "403" : "Error"}</p>
            <p className="mt-1 text-sm text-neutral-500">
                {forbidden ? "You don't have access to this section." : "Something went wrong."}
            </p>
            {error.digest && <p className="mt-2 font-mono text-xs text-neutral-400">{error.digest}</p>}
            <Button variant="outline" size="lg" className="mt-6" onClick={reset}>
                Retry
            </Button>
        </div>
    );
}
