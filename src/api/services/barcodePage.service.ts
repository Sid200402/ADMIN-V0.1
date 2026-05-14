import api from "../axiosInstance";

export const barcodePageService = {
  generate: (body: { productId: string; quantity?: number; format?: string }) =>
    api.post("/barcode/generate", body),

  print: (body: { productId: string; quantity: number; priceGroupId?: string }) =>
    api.post("/barcode/print", body),

  scan: (body: { barcode: string }) =>
    api.post("/barcode/scan", body),
};
