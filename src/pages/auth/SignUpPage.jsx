import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signupApi } from "../../api/authApi";

function SignUpPage() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ username: "", email: "", password: "", confirmPassword: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (form.password !== form.confirmPassword) {
            setError("비밀번호가 일치하지 않습니다.");
            return;
        }

        setLoading(true);
        try {
            await signupApi(form.username, form.email, form.password);
            navigate("/login");
        } catch (err) {
            setError(err.response?.data || "회원가입 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm w-full max-w-md p-8">
                {/* 로고 */}
                <div className="text-center mb-8">
                    <div className="text-3xl mb-2">🌱</div>
                    <h1 className="text-2xl font-bold text-gray-800">GrowLab 회원가입</h1>
                    <p className="text-sm text-gray-400 mt-1">스마트팜을 시작해보세요</p>
                </div>

                {/* 소셜 가입 */}
                <div className="flex flex-col gap-3 mb-6">
                    <button className="flex items-center justify-center gap-3 w-full border border-gray-200 rounded-lg py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="google" />
                        Google로 가입
                    </button>
                    <button className="flex items-center justify-center gap-3 w-full bg-yellow-300 rounded-lg py-2.5 text-sm text-yellow-900 font-medium hover:bg-yellow-400 transition-colors">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/e/e3/KakaoTalk_logo.svg" className="w-5 h-5" alt="kakao" />
                        카카오로 가입
                    </button>
                </div>

                <div className="flex items-center gap-3 mb-6">
                    <hr className="flex-grow border-gray-200" />
                    <span className="text-xs text-gray-400">또는</span>
                    <hr className="flex-grow border-gray-200" />
                </div>

                {/* 일반 가입 폼 */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {error && (
                        <div className="bg-red-50 text-red-500 text-sm rounded-lg px-4 py-2">
                            {error}
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">아이디</label>
                        <input
                            type="text"
                            name="username"
                            value={form.username}
                            onChange={handleChange}
                            placeholder="아이디를 입력하세요"
                            required
                            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                        <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="이메일을 입력하세요"
                            required
                            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
                        <input
                            type="password"
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            placeholder="비밀번호를 입력하세요"
                            required
                            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호 확인</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            value={form.confirmPassword}
                            onChange={handleChange}
                            placeholder="비밀번호를 다시 입력하세요"
                            required
                            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
                    >
                        {loading ? "가입 중..." : "회원가입"}
                    </button>
                </form>

                <p className="text-center text-sm text-gray-400 mt-6">
                    이미 계정이 있으신가요?{" "}
                    <Link to="/login" className="text-green-600 font-medium hover:underline">
                        로그인
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default SignUpPage;