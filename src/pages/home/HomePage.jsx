import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getUnreadCountApi } from "../../api/noticeApi";
import AddDeviceModal from "../../components/device/AddDeviceModal";

const mockDevices = [];

function DeviceCard({ device }) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 relative">
            <button className="absolute top-3 right-3 text-gray-300 hover:text-red-400 text-lg">✕</button>
            <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{device.emoji}</span>
                <div>
                    <div className="font-semibold text-gray-800 text-sm">{device.name}</div>
                    <div className="text-xs text-gray-400">{device.id}</div>
                </div>
                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium ${device.statusColor}`}>
                    {device.plant} {device.status}
                </span>
                {device.waterAlert && (
                    <span className="ml-1 text-xs px-2 py-0.5 rounded-full font-medium text-red-600 bg-red-50">수위 낮음</span>
                )}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
                {[
                    { label: "온도", value: device.temp },
                    { label: "습도", value: device.humidity },
                    { label: "pH", value: device.ph },
                    { label: "EC", value: device.ec },
                    { label: "수위", value: device.water, alert: device.waterAlert },
                    { label: "조명", value: device.control },
                ].map(({ label, value, alert }) => (
                    <div key={label} className="bg-gray-50 rounded-lg py-2">
                        <div className="text-xs text-gray-400">{label}</div>
                        <div className={`text-sm font-semibold ${alert ? "text-red-500" : "text-gray-700"}`}>{value}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function HomePage() {
    const [devices] = useState(mockDevices);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showAddModal, setShowAddModal] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;
        getUnreadCountApi()
            .then(res => setUnreadCount(res.data))
            .catch(err => console.error(err));
    }, []);

    const summaryItems = [
        { icon: "🌡", label: "평균 온도", value: "23.5°C", color: "text-green-600", onClick: null },
        { icon: "💧", label: "평균 습도", value: "65%", color: "text-green-600", onClick: null },
        { icon: "⚡", label: "활성 기기", value: "0대", color: "text-green-600", onClick: null },
        { icon: "🔔", label: "미확인 알림", value: `${unreadCount}건`, color: "text-green-600", onClick: () => navigate("/notifications") },
    ];

    return (
        <div className="flex gap-6">
            {/* 왼쪽 사이드바 */}
            <div className="w-64 flex-shrink-0 flex flex-col gap-4">
                {/* 바로가기 */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="text-sm font-semibold text-gray-700 mb-3">바로가기</div>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => navigate("/diary")}
                            className="flex flex-col items-center gap-1 p-3 rounded-lg bg-green-50 hover:bg-green-100 transition-colors">
                            <span className="text-xl">📔</span>
                            <span className="text-xs text-gray-600">다이어리</span>
                        </button>
                        <button
                            onClick={() => navigate("/mypage")}
                            className="flex flex-col items-center gap-1 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                            <span className="text-xl">🤍</span>
                            <span className="text-xs text-gray-600">마이페이지</span>
                        </button>
                    </div>
                </div>

                {/* 전체 환경 요약 */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="text-sm font-semibold text-gray-700 mb-3">전체 환경 요약</div>
                    <div className="flex flex-col gap-2 text-sm">
                        {summaryItems.map(({ icon, label, value, color, onClick }) => (
                            <div
                                key={label}
                                onClick={onClick}
                                className={`flex justify-between items-center py-1 border-b border-gray-50 last:border-0 ${onClick ? "cursor-pointer hover:bg-gray-50 rounded px-1 -mx-1 transition-colors" : ""}`}
                            >
                                <span className="text-gray-500">{icon} {label}</span>
                                <span className={`font-semibold ${color}`}>{value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 메인 콘텐츠 */}
            <div className="flex-grow">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-gray-800">My Farm</h2>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                        + 기기 추가
                    </button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {devices.map(device => (
                        <DeviceCard key={device.id} device={device} />
                    ))}
                </div>
            </div>

            {/* 기기 추가 모달 */}
            {showAddModal && (
                <AddDeviceModal
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => setShowAddModal(false)}
                />
            )}
        </div>
    );
}

export default HomePage;