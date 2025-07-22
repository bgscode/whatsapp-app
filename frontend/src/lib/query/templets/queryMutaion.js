import api from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const useGetTemplets = () => {
  return useQuery({
    queryKey: ["templets"],
    queryFn: async () => {
      const response = await api.get("/templates");
      return response.data;
    },
    staleTime: Infinity,
  });
};

export const useGetTemplet = (id) => {
  return useQuery({
    queryKey: ["templet", id],
    queryFn: async () => {
      const response = await api.get(`/templates/${id}`);
      return response.data;
    },
    staleTime: Infinity,
  });
};

export const useAddTemplet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post("/templates", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templets"] });
    },
  });
};

export const useUpdateTemplet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.put(`/templates/${data.id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templets"] });
    },
  });
};

export const useDeleteTemplet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/templates/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templets"] });
    },
  });
};
