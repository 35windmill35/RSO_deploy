import { getZVarApi } from "@/API/requests/params";

const getZVar = async <T>(zvar: string): Promise<string | null> => {
  const data = await getZVarApi(zvar, "DBIndex=0");
  if (data) {
    const response = data.result.Response as T;
    if (response) return response[zvar as keyof T] as string;
  }
  return null;
};

export { getZVar };
