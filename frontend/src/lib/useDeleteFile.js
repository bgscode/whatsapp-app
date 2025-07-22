import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "./api";

export const useDeleteFile = () => {
  return useMutation({
    mutationFn: async (data) => {
      const promise = api.post(`/file/delete`, data);
      toast.promise(promise, {
        loading: "Uploading...",
        success: "Upload successful",
        error: "Upload failed",
      });
      const response = await promise;
      console.log("Upload successful:", response.data);
      return response.data;
    },

    onError: (error) => {
      console.error("Upload failed:", error);
    },
  });
};
