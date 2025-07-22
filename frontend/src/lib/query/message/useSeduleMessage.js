import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import toast from "react-hot-toast";

export const useScheduleMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post("/scheduled", data);
      return response.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries("message-logs");
      toast.success("Message scheduled successfully");
    },

    onError: (error) => {
      queryClient.invalidateQueries("message-logs");
      toast.error("Failed to schedule message");
    },
  });
};

export default useScheduleMessage;
