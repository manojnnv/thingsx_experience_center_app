import { api } from "@/app/utils/api";

type TemplateMappingResponse = {
  status?: string;
  data?: Array<{ template_id?: number }>;
};

const fetchTemplateMapping = async (tin: string) => {
  const resp = await api.post<TemplateMappingResponse>("/v1/esl/tin/template/get", {
    tin,
  });
  return resp?.data;
};

export { fetchTemplateMapping };
