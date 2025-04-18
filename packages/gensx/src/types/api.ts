export interface GenSXAPIResponse<T> {
  status: "ok" | "error";
  data?: T;
  error?: string;
}
