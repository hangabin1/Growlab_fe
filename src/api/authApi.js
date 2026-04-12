import axios from "axios";

const API_BASE = "http://localhost:8080/api/auth";

export const loginApi = (username, password) =>
    axios.post(`${API_BASE}/login`, { username, password });

export const signupApi = (username, email, password) =>
    axios.post(`${API_BASE}/signup`, { username, email, password });