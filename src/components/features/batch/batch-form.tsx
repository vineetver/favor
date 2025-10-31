"use client";

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
import { Button } from "@/components/ui/button";
import React from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Info, RotateCw, XIcon } from "lucide-react";
import { sendBatchAnnotation, sendHg19BatchAnnotation } from "@/lib/data/batch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const ACCEPTED_FILE_TYPES = [
  ".txt",
  ".csv",
  ".tsv",
  ".vcf",
  ".gz",
  "text/plain",
  "text/csv",
  "text/tsv",
  "text/tab-separated-values",
  "text/vcard",
  "text/x-vcard",
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
  genome: z.enum(["hg38"], {
    required_error: "Genome assembly is required",
  }),
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
      return file.size <= 35 * MB_BYTES;
    }, `File size should be less than 35MB.`)
    .refine(
      (file) => {
        const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        const validExtensions = ['.txt', '.csv', '.tsv', '.vcf', '.gz'];
        const validMimeTypes = [
          'text/plain',
          'text/csv',
          'text/tsv',
          'text/tab-separated-values',
          'text/vcard',
          'text/x-vcard',
          'application/gzip',
          'application/x-gzip',
        ];
        return validExtensions.includes(fileExt) || validMimeTypes.includes(file.type) || file.type === '';
      },
      'File must be TXT, CSV, TSV, VCF, or GZ format.',
    ),
});

export function BatchForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      organization: "",
      email: "",
      genome: "hg38" as "hg38",
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

    // Choose the appropriate API based on genome assembly
    const response =
      values.genome === "hg19"
        ? await sendHg19BatchAnnotation(formData)
        : await sendBatchAnnotation(formData);

    // Handle different response types
    if (values.genome === "hg19" && response.ok) {
      // For hg19, we get the file directly - download it
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      const contentDisposition = response.headers.get("content-disposition");
      const filename =
        contentDisposition?.match(/filename="(.+)"/)?.[1] ||
        `batch_results.${values.outputContentType.includes("json") ? "json" : values.outputContentType.includes("tsv") ? "tsv" : "csv"}`;

      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      return handleToast(
        toast.success("Your file has been processed and downloaded", {
          description:
            "The annotated results have been downloaded to your computer.",
          classNames: {
            actionButton:
              "group-[.toaster]:bg-green-600 group-[.toaster]:text-white",
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

    const data = await response.json();

    if (response.ok) {
      return handleToast(
        toast.success("Your file has been queued", {
          description: "We will email you when the results are ready.",
          classNames: {
            actionButton:
              "group-[.toaster]:bg-green-600 group-[.toaster]:text-white",
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
              "group-[.toaster]:bg-red-600 group-[.toaster]:text-white",
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                <Input
                  placeholder="example@domain.com"
                  {...field}
                  className="max-w-xs"
                />
              </FormControl>
              <FormDescription className="text-muted-foreground">
                We will email you when the results are ready.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="genome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <div className="flex items-center">
                  <p>Genome Assembly</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="ml-2 h-5 w-5 cursor-pointer text-muted-foreground hover:text-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>
                          Currently only HG38 genome assembly is available for
                          batch annotation using the existing pipeline with email
                          notification.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </FormLabel>
              <FormControl>
                <Select
                  defaultValue="hg38"
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled
                >
                  <SelectTrigger className="max-w-xs">
                    <SelectValue placeholder="Select genome assembly" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hg38">HG38 (Email Results)</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
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
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="ml-2 h-5 w-5 cursor-pointer text-muted-foreground hover:text-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>
                          Choose the coordinate system for the annotation type.
                          Some formats are 0-based (e.g., BED, BAM, BCF) while
                          others are 1-based (e.g., GTF, GFF, SAM, VCF). For
                          example, Ensembl uses a 1-based coordinate system,
                          while UCSC uses a 0-based system. Additionally, some
                          file formats like GFF, SAM, and VCF are 1-based,
                          whereas others like BED and BAM are 0-based. In R,
                          coordinate conversions happen automatically with some
                          functions. Be mindful of this to avoid errors.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </FormLabel>
              <FormControl>
                <Select
                  defaultValue="1-base"
                  onValueChange={field.onChange}
                  value={field.value.toString()}
                >
                  <SelectTrigger className="max-w-xs">
                    <SelectValue placeholder="Select coordinate system" />
                  </SelectTrigger>
                  <SelectContent>
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
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="ml-2 h-5 w-5 cursor-pointer text-muted-foreground hover:text-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>
                          Left normalization shifts the start position of a
                          variant to the left until it can no longer be shifted,
                          ensuring consistency in variant representation. VCF
                          files often contain multi-allelic variants that should
                          be split into separate lines and left-normalized for
                          accurate annotation. Use tools like bcftools norm for
                          this process before annotating.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </FormLabel>
              <FormControl>
                <Select
                  defaultValue="false"
                  onValueChange={(value) => field.onChange(value === "true")}
                  value={field.value.toString()}
                  disabled
                >
                  <SelectTrigger className="max-w-xs">
                    <SelectValue placeholder="Select left normalization" />
                  </SelectTrigger>
                  <SelectContent>
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
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="ml-2 h-5 w-5 cursor-pointer text-muted-foreground hover:text-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>
                          Choose the output content type for the annotation
                          results. The default output is text/csv, but you can
                          choose text/json or text/tsv if needed.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </FormLabel>
              <FormControl>
                <Select
                  defaultValue="text/csv"
                  onValueChange={field.onChange}
                  value={field.value.toString()}
                >
                  <SelectTrigger className="max-w-xs">
                    <SelectValue placeholder="Select output format" />
                  </SelectTrigger>
                  <SelectContent>
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
                <motion.div className="mt-2 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border px-6 py-12 text-sm hover:border-muted-foreground transition-colors">
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
                            <div className="rounded-md p-4">
                              <div className="flex">
                                <div className="ml-3">
                                  <div className="text-sm font-medium text-foreground">
                                    {value.name}
                                  </div>
                                  <div className="mt-2 text-sm text-muted-foreground">
                                    <p>
                                      Submit the file for annotation by clicking
                                      the submit button or choose a different
                                      file.
                                    </p>
                                  </div>
                                  <div className="mt-6">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        onChange(undefined);
                                      }}
                                    >
                                      Choose different file
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        </div>
                      ) : (
                        <label className="cursor-pointer text-center">
                          <span className="text-lg font-semibold text-primary hover:text-primary/80 transition-colors">
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
                          <p className="mt-2 text-muted-foreground">
                            or drag and drop
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            TXT, CSV, TSV, VCF, GZ up to 35MB
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
        <Button type="submit" size="lg" className="w-full sm:w-auto">
          {form.formState.isSubmitting ? (
            <>
              <RotateCw className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit for Annotation"
          )}
        </Button>
      </form>
    </Form>
  );
}
