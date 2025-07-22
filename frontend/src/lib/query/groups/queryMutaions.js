import api from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import fileDownload from "js-file-download";
import toast from "react-hot-toast";

export const useGetGroups = () => {
  return useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const response = await api.get("/groups");
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useGetGroup = (id) => {
  return useQuery({
    queryKey: ["group", id],
    queryFn: async () => {
      const response = await api.get(`/groups/${id}`);
      return response.data;
    },
    staleTime: Infinity,
  });
};

export const useAddBulkMembers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post("/groups/bulk-add", data);
      return response.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries("groups");
      toast.success("Bulk add successful");
    },

    onError: (error) => {
      console.log("error", error);
      toast.error("Bulk add failed");
    },
  });
};

export const useGroupsCsvExport = () => {
  return useMutation({
    mutationFn: async (ids) => {
      console.log("ids", ids);
      // Request CSV as a Blob
      const response = await api.post(
        "/groups/members/export-csv",
        { ids },
        {
          responseType: "blob",
        }
      );
      fileDownload(response.data, "group-members.csv");
    },

    onError: (error) => {
      console.error("CSV export failed:", error);
    },
  });
};

export const useAllGroupsExport = () => {
  return useMutation({
    mutationFn: async () => {
      // Request CSV as a Blob
      const response = await api.post(
        "/groups/all-members/export-csv",
        {},
        {
          responseType: "blob",
        }
      );
      fileDownload(response.data, "groups.csv");
    },

    onError: (error) => {
      console.error("CSV export failed:", error);
    },
  });
};
