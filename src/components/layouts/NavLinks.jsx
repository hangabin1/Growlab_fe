import { Link } from "react-router-dom";

function NavLinks({ onClick }) {
    const baseStyle = "px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700 block";
    
    return (
        <>
            <li><Link className={baseStyle} to="/boards" onClick={onClick}>게시판</Link></li>
            <li><Link className={baseStyle} to="/chatbot" onClick={onClick}>AI 챗봇</Link></li>
            <li><Link className={baseStyle} to="/admin" onClick={onClick}>관리자</Link></li>
            <li><Link className={baseStyle} to="/login" onClick={onClick}>로그인</Link></li>
            <li><Link className={baseStyle} to="/signup" onClick={onClick}>회원가입</Link></li>
        </>
    );
}

export default NavLinks;