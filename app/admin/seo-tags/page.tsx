"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { Loader2 } from "lucide-react"

import { AppLoader } from "@/components/ui/app-loader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { getImageUrl } from "@/lib/utils"
import { createClient } from "@/utils/supabase/client"

import { useSeo, useUpdateSeo } from "./_hooks/use-seo-tags"
import { seoSchema, SeoFormValues } from "./_schemas/seo.schema"

export default function SeoTagsPage() {
  const { data: seoData, isLoading: seoLoading } = useSeo()
  const updateSeoMutation = useUpdateSeo()
  const [ogUploading, setOgUploading] = useState(false)
  const [ogUploadError, setOgUploadError] = useState<string | null>(null)

  const seoForm = useForm<SeoFormValues>({
    resolver: zodResolver(seoSchema),
    defaultValues: {
      metaTitle: "",
      metaDescription: "",
      ogImageUrl: "",
    },
  })

  useEffect(() => {
    if (seoData?.data) {
      seoForm.reset({
        metaTitle: seoData.data.metaTitle ?? "",
        metaDescription: seoData.data.metaDescription ?? "",
        ogImageUrl: seoData.data.ogImageUrl ?? "",
      })
    }
  }, [seoData?.data, seoForm])

  const ogImageUrl = seoForm.watch("ogImageUrl")

  const uploadOgImage = async (file: File) => {
    setOgUploadError(null)
    setOgUploading(true)
    try {
      const maxSizeBytes = 1024 * 1024 // Keep JSON payload small; OG image should be lightweight.
      if (file.size > maxSizeBytes) {
        throw new Error("Please choose an image smaller than 1 MB.")
      }

      if (!file.type.startsWith("image/")) {
        throw new Error("Only image uploads are allowed.")
      }

      const supabase = createClient()
      const ext = (file.name?.split(".").pop() || "png").toLowerCase()
      const fileName = `seo_images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { data, error } = await supabase.storage.from("assets").upload(fileName, file, {
        contentType: file.type,
        upsert: true,
      })
      if (error) throw new Error(error.message || "Failed to upload image.")
      const publicUrl = getImageUrl(data.path)
      seoForm.setValue("ogImageUrl", publicUrl, { shouldDirty: true, shouldValidate: true })
    } catch (error) {
      setOgUploadError(error instanceof Error ? error.message : "Upload failed.")
    } finally {
      setOgUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">SEO Management</h1>
        <p className="text-sm text-muted-foreground">Maintain meta title, description, and Open Graph image.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>SEO Settings</CardTitle>
        </CardHeader>
        <CardContent>
          {seoLoading ? (
            <AppLoader label="Loading SEO..." className="justify-start text-sm" imageClassName="h-9 w-9" />
          ) : (
            <Form {...seoForm}>
              <form className="space-y-4" onSubmit={seoForm.handleSubmit((values) => updateSeoMutation.mutate(values))}>
                <FormField
                  control={seoForm.control}
                  name="metaTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta Title</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={seoForm.control}
                  name="metaDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta Description</FormLabel>
                      <FormControl>
                        <Textarea rows={4} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={seoForm.control}
                  name="ogImageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Open Graph Image URL</FormLabel>
                      <FormControl>
                        <div className="space-y-3">
                          <Input placeholder="https://... or upload below" {...field} />

                          <div className="flex flex-wrap items-center gap-3">
                            <Input
                              type="file"
                              accept="image/*"
                              disabled={ogUploading}
                              onChange={async (event) => {
                                const file = event.target.files?.[0] ?? null
                                if (!file) return
                                await uploadOgImage(file)
                                event.target.value = ""
                              }}
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              disabled={ogUploading || !field.value}
                              onClick={() =>
                                seoForm.setValue("ogImageUrl", "", { shouldDirty: true, shouldValidate: true })
                              }
                            >
                              Clear
                            </Button>
                            {ogUploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
                          </div>

                          {ogUploadError && <p className="text-sm text-destructive">{ogUploadError}</p>}

                          {ogImageUrl ? (
                            <div className="rounded-md border bg-muted/20 p-3">
                              <p className="text-xs text-muted-foreground mb-2">Preview</p>
                              <div className="relative aspect-[1200/630] w-full overflow-hidden rounded-md bg-muted">
                                <img src={ogImageUrl} alt="Open Graph preview" className="absolute inset-0 h-full w-full object-cover" />
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                    )}
                  />
                <Button type="submit" disabled={updateSeoMutation.isPending}>
                  {updateSeoMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {updateSeoMutation.isPending ? "Saving..." : "Save SEO"}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
