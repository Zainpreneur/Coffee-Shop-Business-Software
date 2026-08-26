import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("coffeeshop_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("coffeeshop_token");
      localStorage.removeItem("coffeeshop_user");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export function apiErrorMessage(err: unknown): string {
  const anyErr = err as any;
  const data = anyErr?.response?.data;
  if (!data) return anyErr?.message || "Something went wrong";
  if (typeof data.error === "string") return data.error;
  if (data.error?.formErrors?.length) return data.error.formErrors.join(", ");
  if (data.error?.fieldErrors) {
    const msgs = Object.values(data.error.fieldErrors).flat();
    if (msgs.length) return msgs.join(", ");
  }
  return "Something went wrong";
}
