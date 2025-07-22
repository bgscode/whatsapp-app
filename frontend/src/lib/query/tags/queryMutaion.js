import api from "@/lib/api";
import { useQuery, QueryClient } from "@tanstack/react-query";

const queryClient = new QueryClient();

export const useGetTags = () => {
  return useQuery({
    queryKey: "tags",
    queryFn: async () => {
      const response = await api.get("/tags");
      return response.data;
    },
    staleTime: Infinity,
  });
};

export const useGetTag = (id) => {
  return useQuery({
    queryKey: ["tag", id],
    queryFn: async () => {
      const response = await api.get(`/tags/${id}`);
      return response.data;
    },
    staleTime: Infinity,
  });
};

export const useAddTag = () => {
  return useQuery({
    queryKey: "addTag",
    queryFn: async (data) => {
      const response = await api.post("/tags", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries("tags");
    },
  });
};

export const useUpdateTag = () => {
  return useQuery({
    queryKey: "updateTag",
    queryFn: async (data) => {
      const response = await api.put(`/tags/${data.id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries("tags");
    },
  });
};

export const useDeleteTag = () => {
  return useQuery({
    queryKey: "deleteTag",
    queryFn: async (id) => {
      const response = await api.delete(`/tags/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries("tags");
    },
  });
};
