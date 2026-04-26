import axios from "axios";

const API_BASE = "http://localhost:8080/api";

const authHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
});

export const getMyArticlesApi = (page = 0, size = 10) =>
    axios.get(`${API_BASE}/articles/my?page=${page}&size=${size}`, authHeader());