import { EFilterOperatorAPI } from "./EFilterOperatorAPI";
import type { IFilterParamAPI } from "./IFilterParamAPI";

interface IFilterSet {
  items?: IFilterParamAPI[];
  operator?: EFilterOperatorAPI;
  children?: IFilterSet[];
}

export type { IFilterSet };
