import type { IDataResponseAPI } from "./IDataResponseAPI";

interface IResultAPI {
  Message: string;
  Status: number;
  Response?: object | Record<string, IDataResponseAPI>;
  Error?: object;
}

export type { IResultAPI };
