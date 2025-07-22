import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "./api";

export const useUpload = () => {
  return useMutation({
    mutationFn: async (data) => {
      data =
        data instanceof File
          ? (() => {
              const formData = new FormData();
              formData.append("file", data);
              return formData;
            })()
          : data;
      const promise = api.post("/file/upload", data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast.promise(promise, {
        loading: "Uploading...",
        success: "Upload successful",
        error: "Upload failed",
      });
      const response = await promise;
      return response.data;
    },

    onSuccess: (data) => {
      console.log("Upload successful:", data);
    },

    onError: (error) => {
      console.error("Upload failed:", error);
    },
  });
};
