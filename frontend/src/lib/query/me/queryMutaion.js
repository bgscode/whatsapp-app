import api from "@/lib/api";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";

const useGetProfile = () => {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const response = await api.get("/get-profile");
      return response.data;
    },

    staleTime: Infinity,
    retry: (failureCount, error) => {
      if (error.status === 404) return false;
      return failureCount < 3;
    },
  });
};

const useLogout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.post("/logout");
    },

    onSuccess: () => {
      queryClient.invalidateQueries("profile");
      toast.success("Logged out successfully");
    },
  });
};

export { useGetProfile, useLogout };
