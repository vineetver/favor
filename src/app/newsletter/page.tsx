"use client";

import { Logo } from "@/components/ui/logo";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import React from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const formSchema = z.object({
  organization: z
    .string({
      required_error: "Organization name is required",
      invalid_type_error: "Organization name must be a string",
    })
    .min(2, {
      message: "Username must be at least 2 characters.",
    })
    .max(180, {
      message: "Username must be less than 180 characters.",
    }),
  email: z
    .string({
      required_error: "Email is required",
      invalid_type_error: "Email must be a string",
    })
    .email(),
  agree: z
    .boolean({
      required_error: "You must agree to the terms and conditions to sign up",
      invalid_type_error:
        "You must agree to the terms and conditions to sign up",
    })
    .refine((v) => v === true, {
      message: "You must agree to the terms and conditions to sign up",
    }),
});

export default function Page() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      organization: "",
      email: "",
      agree: false,
    },
  });

  async function onSubmit(values: any) {
    const formData = new FormData();
    formData.append("address", values.email);
    formData.append("description", values.organization);
    formData.append("upsert", "yes");
    formData.append("subscribed", values.agree ? "yes" : "no");

    const response = await fetch("/api/newsletter", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      return toast.error("Error", {
        description: error.message,
      });
    }

    toast.success("Success", {
      description: "You have successfully signed up for our newsletter.",
    });

    form.reset();
  }

  return (
    <>
      <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <Logo className="mx-auto h-12 w-auto" />
          <h2 className="mt-10 text-center text-2xl font-medium leading-9 tracking-tight">
            Sign up for our newsletter
          </h2>
        </div>

        <Form {...form}>
          <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
            <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="example@domain.com" {...field} />
                    </FormControl>
                    <FormDescription>
                      We&#39;ll never share your email.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="organization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your organization name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="agree"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <FormDescription>
                          I agree to receive emails from your company and accept
                          the terms and conditions
                        </FormDescription>
                      </label>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <Button type="submit">Sign up</Button>
              </div>
            </form>
          </div>
        </Form>
      </div>
    </>
  );
}
