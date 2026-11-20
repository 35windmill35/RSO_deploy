import type { IResultAPI } from "./IResultAPI";

interface IResponseAPI {
  MAX_UPLOAD_SIZE?: number;
  result: IResultAPI;
  SESSIONID?: string;
  api_version?: string;
}

export type { IResponseAPI };
