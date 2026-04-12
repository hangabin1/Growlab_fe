import { Link } from "react-router-dom";

function NavLinks({ onClick }) {
    const baseStyle = "px-4 py-2 text-sm font-medium text-gray-600 hover:text-green-600 transition-colors";
    
    return (
        <>
            <li><Link className={baseStyle} to="/" onClick={onClick}>🏠 홈</Link></li>
            <li><Link className={baseStyle} to="/community" onClick={onClick}>👥 커뮤니티</Link></li>
            <li><Link className={baseStyle} to="/notifications" onClick={onClick}>🔔 알림</Link></li>
            <li><Link className={baseStyle} to="/login" onClick={onClick}>🔑 로그인</Link></li>
            <li><Link className={baseStyle} to="/signup" onClick={onClick}>✍️ 회원가입</Link></li>
        </>
    );
}

export default NavLinks;