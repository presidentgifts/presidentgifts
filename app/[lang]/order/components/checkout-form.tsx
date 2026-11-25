"use client";

import { useEffect } from "react";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useFormContext } from "react-hook-form";
import { useSession } from "next-auth/react";
import { useUiText } from "@/provider/ui-text-provider";

export default function CheckoutForm() {
  const { control, resetField } = useFormContext();
  const { data: session } = useSession();
  const t = useUiText().order;

  useEffect(() => {
    if (session?.user) {
      const fullName =
        session.user.authType === "custom"
          ? session.user.serverData?.full_name
          : session.user.name;
      if (fullName) {
        const [firstName = "", ...rest] = fullName.trim().split(/\s+/);
        const secondName = rest.join(" ");
        resetField("userInformation.name", {
          defaultValue: firstName.trim() || "",
        });
        resetField("userInformation.secondment", {
          defaultValue: secondName.trim() || "",
        });
      }
    }
  }, [session, resetField]);

  return (
    <div className="p-6 rounded-[4px] border mt-4">
      <h2 className="text-lg font-semibold mb-4">{t.recipientTitle}</h2>

      <div className="space-y-5">
        <FormField
          control={control}
          name="userInformation.name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.firstName}</FormLabel>
              <FormControl>
                <Input placeholder={t.firstNamePlaceholder} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="userInformation.secondment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.lastName}</FormLabel>
              <FormControl>
                <Input placeholder={t.lastNamePlaceholder} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="userInformation.phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.phone}</FormLabel>
              <FormControl>
                <Input type="tel" placeholder={t.phonePlaceholder} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="userInformation.secondPhone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.secondPhone}</FormLabel>
              <FormControl>
                <Input type="tel" placeholder={t.phonePlaceholder} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}