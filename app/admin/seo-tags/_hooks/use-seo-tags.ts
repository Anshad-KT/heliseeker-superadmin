import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { getApi, patchApi, postApi } from "@/lib/admin-panel/client"

import { SeoResponse, TagsResponse } from "../_types"

export function useSeo() {
  return useQuery({
    queryKey: ["admin-seo"],
    queryFn: () => getApi<SeoResponse>("/api/admin/seo"),
  })
}

export function useTags() {
  return useQuery({
    queryKey: ["admin-tags"],
    queryFn: () => getApi<TagsResponse>("/api/admin/tags"),
  })
}

export function useUpdateSeo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { metaTitle: string; metaDescription: string; ogImageUrl: string }) => patchApi("/api/admin/seo", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-seo"] })
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] })
    },
  })
}

export function useCreateTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { tagName: string; tagType: string; keyword: string; question: string; linkedCategory: string }) =>
      postApi("/api/admin/tags", payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-tags"] }),
  })
}

export function useToggleTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => patchApi(`/api/admin/tags/${id}`, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-tags"] }),
  })
}
