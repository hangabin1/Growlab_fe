export function deviceSettingsSuccess(response, fallback) {
    return typeof response?.data === "string" && response.data.trim()
        ? response.data.trim()
        : fallback;
}

export function deviceSettingsError(error, fallback) {
    const status = error?.response?.status;
    if (status === 401) return "로그인이 만료되었어요. 다시 로그인해 주세요.";
    if (status === 403) return "해당 기기를 제어할 권한이 없어요.";
    const data = error?.response?.data;
    if (typeof data === "string" && data.trim() && !data.trim().startsWith("<")) return data.trim();
    if (typeof data?.message === "string" && data.message.trim()) return data.message.trim();
    if (typeof data?.detail === "string" && data.detail.trim()) return data.detail.trim();
    if (error?.request && !error.response) return "백엔드에 연결할 수 없어요. 서버 실행 상태를 확인해 주세요.";
    return fallback;
}
