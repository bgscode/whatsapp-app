import api from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

const useUpdateSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newSettings) => {
      // Send the settings wrapped in an object as expected by the server
      const response = await api.put(`/settings`, { settings: newSettings });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries("settings");
      toast.success("Settings updated successfully");
    },
  });
};

const useGetSettings = () => {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await api.get(`/settings`);
      return response.data.settings;
    },
    staleTime: Infinity,
    retry: (failureCount, error) => {
      // Check error.response?.status if available
      if (error.response?.status === 404) return false;
      return failureCount < 3;
    },
  });
};

const useResetSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await api.post(`/reset-settings`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries("settings");
      toast.success("Settings reset successfully");
    },
  });
};

export { useUpdateSettings, useGetSettings, useResetSettings };
