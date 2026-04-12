import axios from "axios";

const API_BASE = "http://localhost:8080/api/notices";

const authHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
});

export const getAllNoticesApi = () => axios.get(API_BASE, authHeader());
export const getUnreadNoticesApi = () => axios.get(`${API_BASE}/unread`, authHeader());
export const getUnreadCountApi = () => axios.get(`${API_BASE}/unread/count`, authHeader());
export const readNoticeApi = (noticeId) => axios.put(`${API_BASE}/${noticeId}/read`, {}, authHeader());
export const readAllNoticesApi = () => axios.put(`${API_BASE}/read-all`, {}, authHeader());
export const deleteNoticeApi = (noticeId) => axios.delete(`${API_BASE}/${noticeId}`, authHeader());