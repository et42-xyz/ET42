import axios, { AxiosInstance } from "axios";
import { DEFAULT_CHAIN_ID } from "@/contracts/constants";

axios.defaults.headers["Content-Type"] = "application/json";

let requestUrl = process.env.REACT_APP_API_HTTP_URL || "https://api.example.com";

const Axios: AxiosInstance = axios.create({
  timeout: 120000,
  baseURL: requestUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

Axios.interceptors.request.use((config) => {
  let token = localStorage.getItem("x");

  if (token) {
    config.headers.Authorization = "Bearer " + token;
  }

  // Inject current chainId. Falls back to DEFAULT_CHAIN_ID when the window
  // global has not been written yet (first paint). Explicit values from the
  // caller win and stay on the right of the spread.
  const currentChainId = (typeof window !== "undefined" && (window as any).__currentChainId__) || DEFAULT_CHAIN_ID;
  const method = (config.method || "get").toLowerCase();

  if (method === "get") {
    config.params = { chainId: currentChainId, ...(config.params || {}) };
  } else if (config.data && !(config.data instanceof FormData)) {
    // Only inject into plain-object bodies; leave FormData (image uploads) untouched.
    if (typeof config.data === "object") {
      config.data = { chainId: currentChainId, ...config.data };
    }
  } else if (!config.data && method !== "get") {
    config.data = { chainId: currentChainId };
  }

  return config;
});

Axios.interceptors.response.use(
  (response): any => {
    return response.data;
  },
  (response): any => {
    return response;
  }
);

export default Axios as unknown as {
  get: (url: string, config?: any) => Promise<any>;
  post: (url: string, data?: any, config?: any) => Promise<any>;
};
