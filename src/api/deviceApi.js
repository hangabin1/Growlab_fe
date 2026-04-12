import axios from "axios";

const API_BASE = "http://localhost:8080/api/devices";

const authHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
});

export const registerDeviceApi = (serialNumber, deviceNickname) =>
    axios.post(`${API_BASE}/register`, { serialNumber, deviceNickname }, authHeader());