"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { FileText, Plus, Edit2, Trash2, Loader2 } from "lucide-react";
import type { Template } from "@/types";

export default function TemplatesPage() {
  const queryClient = useQueryClient();
  const { data: templates, isLoading } = useQuery<Template[]>({
    queryKey: ["templates"],
    queryFn: async () => (await api.get("/templates")).data,
  });

  const [editModal, setEditModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");

  const saveMutation = useMutation({
    mutationFn: async (data: {
      id?: string;
      name: string;
      content: string;
      description: string;
    }) => {
      if (data.id) {
        return (await api.put(`/templates/${data.id}`, data)).data;
      }
      return (await api.post("/templates", data)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/templates/${id}`);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["templates"] }),
  });

  const openCreate = () => {
    setEditingTemplate(null);
    setName("");
    setDescription("");
    setContent("");
    setEditModal(true);
  };

  const openEdit = (t: Template) => {
    setEditingTemplate(t);
    setName(t.name);
    setDescription(t.description || "");
    setContent(t.content);
    setEditModal(true);
  };

  const closeModal = () => {
    setEditModal(false);
    setEditingTemplate(null);
  };

  const handleSave = () => {
    saveMutation.mutate({
      id: editingTemplate?.id,
      name,
      content,
      description,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1d1d1f] dark:text-white">
            Cover Letter Templates
          </h1>
          <p className="text-sm text-[#86868b] dark:text-[#8e8e93] mt-0.5">
            Manage templates for cover letter generation
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> New Template
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates?.map((t) => (
            <Card key={t.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-600/10 shrink-0">
                        <FileText className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <h3 className="font-semibold text-[#1d1d1f] dark:text-white text-sm">{t.name}</h3>
                      {t.isSystem && (
                        <Badge className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-[10px]">
                          System
                        </Badge>
                      )}
                    </div>
                    {t.description && (
                      <p className="text-xs text-[#86868b] dark:text-[#8e8e93] ml-9">{t.description}</p>
                    )}
                    <p className="text-xs text-[#86868b] dark:text-[#8e8e93] mt-2 ml-9 line-clamp-2">
                      {t.content.substring(0, 150)}...
                    </p>
                  </div>
                  {!t.isSystem && (
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(t)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(t.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={editModal}
        onClose={closeModal}
        title={editingTemplate ? "Edit Template" : "New Template"}
      >
        <div className="space-y-4">
          <Input
            label="Template Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Technical Role Template"
          />
          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this template"
          />
          <div>
            <label className="block text-xs font-medium text-[#86868b] dark:text-[#8e8e93] mb-1.5">
              Content
            </label>
            <textarea
              className="block w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-white px-3 py-2 text-sm placeholder:text-[#86868b] dark:placeholder:text-[#636366] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-shadow"
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Use {{jobTitle}}, {{company}}, {{userName}}, {{skills}}, {{body}} as variables..."
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saveMutation.isPending}>
              Save Template
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
