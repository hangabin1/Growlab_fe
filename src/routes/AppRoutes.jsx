import { Route, Routes } from "react-router-dom";
import HomePage from "../pages/home/HomePage";
import BoardListPage from "../pages/boards/BoardListPage";

function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/boards" element={<BoardListPage />} />
        </Routes>
    )
}

export default AppRoutes;