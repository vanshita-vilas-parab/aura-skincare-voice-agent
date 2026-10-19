import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

export const getOrders = async () => {
  const response = await api.get("/orders");
  return response.data;
};

export const getOrderDetails = async (orderId) => {
  const response = await api.get(`/orders/${orderId}`);
  return response.data;
};

export const sendMessage = async (message, history = []) => {
  const response = await api.post("/chat", {
    message,
    history,
  });

  return response.data;
};

export const summarizeCall = async (transcript) =>
  (
    await api.post("/summarize", {
      transcript,
    })
  ).data;

export default api;