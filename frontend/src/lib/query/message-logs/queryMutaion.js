import api from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

const useGetMessageLogs = () => {
  return useQuery({
    queryKey: ["message-logs"],
    queryFn: async () => {
      const response = await api.get("/logs");
      return response.data;
    },

    refetchOnWindowFocus: true,
    retry: (failureCount, error) => {
      if (error.status === 404) {
        return false;
      }
      return failureCount < 3;
    },
    staleTime: 1 * 60 * 1000,
  });
};

const useMultiDeleteMessageLogs = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids) => {
      const response = await api.post("/logs/delete", { ids });
      return response.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries("message-logs");
      toast.success("Messages deleted successfully");
    },

    onError: (error) => {
      queryClient.invalidateQueries("message-logs");
      toast.error("Failed to delete messages");
    },
  });
};

const useExportMessageLogs = () => {
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post("/logs/export", data);
      return response.data;
    },
  });
};

const useExportWeeklyMessageLogs = () => {
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post("/logs/export/weekly", data);
      return response.data;
    },
  });
};

export {
  useGetMessageLogs,
  useMultiDeleteMessageLogs,
  useExportMessageLogs,
  useExportWeeklyMessageLogs,
};
