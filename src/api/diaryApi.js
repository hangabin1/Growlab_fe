import axios from "axios";

const API_BASE = "http://localhost:8080/api";

const authHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
});

export const getPlantsApi = () => axios.get(`${API_BASE}/plants`, authHeader());
export const getDiariesApi = (plantId) => axios.get(`${API_BASE}/plants/${plantId}/diaries`, authHeader());
export const getDiaryByIdApi = (plantId, diaryId) => axios.get(`${API_BASE}/plants/${plantId}/diaries/${diaryId}`, authHeader());
export const createDiaryApi = (plantId, formData) =>
    axios.post(`${API_BASE}/plants/${plantId}/diaries`, formData, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
        }
    });

export const updateDiaryApi = (plantId, diaryId, formData) =>
    axios.put(`${API_BASE}/plants/${plantId}/diaries/${diaryId}`, formData, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
        }
    });
export const deleteDiaryApi = (plantId, diaryId) => axios.delete(`${API_BASE}/plants/${plantId}/diaries/${diaryId}`, authHeader());