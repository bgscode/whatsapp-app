import api from "@/lib/api";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";

const useGetShecduledMessages = ({ status = "all" }) => {
  return useQuery({
    queryKey: ["scheduled-messages", status],
    queryFn: async () => {
      const response = await api.get(`/scheduled`, { params: { status } });
      return response.data;
    },

    staleTime: 60000, // 60 seconds
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => {
      if (error.status === 404) return false;
      return failureCount < 3;
    },
  });
};

const useDeleteScheduledMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids = []) => {
      const response = await api.post(`/scheduled/destory`, { ids });
      return response.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries("scheduled-messages");
      toast.success("Scheduled message deleted successfully");
    },

    onError: (error) => {
      queryClient.invalidateQueries("scheduled-messages");
      toast.error("Failed to delete scheduled message");
    },
  });
};

const useUpdateScheduledMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.put("/scheduled", data);
      return response.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries("scheduled-messages");
      toast.success("Scheduled message updated successfully");
    },

    onError: (error) => {
      queryClient.invalidateQueries("scheduled-messages");
      toast.error("Failed to update scheduled message");
    },
  });
};

const useCreateScheduledMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post("/scheduled", data);
      return response.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries("scheduled-messages");
      toast.success("Scheduled message created successfully");
    },

    onError: (error) => {
      queryClient.invalidateQueries("scheduled-messages");
      toast.error("Failed to create scheduled message");
    },
  });
};

export {
  useGetShecduledMessages,
  useDeleteScheduledMessage,
  useUpdateScheduledMessage,
  useCreateScheduledMessage,
};
