"use client";

import {useState} from "react";
import {useFormContext, useWatch} from "react-hook-form";
import {FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import dynamic from "next/dynamic";
import {useUiText} from "@/provider/ui-text-provider";

const LeafletMap = dynamic(() => import("./map-modal"), {ssr: false});

const AddressForm = () => {
    const {control, setValue} = useFormContext();
    const t = useUiText().order;
    const [isOpen, setIsOpen] = useState(false);

    const location = useWatch({name: "address.location", control});

    const [tempPosition, setTempPosition] = useState(location);

    const handleSave = () => {
        if (tempPosition) {
            setValue("address.location", tempPosition, {
                shouldValidate: true,
                shouldDirty: true
            });
            setIsOpen(false);
        }
    };

    return (
        <div className="p-6 rounded-[4px] border">
            <h2 className="text-lg font-semibold mb-4">
                {t.deliveryTitle}
            </h2>

            <div className="space-y-5">
                <FormField
                    control={control}
                    name="address.text"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel className="text-sm">{t.addressLabel}</FormLabel>
                            <FormControl>
                                <Input placeholder={t.addressPlaceholder} {...field} />
                            </FormControl>
                            <p className="text-sm text-muted-foreground">
                                {t.addressHint}
                            </p>
                            <FormMessage/>
                        </FormItem>
                    )}
                />

                <FormField
                    control={control}
                    name="address.location"
                    render={() => (
                        <FormItem>
                            <FormLabel className="text-sm">{t.mapLabel}</FormLabel>
                            <FormControl>
                                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                                    <DialogTrigger asChild>
                                        <Button type="button" variant="default" className="w-full">
                                            {location ? `${t.mapButton} ✓` : t.mapButton}
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-4xl">
                                        <DialogHeader>
                                            <DialogTitle>{t.mapDialogTitle}</DialogTitle>
                                            <DialogDescription>
                                                {t.mapDialogDescription}
                                            </DialogDescription>
                                        </DialogHeader>

                                        <LeafletMap
                                            position={tempPosition}
                                            setPosition={setTempPosition}
                                        />

                                        <div className="flex justify-end pt-4">
                                            <Button onClick={handleSave} type="button" disabled={!tempPosition}>
                                                {t.saveLocation}
                                            </Button>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </FormControl>
                            <FormMessage/>
                        </FormItem>
                    )}
                />
            </div>
        </div>
    );
};

export default AddressForm;
