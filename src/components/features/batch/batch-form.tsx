"use client";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { FieldInput } from "~/components/ui/field-input";
import { Button } from "~/components/ui/button";
import React from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Info, RotateCw, XIcon } from "lucide-react";
import { sendBatchAnnotation } from "~/lib/data/batch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Tooltip } from "~/components/ui/tooltip";

const ACCEPTED_FILE_TYPES = [
  "text/plain",
  "text/csv",
  "text/tsv",
  "text/vcard",
  "application/gzip",
  "application/x-gzip",
];
const MB_BYTES = 1000000;

const formSchema = z.object({
  organization: z
    .string({
      required_error: "Organization name is required",
      invalid_type_error: "Organization name must be a string",
    })
    .min(4, {
      message: "Organization must be at least 4 characters.",
    })
    .max(180, {
      message: "Organization must be less than 180 characters.",
    }),
  email: z
    .string({
      required_error: "Email is required",
      invalid_type_error: "Email must be a string",
    })
    .email(),
  coordinateSystem: z.string(),
  leftNormalization: z.boolean(),
  outputContentType: z.string({
    required_error: "Output content type is required",
    invalid_type_error: "Output content type must be a string",
  }),
  file: z
    .custom<File>((v) => v instanceof File, {
      message: "File is required",
    })
    .refine((file) => {
      return file.size <= 35 * MB_BYTES; // Update this line
    }, `File size should be less than 35MB.`)
    .refine(
      (file) => ACCEPTED_FILE_TYPES.includes(file.type),
      'File type should be "text" or "application/gzip".',
    ),
});

export function BatchForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      organization: "",
      email: "",
      file: undefined,
      coordinateSystem: "1-base",
      leftNormalization: false,
      outputContentType: "text/csv",
    },
  });

  function handleToast(toast: any) {
    return toast;
  }

  async function onSubmit(values: any) {
    const formData = new FormData();
    const contentType = values.file.type;
    formData.append("email", values.email);
    formData.append("organization", values.organization);
    formData.append("input-type", contentType);
    formData.append("output-type", values.outputContentType);
    formData.append("file", values.file);
    formData.append("left-normalization", values.leftNormalization.toString());
    formData.append("coordinate-system", values.coordinateSystem);

    const response = await sendBatchAnnotation(formData);
    const data = await response.json();

    if (response.ok) {
      return handleToast(
        toast.success("Your file has been queued", {
          description: "We will email you when the results are ready.",
          classNames: {
            actionButton:
              "group-[.toaster]:bg-green group-[.toaster]:text-on-green",
          },
          action: {
            label: <XIcon className="h-4 w-4" />,
            onClick: () => {
              toast.dismiss();
            },
          },
        }),
      );
    } else {
      return handleToast(
        toast.error("An error occurred", {
          description:
            data?.message ||
            "Sorry for the inconvenience. We are working to fix this.",
          classNames: {
            actionButton:
              "group-[.toaster]:bg-red group-[.toaster]:text-on-red",
          },
          action: {
            label: <XIcon className="h-4 w-4" />,
            onClick: () => {
              toast.dismiss();
            },
          },
        }),
      );
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="organization"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organization</FormLabel>
              <FormControl>
                <FieldInput
                  placeholder="Enter your organization name"
                  {...field}
                  className="max-w-xs"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <FieldInput
                  placeholder="example@domain.com"
                  {...field}
                  className="max-w-xs"
                />
              </FormControl>
              <FormDescription>
                We will email you when the results are ready.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="coordinateSystem"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <div className="flex items-center">
                  <p>Coordinate System</p>
                  <Tooltip
                    content={`Choose the coordinate system for the annotation type.
                              Some formats are 0-based (e.g., BED, BAM, BCF) while others are 1-based (e.g.,
                              GTF, GFF, SAM, VCF).
                              For example, Ensembl uses a 1-based coordinate system, while UCSC uses a 0-based system. Additionally, some file formats like GFF, SAM, and VCF are 1-based, whereas others like BED and BAM are 0-based.
                              In R, coordinate conversions happen automatically with some functions. Be
                              mindful of this to avoid errors.
                              `}
                  >
                    <Info className="ml-2 h-5 w-5 cursor-pointer fill-on-surface text-surface" />
                  </Tooltip>
                </div>
              </FormLabel>
              <FormControl>
                <Select
                  defaultValue="1-base"
                  onValueChange={field.onChange}
                  value={field.value.toString()}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select annotation type" />
                  </SelectTrigger>
                  <SelectContent className="w-full">
                    <SelectItem value="1-base">1-Base</SelectItem>
                    <SelectItem value="0-base">0-Base</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="leftNormalization"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <div className="flex items-center">
                  <p>Left Normalization</p>
                  <Tooltip
                    content={`Left normalization shifts the start position of a variant to the left until it can no longer be shifted, ensuring consistency in variant representation.
            VCF files often contain multi-allelic variants that should be split into separate lines and left-normalized for accurate annotation.
            Use tools like bcftools norm for this process before annotating.`}
                  >
                    <Info className="ml-2 h-5 w-5 cursor-pointer fill-on-surface text-surface" />
                  </Tooltip>
                </div>
              </FormLabel>
              <FormControl>
                <Select
                  defaultValue="false"
                  onValueChange={(value) => field.onChange(value === "true")}
                  value={field.value.toString()}
                  disabled
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select left normalization" />
                  </SelectTrigger>
                  <SelectContent className="w-full">
                    <SelectItem value="true">True</SelectItem>
                    <SelectItem value="false">False</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="outputContentType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <div className="flex items-center">
                  <p>Output Content Type</p>
                  <Tooltip
                    content={`Choose the output content type for the annotation results.
                              The default output is text/csv, but you can choose text/json or text/tsv if needed.`}
                  >
                    <Info className="ml-2 h-5 w-5 cursor-pointer fill-on-surface text-surface" />
                  </Tooltip>
                </div>
              </FormLabel>
              <FormControl>
                <Select
                  defaultValue="text/csv"
                  onValueChange={field.onChange}
                  value={field.value.toString()}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select output content type" />
                  </SelectTrigger>
                  <SelectContent className="w-full">
                    <SelectItem value="text/csv">CSV</SelectItem>
                    <SelectItem value="application/json">JSON</SelectItem>
                    <SelectItem value="text/tsv">TSV</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="file"
          render={({ field: { value, onChange, ...field } }) => (
            <FormItem>
              <FormLabel>Input File</FormLabel>
              <FormControl>
                <motion.div className="mt-2 flex flex-col items-center justify-center rounded-large border border-dashed border-primary px-6 py-10 text-body-md">
                  <div className="text-center">
                    <div className="flex flex-row items-center leading-6">
                      {value ? (
                        <div className="text-left">
                          <motion.div
                            initial={{ opacity: 0.5, y: -50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -50 }}
                            transition={{ duration: 0.3 }}
                          >
                            <div className="rounded-small p-4">
                              <div className="flex">
                                <div className="ml-3">
                                  <div className="text-body-md font-medium text-primary">
                                    {value.name}
                                  </div>
                                  <div className="mt-2 text-body-md">
                                    <p>
                                      Submit the file for annotation by clicking
                                      the submit button or choose a different
                                      file.
                                    </p>
                                  </div>
                                  <div className="mt-8">
                                    <div className="-mx-2 -my-1.5 flex">
                                      <Button
                                        type="button"
                                        variant="elevated"
                                        className="text-on-surface-variant"
                                        onClick={() => {
                                          onChange(undefined);
                                        }}
                                      >
                                        Choose file
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <span className="relative  rounded-large font-medium text-primary focus-within:outline-none  hover:opacity-[0.92]">
                            Upload a file
                          </span>
                          <input
                            {...field}
                            type="file"
                            accept={ACCEPTED_FILE_TYPES.join(",")}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                onChange(file);
                              }
                            }}
                            className="sr-only"
                          />
                          <span className="pl-1.5">or drag and drop</span>
                          <p className="pt-1.5 leading-5">
                            TXT, GZ up to 35MB
                          </p>
                        </label>
                      )}
                    </div>
                  </div>
                </motion.div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" onClick={handleToast}>
          {form.formState.isSubmitting ? (
            <>
              <RotateCw className="mr-2 h-4 w-4 animate-spin" />
              Submitting
            </>
          ) : (
            <>Submit</>
          )}
        </Button>
      </form>
    </Form>
  );
}
