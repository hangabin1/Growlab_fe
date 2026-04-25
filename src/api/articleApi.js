import axios from "axios";

const BASE_URL = "http://localhost:8080/api";

// --- 게시글(Article) 관련 ---

// 전체 목록 조회
export const getArticlesApi = (token) => 
    axios.get(`${BASE_URL}/articles`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
    });

// 상세 조회
export const getArticleDetailApi = (id, token) => 
    axios.get(`${BASE_URL}/articles/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
    });

// 게시글 생성
export const createArticleApi = (formData, token) =>
    axios.post(`${BASE_URL}/articles`, formData, {
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
        },
        withCredentials: true
    });

// 게시글 삭제 
export const deleteArticleApi = (id, token) =>
    axios.delete(`${BASE_URL}/articles/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
    });

// 게시글 수정 API
export const updateArticleApi = (id, formData, token) =>
    axios.put(`${BASE_URL}/articles/${id}`, formData, {
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
        },
        withCredentials: true
    });

// 좋아요 토글
export const toggleArticleLikeApi = (id, token) => 
    axios.post(`${BASE_URL}/articles/${id}/likes`, {}, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
    });


// --- 댓글(Comment) 관련 ---

// 댓글 목록 조회
export const getCommentsByArticleApi = (articleId) =>
    axios.get(`${BASE_URL}/articles/${articleId}/comments`, {
        withCredentials: true 
    });

// 댓글 생성
export const createCommentApi = (articleId, data, token) =>
    axios.post(`${BASE_URL}/articles/${articleId}/comments`, data, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
    });

// 댓글 수정 
export const updateCommentApi = (commentId, data, token) =>
    axios.put(`${BASE_URL}/comments/${commentId}`, data, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
    });

// 댓글 삭제 
export const deleteCommentApi = (commentId, token) =>
    axios.delete(`${BASE_URL}/comments/${commentId}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
    });