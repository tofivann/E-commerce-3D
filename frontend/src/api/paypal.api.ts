import { axiosClient } from "../services/axiosClient";

export const capturarOrdenPayPal = async (paypalOrderId: string): Promise<{ status: string; tipo: string }> => {
  const response = await axiosClient.post("paypal/capturar-orden/", { paypal_order_id: paypalOrderId });
  return response.data;
};
