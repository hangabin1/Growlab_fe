import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    getAllNoticesApi,
    readNoticeApi,
    readAllNoticesApi,
    deleteNoticeApi
} from "../../api/noticeApi";

const PRIORITY_STYLE = {
    1: { label: "긴급", style: "bg-red-100 text-red-600" },
    2: { label: "경고", style: "bg-yellow-100 text-yellow-600" },
    3: { label: "정보", style: "bg-blue-100 text-blue-600" },
};

const TYPE_ICON = {
    WATER: "💧",
    TEMP: "🌡",
    HUMIDITY: "💦",
    SYSTEM: "⚙️",
};

function NotificationPage() {
    const navigate = useNavigate();
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all"); // all | unread

    const token = localStorage.getItem("token");

    useEffect(() => {
        if (!token) { navigate("/login"); return; }
        fetchNotices();
    }, []);

    const fetchNotices = async () => {
        setLoading(true);
        try {
            const res = await getAllNoticesApi();
            setNotices(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleRead = async (noticeId) => {
        try {
            await readNoticeApi(noticeId);
            setNotices(prev => prev.map(n => n.id === noticeId ? { ...n, read: true } : n));
        } catch (err) { console.error(err); }
    };

    const handleReadAll = async () => {
        try {
            await readAllNoticesApi();
            setNotices(prev => prev.map(n => ({ ...n, read: true })));
        } catch (err) { console.error(err); }
    };

    const handleDelete = async (noticeId) => {
        try {
            await deleteNoticeApi(noticeId);
            setNotices(prev => prev.filter(n => n.id !== noticeId));
        } catch (err) { console.error(err); }
    };

    const filtered = filter === "unread" ? notices.filter(n => !n.read) : notices;
    const unreadCount = notices.filter(n => !n.read).length;

    return (
        <div className="max-w-2xl mx-auto">
            {/* 헤더 */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-gray-800">알림</h1>
                    {unreadCount > 0 && (
                        <span className="bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            {unreadCount}
                        </span>
                    )}
                </div>
                <div className="flex gap-2">
                    {/* 필터 */}
                    <div className="flex bg-gray-100 rounded-lg p-1 text-sm">
                        <button
                            onClick={() => setFilter("all")}
                            className={`px-3 py-1 rounded-md transition-colors ${filter === "all" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"}`}
                        >전체</button>
                        <button
                            onClick={() => setFilter("unread")}
                            className={`px-3 py-1 rounded-md transition-colors ${filter === "unread" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"}`}
                        >읽지 않음</button>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={handleReadAll}
                            className="text-sm text-green-600 hover:text-green-700 font-medium px-3 py-1 border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
                        >
                            모두 읽음
                        </button>
                    )}
                </div>
            </div>

            {/* 알림 목록 */}
            {loading ? (
                <div className="text-center text-gray-400 py-20">불러오는 중...</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20">
                    <div className="text-4xl mb-3">🔔</div>
                    <p className="text-gray-400">알림이 없어요</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {filtered.map(notice => {
                        const priority = PRIORITY_STYLE[notice.priority] || { label: "정보", style: "bg-gray-100 text-gray-600" };
                        const icon = TYPE_ICON[notice.noticeType] || "🔔";
                        return (
                            <div
                                key={notice.id}
                                className={`bg-white rounded-xl border p-4 flex gap-3 transition-colors ${notice.read ? "border-gray-100 opacity-70" : "border-gray-200"}`}
                            >
                                {/* 아이콘 */}
                                <div className="text-2xl pt-0.5">{icon}</div>

                                {/* 내용 */}
                                <div className="flex-grow">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priority.style}`}>
                                            {priority.label}
                                        </span>
                                        {notice.deviceSerial && (
                                            <span className="text-xs text-gray-400">{notice.deviceSerial}</span>
                                        )}
                                        {!notice.read && (
                                            <span className="w-2 h-2 bg-green-500 rounded-full ml-auto"></span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-700">{notice.message}</p>
                                    <p className="text-xs text-gray-400 mt-1">{new Date(notice.createdAt).toLocaleString("ko-KR")}</p>
                                </div>

                                {/* 액션 버튼 */}
                                <div className="flex flex-col gap-1 items-end justify-start">
                                    {!notice.read && (
                                        <button
                                            onClick={() => handleRead(notice.id)}
                                            className="text-xs text-green-600 hover:text-green-700 font-medium whitespace-nowrap"
                                        >읽음</button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(notice.id)}
                                        className="text-xs text-gray-300 hover:text-red-400 transition-colors"
                                    >삭제</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default NotificationPage;