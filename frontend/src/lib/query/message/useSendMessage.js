import api from "@/lib/api";
import { useMutation } from "@tanstack/react-query";

export const useSendMessage = () => {
  return useMutation({
    mutationFn: async (message) => {
      const response = await api.post("/send-message", message);
      return response.data;
    },
  });
};

export default useSendMessage;
