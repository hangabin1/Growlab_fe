import Footer from "./Footer";
import Header from "./Header";
import { useLocation } from "react-router-dom";

function Layout({ children }) {
    const { pathname } = useLocation();
    const fullScreen = pathname === "/login" || pathname === "/signup";
    // 페이지 스스로 전폭 배경 + container-page를 쓰는 경우
    const fullBleed = pathname.startsWith("/monitoring/");
    // 헤더/푸터 없이 AuthLayout 단독 화면
    const authScreen = ["/login", "/find-id", "/forgot-password", "/signup"].includes(pathname);

    if (authScreen) return children;

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />
            <main className={fullScreen || fullBleed
                ? "flex-grow p-0"
                : "flex-grow container-page py-6 lg:py-10"
            }>
                {children}
            </main>
            <Footer />
        </div>
    )
}

export default Layout;