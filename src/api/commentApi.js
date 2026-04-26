import axios from "axios";

const authHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
});

export const getMyCommentsApi = (userId) =>
    axios.get(`http://localhost:8080/api/comments/my?userId=${userId}`, authHeader());