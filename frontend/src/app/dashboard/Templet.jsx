"use client";

import { useState } from "react";
import {
  Edit,
  FileText,
  ImageIcon,
  MoreVertical,
  Plus,
  Trash,
  Search,
  Filter,
  Folder,
  CheckCircle,
  Info,
  MessageSquare,
  PencilRuler,
  LayoutTemplate,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  useAddTemplet,
  useDeleteTemplet,
  useGetTemplets,
  useUpdateTemplet,
} from "@/lib/query/templets/queryMutaion";
import {
  useAddCategory,
  useGetCategories,
} from "@/lib/query/categories/queryMutaion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { jP } from "@/lib/utils";
import { AttachmentPreview } from "@/components/attachment/preview";
import { Attachment } from "@/components/attachment/upload";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function TemplatePage() {
  // Local state for search and modals
  const [search, setSearch] = useState("");
  const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
  const [isTemplateModalOpen, setTemplateModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [editId, setEditId] = useState(null);

  // Template mutations and fetching
  const { mutate: postTemplate } = useAddTemplet();
  const { data: { templets } = { templets: [] } } = useGetTemplets();
  const { mutate: deleteTemplet } = useDeleteTemplet();
  const { mutate: updateTemplet } = useUpdateTemplet();

  // Category mutations and fetching
  const { mutate: postCategory } = useAddCategory();
  const { data: { categories } = { categories: [] } } = useGetCategories();

  // Zod schemas
  const categorySchema = z.object({
    name: z.string().nonempty("Category name is required"),
  });

  const tempSchema = z.object({
    name: z.string().nonempty("Template name is required"),
    category_id: z.string().nonempty("Category is required"),
    variables: z.string().optional(),
    message: z.string().nonempty("Message is required"),
    attachment_thumbnail: z
      .array(
        z.object({
          url: z.string().nonempty(),
          type: z.string().nonempty(),
          path: z.string().nonempty(),
          filename: z.string().nonempty(),
          size: z.number().optional(),
        })
      )
      .max(5)
      .optional(),
    attachment_document: z
      .array(
        z.object({
          url: z.string().nonempty(),
          type: z.string().nonempty(),
          path: z.string().nonempty(),
          filename: z.string().nonempty(),
          size: z.number().optional(),
        })
      )
      .max(5)
      .optional(),
  });

  // React-hook-form instances
  const categoryForm = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "" },
  });

  const tempForm = useForm({
    resolver: zodResolver(tempSchema),
    defaultValues: {
      name: "",
      category_id: "",
      variables: "",
      message: "",
      attachment_thumbnail: [],
      attachment_document: [],
    },
  });

  // Use watch to re-render when attachments update
  const watchAttachmentThumbnail = tempForm.watch("attachment_thumbnail") || [];
  const watchAttachmentDocument = tempForm.watch("attachment_document") || [];

  // Helper: push a new attachment to a field array
  const pushAttachment = (key, data) => {
    const currentAttachments = tempForm.getValues()[key] || [];
    tempForm.setValue(key, [...currentAttachments, data]);
  };

  const setAttachment = (file, type) => {
    if (type === "image&video") {
      pushAttachment("attachment_thumbnail", file);
    } else if (type === "document") {
      pushAttachment("attachment_document", file);
    }
  };

  const removeAttachment = (file) => {
    const thumAttachments = tempForm.getValues("attachment_thumbnail") || [];
    const docAttachments = tempForm.getValues("attachment_document") || [];

    tempForm.setValue(
      "attachment_thumbnail",
      thumAttachments.filter((d) => d.path !== file.path)
    );
    tempForm.setValue(
      "attachment_document",
      docAttachments.filter((d) => d.path !== file.path)
    );
  };

  const totalAttachment =
    watchAttachmentThumbnail.length + watchAttachmentDocument.length;

  // Form submission handlers
  const onSubmitCategory = async (data) => {
    postCategory(data, {
      onSuccess: () => {
        categoryForm.reset();
        setCategoryModalOpen(false);
      },
      onError: (error) => {
        console.error("Error adding category:", error);
      },
    });
  };

  const onSubmitTemplate = (data) => {
    // Ensure category_id is a number
    data.category_id = parseInt(data.category_id, 10);
    if (!editId) {
      postTemplate(data, {
        onSuccess: () => {
          tempForm.reset({
            name: "",
            category_id: "",
            variables: "",
            message: "",
            attachment_thumbnail: [],
            attachment_document: [],
          });
          setTemplateModalOpen(false);
        },
        onError: (error) => {
          console.error("Error creating template:", error);
        },
      });
    } else {
      data.id = editId;
      updateTemplet(data, {
        onSuccess: () => {
          tempForm.reset({
            name: "",
            category_id: "",
            variables: "",
            message: "",
            attachment_thumbnail: [],
            attachment_document: [],
          });
          setTemplateModalOpen(false);
          setEditId(null);
        },
        onError: (error) => {
          console.error("Error updating template:", error);
        },
      });
    }
  };

  // Filter templates by search text and selected category
  const filteredTemplates = templets?.filter((template) => {
    const categoryName = jP(template.category)?.name?.toLowerCase() || "";
    return (
      (selectedCategory === "all" ||
        categoryName === selectedCategory.toLowerCase()) &&
      template.name.toLowerCase().includes(search.toLowerCase())
    );
  });

  const scrollClass = `[&::-webkit-scrollbar]:w-2
    [&::-webkit-scrollbar-track]:rounded-full
    [&::-webkit-scrollbar-track]:bg-gray-100
    [&::-webkit-scrollbar-thumb]:rounded-full
    [&::-webkit-scrollbar-thumb]:bg-gray-300
    dark:[&::-webkit-scrollbar-track]:bg-neutral-700
    dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500`;

  // Get category info
  const getCategoryInfo = (category_id) => {
    const category = categories?.find((cat) => cat.id === category_id);
    return category ? category.name : "Uncategorized";
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-primary">Message Templates</h2>
          <p className="text-muted-foreground">
            Create and manage reusable message templates
          </p>
        </div>

        {/* Primary Action Button */}
        <Dialog open={isTemplateModalOpen} onOpenChange={setTemplateModalOpen}>
          <DialogTrigger asChild>
            <Button
              className="gap-2"
              onClick={() => {
                setTemplateModalOpen(true);
                setEditId(null);
                tempForm.reset({
                  name: "",
                  category_id: "",
                  variables: "",
                  message: "",
                  attachment_thumbnail: [],
                  attachment_document: [],
                });
              }}
            >
              <Plus className="w-4 h-4" /> Create Template
            </Button>
          </DialogTrigger>

          <DialogContent
            className={`sm:max-w-3xl max-h-[calc(100vh-4rem)] overflow-y-auto ${scrollClass}`}
          >
            <Form {...tempForm}>
              <form
                onSubmit={tempForm.handleSubmit(onSubmitTemplate)}
                className="px-4"
              >
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <LayoutTemplate className="w-5 h-5 text-primary" />
                    {editId ? "Edit Template" : "Create New Template"}
                  </DialogTitle>
                  <DialogDescription>
                    {editId
                      ? "Update your message template with personalized content and attachments"
                      : "Create a reusable message template with personalization options"}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid sm:grid-cols-2 gap-4 mt-6">
                  <div>
                    <FormField
                      name="name"
                      control={tempForm.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel htmlFor="template-name">
                            Template Name
                          </FormLabel>
                          <FormControl>
                            <Input
                              id="template-name"
                              placeholder="Enter a descriptive name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div>
                    <FormField
                      name="category_id"
                      control={tempForm.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel htmlFor="template-category">
                            Category
                          </FormLabel>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <SelectTrigger className="col-span-3">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                  {categories?.length === 0 && (
                                    <div className="text-center py-2 text-sm text-muted-foreground">
                                      No categories available
                                    </div>
                                  )}
                                  {categories?.map((category) => (
                                    <SelectItem
                                      key={`category.id-${category.name}`}
                                      value={category.id.toString()}
                                    >
                                      {category.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>

                            {/* Inline Nested Create Category Dialog */}
                            <Dialog
                              open={isCategoryModalOpen}
                              onOpenChange={setCategoryModalOpen}
                            >
                              <DialogTrigger asChild>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        type="button"
                                        size="sm"
                                        onClick={() => {
                                          setCategoryModalOpen(true);
                                        }}
                                      >
                                        <Plus className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Add new category
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-sm">
                                <Form {...categoryForm}>
                                  <form
                                    onSubmit={categoryForm.handleSubmit(
                                      onSubmitCategory
                                    )}
                                  >
                                    <DialogHeader>
                                      <DialogTitle className="flex items-center gap-2">
                                        <Folder className="w-5 h-5 text-primary" />
                                        Add Category
                                      </DialogTitle>
                                      <DialogDescription>
                                        Create a new category to organize your
                                        templates
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                      <FormField
                                        name="name"
                                        control={categoryForm.control}
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel htmlFor="category-name">
                                              Category Name
                                            </FormLabel>
                                            <FormControl>
                                              <Input
                                                id="category-name"
                                                placeholder="Enter category name"
                                                {...field}
                                              />
                                            </FormControl>
                                            <FormDescription>
                                              Use a clear and descriptive name
                                              to organize your templates
                                            </FormDescription>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                    </div>
                                    <DialogFooter className="pt-2">
                                      <Button type="submit" className="gap-2">
                                        <CheckCircle className="w-4 h-4" />
                                        Save Category
                                      </Button>
                                    </DialogFooter>
                                  </form>
                                </Form>
                              </DialogContent>
                            </Dialog>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Message Content */}
                  <div className="sm:col-span-2">
                    <FormField
                      name="message"
                      control={tempForm.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel htmlFor="message">
                            Message Content
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Textarea
                                rows="5"
                                id="message"
                                placeholder="Type your message content here. Use {{variable}} syntax for personalization fields."
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  // Auto-detect variables in the message and update the form
                                  const matches =
                                    e.target.value.match(/{{(.*?)}}/g) || [];
                                  tempForm.setValue(
                                    "variables",
                                    matches
                                      .map((v) => v.replace(/{{|}}/g, ""))
                                      .join(", ")
                                  );
                                }}
                                className="resize-y min-h-[150px] pt-3 pb-12"
                              />
                              <div className="absolute bottom-2 right-2">
                                <Attachment
                                  setAttachment={(file, type) =>
                                    setAttachment(file, type)
                                  }
                                  totalAttachment={totalAttachment}
                                  max={5}
                                />
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Variables */}
                  {/* <div className="sm:col-span-2">
                    <FormField
                      name="variables"
                      control={tempForm.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel
                            htmlFor="variables"
                            className="flex items-center gap-2"
                          >
                            <PencilRuler className="w-4 h-4 text-primary" />
                            Personalization Variables
                          </FormLabel>
                          <FormControl>
                            <Input
                              id="variables"
                              {...field}
                              readOnly
                              className="bg-muted/30"
                              placeholder="Variables will appear here automatically"
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground mt-1">
                            Variables are automatically detected from your
                            message content using the syntax
                          </p>
                        </FormItem>
                      )}
                    />
                  </div> */}
                </div>

                {/* Attachment Preview */}
                {(watchAttachmentThumbnail.length > 0 ||
                  watchAttachmentDocument.length > 0) && (
                  <div className="mt-4 border rounded-lg p-2 bg-muted/10">
                    <h3 className="text-sm font-medium mb-2 px-2">
                      Template Attachments
                    </h3>
                    <AttachmentPreview
                      attachments={[
                        ...watchAttachmentThumbnail,
                        ...watchAttachmentDocument,
                      ]}
                      removeAttachment={removeAttachment}
                      max={5}
                    />
                  </div>
                )}

                <DialogFooter className="mt-8 pt-4 border-t">
                  <Button type="submit" className="gap-2">
                    <CheckCircle className="w-4 h-4" />
                    {editId ? "Update Template" : "Save Template"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-sm border-t-4 border-t-primary">
        <CardHeader className="bg-muted/30 rounded-t-lg">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Templates Library
              </CardTitle>
              <CardDescription>
                Manage and organize your message templates
              </CardDescription>
            </div>
            <div className="flex gap-2 items-center">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  className="w-[200px] pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Tabs
            defaultValue="all"
            onValueChange={setSelectedCategory}
            className="p-4"
          >
            <div className="flex items-center mb-3 gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filter by Category:</span>
            </div>

            <TabsList className="bg-muted/50 p-1 rounded-lg">
              <TabsTrigger value="all" className="rounded-md">
                All Templates
              </TabsTrigger>
              {categories?.map((category) => (
                <TabsTrigger
                  key={`category.id-${category.name}`}
                  value={category.name.toLowerCase()}
                  className="rounded-md"
                >
                  {category.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {categories?.length === 0 && (
              <Alert
                variant="info"
                className="bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-900 my-4"
              >
                <Info className="h-4 w-4" />
                <AlertDescription>
                  No categories found. Add a category to better organize your
                  templates.
                </AlertDescription>
              </Alert>
            )}

            <Separator className="my-4" />

            {/* Template Grid */}
            <TabsContent value={selectedCategory} className="mt-2">
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-10">
                  <LayoutTemplate className="w-12 h-12 mx-auto text-muted-foreground/60" />
                  <h3 className="mt-4 text-lg font-medium">
                    No templates found
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1.5 mb-4">
                    {search
                      ? "Try a different search term or"
                      : "Start by creating"}{" "}
                    a new template
                  </p>
                  <Button
                    onClick={() => {
                      setTemplateModalOpen(true);
                      setEditId(null);
                      tempForm.reset({
                        name: "",
                        category_id: "",
                        variables: "",
                        message: "",
                        attachment_thumbnail: [],
                        attachment_document: [],
                      });
                    }}
                    size="sm"
                    className="gap-1"
                  >
                    <Plus className="w-3 h-3" /> Create Template
                  </Button>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredTemplates.map((template) => (
                    <Card
                      key={template.id}
                      className="overflow-hidden border hover:border-primary/30 transition-all shadow-sm"
                    >
                      <CardHeader className="bg-muted/10 p-3 pb-3">
                        <div className="w-full flex justify-between items-start">
                          <div className="space-y-1">
                            <h3
                              className="font-medium text-base truncate"
                              title={template.name}
                            >
                              {template.name}
                            </h3>
                            <Badge
                              variant="secondary"
                              className="bg-primary/10 text-primary hover:bg-primary/20"
                            >
                              {jP(template.category).name}
                            </Badge>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => {
                                  setTemplateModalOpen(true);
                                  setEditId(template.id);
                                  tempForm.reset({
                                    ...template,
                                    category_id: jP(
                                      template.category
                                    ).id.toString(),
                                    attachment_document:
                                      jP(template.attachment_document) || [],
                                    attachment_thumbnail:
                                      jP(template.attachment_thumbnail) || [],
                                  });
                                }}
                              >
                                <Edit className="w-4 h-4 mr-2" /> Edit Template
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  if (
                                    confirm(
                                      "Are you sure you want to delete this template?"
                                    )
                                  ) {
                                    deleteTemplet(template.id);
                                  }
                                }}
                                className="text-destructive cursor-pointer"
                              >
                                <Trash className="w-4 h-4 mr-2" /> Delete
                                Template
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>

                      <CardContent className="p-3 pt-3 space-y-3">
                        <p
                          className="text-sm text-muted-foreground line-clamp-2"
                          title={template.message}
                        >
                          {template.message}
                        </p>

                        {template.variables && (
                          <div className="flex flex-wrap gap-1.5">
                            {template.variables.split(", ").map((variable) => (
                              <Badge
                                key={variable}
                                variant="outline"
                                className="bg-muted/30"
                              >
                                {{ variable }}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {(jP(template?.attachment_thumbnail)?.length > 0 ||
                          jP(template?.attachment_document)?.length > 0) && (
                          <div className="pt-2">
                            <Separator className="mb-2" />
                            <div className="flex flex-wrap gap-2">
                              {jP(template?.attachment_thumbnail)?.length >
                                0 && (
                                <Badge
                                  variant="secondary"
                                  className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                                >
                                  <ImageIcon className="w-3 h-3 mr-1" />
                                  {
                                    jP(template?.attachment_thumbnail)?.length
                                  }{" "}
                                  {jP(template?.attachment_thumbnail)
                                    ?.length === 1
                                    ? "Image"
                                    : "Images"}
                                </Badge>
                              )}
                              {jP(template?.attachment_document)?.length >
                                0 && (
                                <Badge
                                  variant="secondary"
                                  className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
                                >
                                  <FileText className="w-3 h-3 mr-1" />
                                  {
                                    jP(template?.attachment_document)?.length
                                  }{" "}
                                  {jP(template?.attachment_document)?.length ===
                                  1
                                    ? "Document"
                                    : "Documents"}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="flex justify-between py-3 border-t bg-muted/10">
          <div className="text-sm text-muted-foreground">
            {filteredTemplates.length} template
            {filteredTemplates.length !== 1 ? "s" : ""} found
          </div>
          <Button
            size="sm"
            variant="outline"
            type="button"
            className="gap-2"
            onClick={() => {
              categoryForm.reset({ name: "" });
              setTemplateModalOpen(true);
            }}
          >
            <Folder className="w-3 h-3" />
            Add Category
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
