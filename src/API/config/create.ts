import axios from "axios";
import { APP_CODE, APP_NAME, APP_VERSION } from "./constant";
import { API_URL } from "@/APP/clients";

const api = axios.create({ baseURL: API_URL });

const getLoginQuery = () => {
  return `AppName=${APP_NAME}&AppVersion=${APP_VERSION}&AppCode=${APP_CODE}`;
};

export { api, getLoginQuery };
