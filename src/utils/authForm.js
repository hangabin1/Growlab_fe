export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const VERIFICATION_CODE_RE = /^\d{6}$/;

export function authErrorMessage(error, fallback) {
    const data = error.response?.data;
    if (typeof data?.message === "string") return data.message;
    return typeof data === "string" && data ? data : fallback;
}
