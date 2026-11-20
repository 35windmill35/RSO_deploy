import { EFilterOperatorAPI } from "../types/filters/EFilterOperatorAPI";
import { EMethodFilter } from "../types/filters/EMethodFilter";
import { FIELDS, FILTER_PARAM, FILTER_STRING, WITH_OBJECTS } from "./constants";
import type { ESubscribeType } from "../types/filters/ESubscribeType";
import type { IAddedFields } from "../types/filters/IAddedFields";
import type { IFilterPairResult } from "../types/filters/IFilterPairResult";
import type { IFilterParamAPI } from "../types/filters/IFilterParamAPI";
import type { IFilterSet } from "../types/filters/IFilterSet";

const createWithObjects = (objects?: string[]) => {
  if (!objects) return "";
  let result = "";
  objects.forEach((item) => {
    result += `&${WITH_OBJECTS}[]=${item}`;
  });
  return result;
};

const createAddedFields = (fields?: IAddedFields[]) => {
  if (!fields) return "";
  let result: string = "";
  fields.forEach((field) => {
    result += `&${FIELDS}[${field.name}]=`;
    field.params.forEach((param) => {
      result += param + ",";
    });
    result = result.slice(0, -1);
  });
  return result;
};

const createSubscribe = (subscribeType: ESubscribeType) => {
  return `&Subscribe=${subscribeType}&SubscriptionNotify=1`;
};

const createFilterByGroupId = (listId: number[], nameId: string): string => {
  if (!listId.length) return "";
  const items: IFilterParamAPI[] = [];
  listId.forEach((id) => {
    items.push({
      key: nameId,
      method: EMethodFilter.equal,
      value: id.toString(),
    });
  });
  return createFilter({ items, operator: EFilterOperatorAPI.or });
};

const createFilter = (values?: IFilterSet): string => {
  if (!values?.children?.length && !values?.items?.length) return "";
  const operator = values.operator ?? EFilterOperatorAPI.and;
  const filterString: string[] = [];
  const filterParam: string[] = [];
  let index = 0;
  values.items?.forEach((item) => {
    const node = getFilterPair(item, index);
    filterParam.push(node.filterParam);
    filterString.push(node.filterString);
    index = node.index;
  });
  values.children?.forEach((item) => {
    const node = createFilterNode(item, index);
    if (node.filterString) filterString.push(node.filterString);
    if (node.filterParam) filterParam.push(node.filterParam);
    index = node.index;
  });
  let filterStringJoin = "";
  if (filterString.length === 1) filterStringJoin = filterString[0];
  else filterStringJoin = filterString.map((item) => `(${item})`).join(` ${operator} `);
  const filterParamJoin = filterParam.join("");
  const result = `&${FILTER_STRING}=${filterStringJoin}${filterParamJoin}`;
  return result;
};

const createFilterNode = (data: IFilterSet | undefined, index: number): IFilterPairResult => {
  const result: IFilterPairResult = {
    filterString: "",
    filterParam: "",
    index,
  };
  if (!data) return result;
  const operator = data.operator ?? EFilterOperatorAPI.and;
  const filterString: string[] = [];
  const filterParam: string[] = [];
  let currentIndex = index;
  data.items?.forEach((node) => {
    const pair = getFilterPair(node, currentIndex);
    filterString.push(pair.filterString);
    filterParam.push(pair.filterParam);
    currentIndex = pair.index;
  });
  data.children?.forEach((item) => {
    const node = createFilterNode(item, currentIndex);
    if (node.filterString) filterString.push(node.filterString);
    if (node.filterParam) filterParam.push(node.filterParam);
    currentIndex = node.index;
  });

  if (filterString.length === 1) result.filterString = filterString[0];
  else result.filterString = filterString.map((item) => `(${item})`).join(` ${operator} `);
  result.filterParam = filterParam.join("");
  result.index = currentIndex;
  return result;
};

const getFilterPair = (node: IFilterParamAPI, index: number): IFilterPairResult => {
  const result: IFilterPairResult = {
    filterString: "",
    filterParam: "",
    index,
  };
  result.filterString = `${node.key} ${node.method}`;
  switch (node.method) {
    case EMethodFilter.isNull:
    case EMethodFilter.isNotnull:
      break;
    case EMethodFilter.like:
      result.filterParam = `&${FILTER_PARAM}[${index}]=%25${node.value}%25`;
      result.index++;
      break;
    case EMethodFilter.notLike:
      result.filterString = `not(${node.key} like ? )`;
      result.filterParam = `&${FILTER_PARAM}[${index}]=%25${node.value}%25`;
      result.index++;
      break;
    default:
      result.filterParam = `&${FILTER_PARAM}[${index}]=${node.value}`;
      result.index++;
  }
  return result;
};

export {
  createWithObjects,
  createAddedFields,
  createSubscribe,
  createFilterByGroupId,
  createFilter,
};
