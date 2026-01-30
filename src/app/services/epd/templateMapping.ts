import { api } from "@/app/utils/api";
import { fail, getErrorMessage, ok, ServiceResult } from "@/app/services/serviceUtils";

type TemplateMappingResponse = {
  status?: string;
  data?: Array<{ template_id?: number }>;
};

const fetchTemplateMapping = async (
  tin: string
): Promise<ServiceResult<TemplateMappingResponse>> => {
  try {
    const resp = await api.post<TemplateMappingResponse>("/v1/esl/tin/template/get", {
      tin,
    });
    return ok(resp?.data);
  } catch (error) {
    return fail(getErrorMessage(error, "Failed to fetch template mapping"));
  }
};

export { fetchTemplateMapping };
