import { api } from "@/app/utils/api";

type TemplatePreviewResponse = {
  status?: string;
  template_id?: number;
  image_format?: string;
  image_base64?: string;
};

const fetchTemplatePreview = async (templateId: number) => {
  const resp = await api.post<TemplatePreviewResponse>("/v1/esl/template/preview", {
    template_id: templateId,
  });
  return resp?.data;
};

export { fetchTemplatePreview };
