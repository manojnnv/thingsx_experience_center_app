import { api } from "@/app/utils/api";
import { fail, getErrorMessage, ok, ServiceResult } from "@/app/services/serviceUtils";

type TemplatePreviewResponse = {
  status?: string;
  template_id?: number;
  image_format?: string;
  image_base64?: string;
};

const fetchTemplatePreview = async (
  templateId: number
): Promise<ServiceResult<TemplatePreviewResponse>> => {
  try {
    const resp = await api.post<TemplatePreviewResponse>("/v1/esl/template/preview", {
      template_id: templateId,
    });
    return ok(resp?.data);
  } catch (error) {
    return fail(getErrorMessage(error, "Failed to fetch template preview"));
  }
};

export { fetchTemplatePreview };
