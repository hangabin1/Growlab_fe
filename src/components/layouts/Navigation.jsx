import { useState } from "react";
import { Link } from "react-router-dom";
import NavLinks from "./NavLinks";


function Navigation() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <nav className="bg-gray-800 text-white shadow-md">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center py-4">
                    {/* 로고 */}
                    <Link className="text-xl font-bold hover:text-gray-300" to="/" onClick={() => setIsOpen(false)}>
                        Logo
                    </Link>

                    {/* 데스크탑 메뉴 (md 이상에서 표시) */}
                    <ul className="hidden md:flex items-center space-x-1">
                        <NavLinks />
                    </ul>
                    
                    {/* 모바일 햄버거 버튼 (md 미만에서만 표시) */}
                    <div className="md:hidden">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="text-gray-300 hover:text-white focus:outline-none"
                        >
                            <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24">
                                {isOpen ? (
                                    // 'X' 모양 아이콘 (메뉴 열렸을 때)
                                    <path fillRule="evenodd" clipRule="evenodd" d="M18.278 16.864a1 1 0 01-1.414 1.414l-4.829-4.828-4.828 4.828a1 1 0 01-1.414-1.414l4.828-4.829-4.828-4.828a1 1 0 011.414-1.414l4.829 4.828 4.828-4.828a1 1 0 111.414 1.414l-4.828 4.829 4.828 4.828z" />
                                ) : (
                                    // '≡' 모양 아이콘 (메뉴 닫혔을 때)
                                    <path fillRule="evenodd" d="M4 5h16a1 1 0 010 2H4a1 1 0 110-2zm0 6h16a1 1 0 010 2H4a1 1 0 010-2zm0 6h16a1 1 0 010 2H4a1 1 0 010-2z" />
                                )}
                            </svg>
                        </button>
                    </div>
                </div>

                {/* 모바일 드롭다운 메뉴 (md 미만에서 isOpen이 true일 때만 표시) */}
                <div className={`${isOpen ? "block" : "hidden"} md:hidden pb-4`}>
                    <ul className="flex flex-col space-y-2">
                        <NavLinks onClick={() => setIsOpen(false)} isMobile={true} />
                    </ul>
                </div>
            </div>
        </nav>
    );
}

export default Navigation;