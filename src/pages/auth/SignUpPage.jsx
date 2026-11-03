import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signupApi, sendEmailCodeApi, verifyEmailCodeApi } from "../../api/authApi";
import AuthLayout from "../../components/layouts/AuthLayout";
import { AuthField, AuthInput, AuthInputRow, AuthActionButton, AuthPrimaryButton, StatusChip } from "../../components/auth/AuthUI";
import iconBack from "../../assets/icon-back.svg";
import { EMAIL_RE, VERIFICATION_CODE_RE, authErrorMessage } from "../../utils/authForm";

function SignUpPage() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ username: "", email: "", password: "", confirmPassword: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // ✅ 이메일 인증 관련 상태
    const [code, setCode] = useState("");
    const [codeSent, setCodeSent] = useState(false);
    const [emailVerified, setEmailVerified] = useState(false);
    const [sendLoading, setSendLoading] = useState(false);
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [emailError, setEmailError] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));

        // ✅ 이메일을 다시 바꾸면 인증 상태 초기화
        if (name === "email") {
            setEmailVerified(false);
            setCodeSent(false);
            setCode("");
            setEmailError("");
        }
    };

    const handleSendCode = async () => {
        if (!EMAIL_RE.test(form.email.trim())) {
            setEmailError("올바른 이메일을 입력해주세요.");
            return;
        }
        setSendLoading(true);
        setEmailError("");
        try {
            await sendEmailCodeApi(form.email.trim());
            setCodeSent(true);
            setCode("");
            setEmailVerified(false);
        } catch (err) {
            setEmailError(authErrorMessage(err, "인증코드 발송에 실패했습니다."));
        } finally {
            setSendLoading(false);
        }
    };

    const handleVerifyCode = async () => {
        if (!VERIFICATION_CODE_RE.test(code)) {
            setEmailError("6자리 인증코드를 입력해주세요.");
            return;
        }
        setVerifyLoading(true);
        setEmailError("");
        try {
            await verifyEmailCodeApi(form.email.trim(), code);
            setEmailVerified(true);
        } catch (err) {
            const msg = authErrorMessage(err, "인증코드 확인에 실패했습니다.");
            setEmailError(msg);
            setCode("");
        } finally {
            setVerifyLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!emailVerified) {
            setError("이메일 인증을 먼저 완료해주세요.");
            return;
        }

        if (form.password !== form.confirmPassword) {
            setError("비밀번호가 일치하지 않습니다.");
            return;
        }
        if (form.username.length < 4 || form.username.length > 20 || form.password.length < 8 || form.password.length > 20) {
            setError("아이디는 4~20자, 비밀번호는 8~20자로 입력해주세요.");
            return;
        }

        setLoading(true);
        try {
            await signupApi(form.username, form.email, form.password);
            navigate("/login");
        } catch (err) {
            setError(authErrorMessage(err, "회원가입 중 오류가 발생했습니다."));
        } finally {
            setLoading(false);
        }
    };

    // 입력 횟수 초과·만료 후에는 새 코드를 발송받아야 다시 인증할 수 있다.
    const codeLocked = emailError.includes("초과") || emailError.includes("다시 받아주세요");
    const canSignUp = emailVerified && form.username.length >= 4 && form.username.length <= 20
        && form.password.length >= 8 && form.password.length <= 20
        && form.password === form.confirmPassword;

    return (
        <AuthLayout wide top={80}>
            {/* 제목: PC/H1/Bold, 뒤로가기 아이콘 32 + 간격 16 */}
            <div className="flex items-center gap-4 lg:-ml-12">
                <Link to="/login" aria-label="로그인으로 돌아가기" className="shrink-0">
                    <img src={iconBack} alt="" width="32" height="32" />
                </Link>
                <h1 className="text-h2 font-bold text-gray-950">회원가입</h1>
            </div>
            <p className="mt-1 text-h4 font-normal text-gray-600">Grow Lab 과 함께 스마트팜을 시작해보세요!</p>

            <form onSubmit={handleSubmit} className="mt-8">
                <div className="flex flex-col gap-5">
                    <AuthField size="md" label="아이디" htmlFor="username" hint="4~20자 이내로 입력해주세요">
                        <AuthInput
                            size="md"
                            id="username"
                            type="text"
                            name="username"
                            value={form.username}
                            onChange={handleChange}
                            placeholder="아이디를 입력하세요"
                            autoComplete="username"
                            minLength={4}
                            maxLength={20}
                            required
                        />
                    </AuthField>

                    <AuthField
                        size="md"
                        label="이메일"
                        htmlFor="email"
                        hint="‘@’ 을 포함해 입력해주세요"
                        error={!codeSent ? emailError : ""}
                    >
                        <AuthInputRow>
                            <AuthInput
                                size="md"
                                id="email"
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                placeholder="이메일을 입력하세요"
                                autoComplete="email"
                                required
                                disabled={emailVerified}
                            />
                            <AuthActionButton
                                size="md"
                                onClick={handleSendCode}
                                disabled={!EMAIL_RE.test(form.email.trim()) || sendLoading || verifyLoading || loading}
                            >
                                {sendLoading ? "발송 중..." : codeSent ? "재발송 하기" : "인증번호 받기"}
                            </AuthActionButton>
                        </AuthInputRow>
                    </AuthField>

                    {/* 인증번호 - 발송 후 노출 (인증 완료 후에도 결과 표시) */}
                    {codeSent && (
                        <AuthField
                            size="md"
                            label="인증번호"
                            htmlFor="code"
                            hint="인증번호가 발송되었습니다. 메일함 (스팸함 포함) 을 확인해주세요. 5분 이내에 입력해 주세요."
                            status={
                                emailVerified ? (
                                    <StatusChip type="success" className="lg:w-[calc(100%-220px)]">인증이 완료되었습니다.</StatusChip>
                                ) : emailError ? (
                                    codeLocked ? (
                                        <StatusChip type="error" full>{emailError}</StatusChip>
                                    ) : (
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                            <StatusChip type="error">{emailError}</StatusChip>
                                            <span className="text-body1 text-gray-400">메일함(스팸) 을 확인해주세요. 5분 이내에 입력해 주세요.</span>
                                        </div>
                                    )
                                ) : null
                            }
                        >
                            <AuthInputRow>
                                <AuthInput
                                    size="md"
                                    id="code"
                                    type="text"
                                    inputMode="numeric"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                    placeholder="6자리 숫자를 입력하세요"
                                    maxLength={6}
                                    autoComplete="one-time-code"
                                    disabled={emailVerified}
                                />
                                <AuthActionButton
                                    size="md"
                                    done={emailVerified}
                                    onClick={handleVerifyCode}
                                    disabled={emailVerified || verifyLoading || sendLoading || codeLocked || !VERIFICATION_CODE_RE.test(code)}
                                >
                                    {emailVerified ? "인증 완료" : verifyLoading ? "확인 중..." : "인증 확인"}
                                </AuthActionButton>
                            </AuthInputRow>
                        </AuthField>
                    )}

                    <AuthField size="md" label="비밀번호" htmlFor="password" hint="8~20자 이내로 입력해주세요">
                        <AuthInput
                            size="md"
                            id="password"
                            type="password"
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            placeholder="비밀번호를 입력하세요"
                            autoComplete="new-password"
                            minLength={8}
                            maxLength={20}
                            required
                        />
                    </AuthField>

                    <AuthField size="md" label="비밀번호 확인" htmlFor="confirmPassword">
                        <AuthInput
                            size="md"
                            id="confirmPassword"
                            type="password"
                            name="confirmPassword"
                            value={form.confirmPassword}
                            onChange={handleChange}
                            placeholder="비밀번호를 다시 입력하세요"
                            autoComplete="new-password"
                            minLength={8}
                            maxLength={20}
                            required
                        />
                    </AuthField>
                </div>

                {error && <StatusChip type="error" full className="mt-5">{error}</StatusChip>}

                {/* Figma: 인증번호 칸이 생기면 1080 안에 맞추려고 간격을 좁힘 (44→32, 40→20) */}
                <AuthPrimaryButton size="md" type="submit" disabled={loading || sendLoading || verifyLoading || !canSignUp} className={codeSent ? "mt-8" : "mt-11"}>
                    {loading ? "가입 중..." : "회원가입 하기"}
                </AuthPrimaryButton>
            </form>

            <div className={`${codeSent ? "mt-5" : "mt-10"} flex items-center justify-center gap-3 text-sub1 font-medium`}>
                <span className="text-gray-400">이미 계정이 있으신가요?</span>
                <Link to="/login" className="w-20 text-brand hover:underline">로그인</Link>
            </div>
        </AuthLayout>
    );
}

export default SignUpPage;
