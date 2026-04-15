import axios from "axios";

const API_BASE = "http://localhost:8080/api/auth";

export const loginApi = (username, password) =>
    axios.post(`${API_BASE}/login`, { username, password });

export const signupApi = (username, email, password) =>
    axios.post(`${API_BASE}/signup`, { username, email, password });

export const updateUsernameApi = (newUsername, token) =>
    axios.put(`${API_BASE}/username`,
        { newUsername },
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

export const updatePasswordApi = (oldPassword, newPassword, token) =>
    axios.put(`${API_BASE}/password`,
        { oldPassword, newPassword },
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

export const deleteUserApi = (password, token) =>
    axios.delete(`${API_BASE}/withdraw`, {
        params: { password },
        headers: {
            Authorization: `Bearer ${token}`
        }
    });