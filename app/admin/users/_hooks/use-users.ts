import { useDeferredValue } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { deleteApi, getApi, patchApi, postApi } from "@/lib/admin-panel/client"

import { CreateUserPayload, CreateUserResponse, UpdateUserPayload, UsersResponse } from "../_types"

export function useUsers(query: string) {
  const deferredQuery = useDeferredValue(query)

  return useQuery({
    queryKey: ["admin-users", deferredQuery],
    queryFn: () => getApi<UsersResponse>(`/api/admin/users?q=${encodeURIComponent(deferredQuery)}`),
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  })
}

export function useToggleUserVerification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, isVerified }: { id: string; isVerified: boolean }) =>
      patchApi(`/api/admin/users/${id}`, { isVerified }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] })
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] })
    },
  })
}

export function useToggleUserActive() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      patchApi(`/api/admin/users/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] })
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] })
    },
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateUserPayload) => postApi<CreateUserResponse>("/api/admin/users", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateUserPayload) => patchApi(`/api/admin/users/${payload.id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id }: { id: string }) => deleteApi(`/api/admin/users/${id}`, { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] })
    },
  })
}
