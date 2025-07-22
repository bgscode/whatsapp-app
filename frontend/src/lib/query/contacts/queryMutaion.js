import api from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import fileDownload from "js-file-download";
import toast from "react-hot-toast";

export const useGetContacts = () => {
  return useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const response = await api.get("/contacts");
      return response.data;
    },
    staleTime: Infinity,
  });
};

export const useGetContact = (id) => {
  return useQuery({
    queryKey: ["contact", id],
    queryFn: async () => {
      const response = await api.get(`/contacts/${id}`);
      return response.data;
    },
    staleTime: Infinity,
  });
};

export const useAddContact = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post("/contacts", data);
      return response.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries("contact");
      toast.success("Contact created successfully");
    },

    onError: (error) => {
      console.error("Contact creation failed:", error);
    },
  });
};

export const useUpdateContact = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.put(`/contacts/${data.id}`, data);
      return response.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries("contacts");
      toast.success("Contact updated successfully");
    },

    onError: (error) => {
      toast.error("Contact update failed:", error);
    },
  });
};

export const useDeleteContact = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/contacts/${id}`);
      return response.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries("contacts");
      toast.success("Contact deleted successfully");
    },

    onError: (error) => {
      toast.error("Contact deletion failed:", error);
    },
  });
};

export const useMultiDeleteContacts = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids) => {
      const response = await api.post("/contacts/delete", { ids });
      return response.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries("contacts");
      toast.success("Contacts deleted successfully");
    },

    onError: (error) => {
      toast.error("Contacts deletion failed:", error);
    },
  });
};

export const useContactsCsvExport = () => {
  return useMutation({
    mutationFn: async (ids) => {
      console.log("ids", ids);
      // Request CSV as a Blob
      const response = await api.post(
        "/contacts/export-csv",
        { ids },
        {
          responseType: "blob",
        }
      );
      return fileDownload(response.data, "contact-members.csv");
    },

    onError: (error) => {
      console.error("CSV export failed:", error);
    },
  });
};
