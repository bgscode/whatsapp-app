import api from "@/lib/api";
import { jP, jS } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import fileDownload from "js-file-download";
import toast from "react-hot-toast";

export const useGetContactGroups = () => {
  return useQuery({
    queryKey: ["contact-groups"],
    queryFn: async () => {
      const response = await api.get("/contact-groups");
      return response.data;
    },
    staleTime: Infinity,
    retry: (failureCount, error) => {
      if (error.status === 404) return false;
      return failureCount < 3;
    },
  });
};

export const useGetContactGroup = (id) => {
  return useQuery({
    queryKey: ["contact-group", id],
    queryFn: async () => {
      const response = await api.get(`/contact-groups/${id}`);
      return response.data;
    },
    staleTime: Infinity,
  });
};

export const useAddContactGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post("/contact-groups", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-groups"] });
      toast.success("Contact group created successfully");
    },
  });
};

export const useImportContactsInGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      // make a data according to the api requirement
      const contacts = data.data
        .filter((c) => c.whatsapp_no || c.name)
        .map((c) => ({
          name: c.name,
          whatsapp_no: c.whatsapp_no,
          contact_group_id: data.groupId,
          other_fields: jS(
            data.headers
              .filter((h) => h !== "name" && h !== "whatsapp_no")
              .reduce((acc, curr) => ({ ...acc, [curr]: c[curr] }), {})
          ),
        }));

      console.log("contacts", contacts);

      const response = await api.post("/contacts/bulk", { contacts });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contacts imported successfully");
    },
  });
};

export const useUpdateContactGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.put(`/contact-groups/${data.id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-groups"] });
      toast.success("Contact group updated successfully");
    },
  });
};

export const useDeleteContactGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/contact-groups/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-groups"] });
      toast.success("Contact group deleted successfully");
    },
  });
};

export const useAllContactsExport = () => {
  return useMutation({
    mutationFn: async () => {
      const response = await api.post(
        "/contacts/export-csv",
        {},
        {
          responseType: "blob",
        }
      );
      fileDownload(response.data, "contacts.csv");
    },
    onError: (error) => {
      console.error("CSV export failed:", error);
    },
  });
};

export const useSelectedContactsExport = () => {
  return useMutation({
    mutationFn: async (ids) => {
      const response = await api.post(
        "/contacts/export-csv/selected",
        { ids },
        {
          responseType: "blob",
        }
      );
      fileDownload(response.data, "selected-contacts.csv");
    },
    onError: (error) => {
      console.error("CSV export failed:", error);
    },
  });
};

export const useExportContactInGroups = () => {
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post("/contacts/export-csv/groups", data, {
        responseType: "blob",
      });
      fileDownload(
        response.data,
        data.name ? `${data.name}.csv` : "contacts.csv"
      );
    },
    onError: (error) => {
      console.error("CSV export failed:", error);
    },
  });
};
