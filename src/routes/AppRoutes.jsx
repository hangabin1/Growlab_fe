import { Route, Routes } from "react-router-dom";
import HomePage from "../pages/home/HomePage";
import ArticleListPage from "../pages/article/ArticleListPage";
// import AdminPage from "../pages/admin/AdminPage";
import ArticleDetailPage from '../pages/article/ArticleDetailPage';
import ArticleCreatePage from '../pages/article/ArticleCreatePage';
import LoginPage from "../pages/auth/LoginPage";
import SignUpPage from "../pages/auth/SignUpPage";
import MyPage from "../pages/mypage/MyPage";
import ProtectedRoute from "../components/layouts/ProtectedRoute";
import NotificationPage from "../pages/notifications/NotificationPage";

function AppRoutes() {
    return (
        <Routes>
            {/* home */}
            <Route path="/" element={<HomePage />} />

            {/* admin */}
            {/* <Route path="/admin" element={<AdminPage />} /> */}
            {/* <Route path="/admin/articles" element={<ArticleManagementPage />} /> */}
            {/* <Route path="/admin/articles/create" element={<ArticleCreatePage />} /> */}

            {/* article*/}
            <Route path="/articles" element={<ArticleListPage />} />
            {/* articles/write protected route 적용 필요 */}
            <Route path="/articles/write" element={<ArticleCreatePage />} />
            <Route path="/articles/:id" element={<ArticleDetailPage />} />

            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />

            <Route path="/mypage" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />

            <Route path="/notifications" element={<ProtectedRoute><NotificationPage /></ProtectedRoute>} />
        </Routes>
    )
}

export default AppRoutes;