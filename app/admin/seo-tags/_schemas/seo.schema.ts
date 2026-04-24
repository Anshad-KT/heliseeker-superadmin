import { z } from "zod"

const ogImageSchema = z.string().trim().superRefine((value, ctx) => {
  if (!value) return
  if (value.startsWith("data:image/")) return
  try {
    new URL(value)
  } catch {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid URL or upload an image." })
  }
})

export const seoSchema = z.object({
  metaTitle: z.string().min(2),
  metaDescription: z.string().min(2),
  ogImageUrl: ogImageSchema.or(z.literal("")),
})

export const tagSchema = z.object({
  tagName: z.string().min(2),
  tagType: z.string().min(2),
  keyword: z.string().min(2),
  question: z.string().min(2),
  linkedCategory: z.string().min(2),
})

export type SeoFormValues = z.infer<typeof seoSchema>
export type TagFormValues = z.infer<typeof tagSchema>
