import axios from "axios";

const API_BASE = "http://localhost:8080/api";

const authHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
});

export const getAllSpeciesApi = () => axios.get(`${API_BASE}/species`, authHeader());
export const createPlantApi = (data) => axios.post(`${API_BASE}/plants`, data, authHeader());