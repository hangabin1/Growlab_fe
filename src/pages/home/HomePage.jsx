import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getUnreadCountApi } from "../../api/noticeApi";
import { getUserDevicesApi, deleteDeviceApi, updatePortStatusApi } from "../../api/deviceApi";
import { finishPlantApi } from "../../api/plantApi";
import AddDeviceModal from "../../components/device/AddDeviceModal";
import SelectPlantModal from "../../components/device/SelectPlantModal";
import { startMonitoringPerformanceRun } from "../../utils/monitoringPerformance";
import { deviceSensorRanges, sharedSensorStatus } from "../../utils/sharedEnvironment";

const ICONS = ["🍓", "🌿", "🌱", "🌻", "🍅", "🥬", "🌶️", "🌸"];

const SPECIES_EMOJI = {
    "방울토마토": "🍅", "청상추": "🥬", "적상추": "🥬",
    "바질": "🌿", "딸기": "🍓", "파프리카": "🌶️",
    "브로콜리": "🥦", "고추": "🌶️", "블루베리": "🫐",
    "페퍼민트": "🌿", "청경채": "🥬", "테이블야자": "🌴",
    "산세베리아 스투키": "🪴",
};

const SORT_OPTIONS = [
    { key: "name",   label: "이름순" },
    { key: "newest", label: "최신순" },
    { key: "oldest", label: "오래된순" },
];

// ✅ sessionStorage에서 실시간 센서값 읽기
const getSensorData = (serialNumber) => {
    try {
        const saved = sessionStorage.getItem(`growlab_sensor_${serialNumber}`);
        return saved ? JSON.parse(saved) : null;
    } catch { return null; }
};

const formatSensor = (value, unit) => {
    if (value === null || value === undefined) return "-";
    return `${value}${unit}`;
};

function DeviceCard({ device, onDelete, onPortClick, onOpenMonitoring }) {
    const savedIconIndex = localStorage.getItem(`device_icon_${device.serialNumber}`);
    const emoji = (savedIconIndex !== null && savedIconIndex !== undefined)
        ? (ICONS[parseInt(savedIconIndex)] || "🌱")
        : "🌱";

    const portStatus = device.portStatus || "00000000";

    const plants = device.plants || [];
    const speciesNames = [...new Set(plants.map(plant => plant.species || plant.speciesName).filter(Boolean))];

    const [sensor, setSensor] = useState(() => getSensorData(device.serialNumber));

    useEffect(() => {
        const timer = setInterval(() => {
            setSensor(getSensorData(device.serialNumber));
        }, 30000);
        return () => clearInterval(timer);
    }, [device.serialNumber]);

    const temp     = sensor?.temperature        ?? null;
    const humidity = sensor?.humidity           ?? null;
    const ph       = sensor?.ph                 ?? null;
    const tds      = sensor?.tds                ?? null;
    const waterOk  = sensor?.water_level_status ?? null;

    return (
        <div
            onClick={() => onOpenMonitoring(device.serialNumber, null)}
            className="bg-white rounded-xl border border-gray-200 p-4 relative cursor-pointer hover:shadow-md transition"
        >
            <button
                onClick={(e) => { e.stopPropagation(); onDelete(device.serialNumber); }}
                className="absolute top-3 right-3 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-600 transition-colors z-10"
            >✕</button>

            <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{emoji}</span>
                <div>
                    <div className="font-semibold text-gray-800 text-sm">{device.deviceNickname}</div>
                    <div className="text-xs text-gray-400">{device.serialNumber}</div>

                    <div className="mt-1 text-caption text-gray-600">
                        {plants.length > 0
                            ? "재배 중 " + plants.length + "/8 포트 · " + speciesNames.join(" · ")
                            : "빈 포트를 눌러 식물을 추가하세요"}
                    </div>
                </div>
            </div>

            {/* 포트 박스 그리드 */}
            <div className="grid grid-cols-4 gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100 mb-4">
                {[...Array(8)].map((_, index) => {
                    const portPlant = plants.find(plant => plant.portIndex === index);
                    const isOccupied = Boolean(portPlant);
                    const isOn = portStatus[index] === "1";
                    const portSpecies = portPlant?.species || portPlant?.speciesName;
                    return (
                        <div
                            key={index}
                            onClick={(e) => {
                                e.stopPropagation();
                                onPortClick(device, index, isOccupied);
                            }}
                            className={`flex flex-col items-center justify-center h-16 rounded-md transition-all border cursor-pointer select-none ${
                                isOccupied
                                    ? "bg-brand-cream border-brand-olive shadow-sm hover:bg-brand-cream"
                                    : "bg-gray-100 border-gray-200 opacity-60 hover:opacity-100 hover:border-brand-olive/40"
                            }`}
                        >
                            <span className={`text-caption font-bold ${isOccupied ? "text-brand" : "text-gray-500"}`}>
                                P{index + 1}
                            </span>
                            {isOccupied ? (
                                <>
                                    <span className="text-sub1" aria-hidden="true">{SPECIES_EMOJI[portSpecies] || "🌱"}</span>
                                    <span className="max-w-full truncate px-1 text-caption text-brand" title={portSpecies || portPlant.name}>
                                        {portSpecies || portPlant.name}{isOn ? "" : " · OFF"}
                                    </span>
                                </>
                            ) : (
                                <span className="text-caption font-medium text-gray-500">+ 추가</span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* 센서 수치 */}
            <div className="grid grid-cols-3 gap-2 text-center">
                {(() => {
                    const ranges = deviceSensorRanges(plants);
                    const allInRange = (value, key) => sharedSensorStatus(value, ranges[key]);
                    const tempOk  = allInRange(temp, "temp");
                    const humidOk = allInRange(humidity, "humidity");
                    const phOk    = allInRange(ph, "ph");
                    const tdsOk   = allInRange(tds, "tds");

                    const getColor = (hasData, isOk) => !hasData || !plants.length || isOk === null ? "text-gray-500" : isOk ? "text-brand" : "text-amber-700";
                    const getBg    = (hasData, isOk) => !hasData || !plants.length || isOk === null ? "bg-gray-50" : isOk ? "bg-brand-cream" : "bg-amber-50";

                    return [
                        { label: "온도", value: formatSensor(temp, "°C"),                           color: getColor(temp     !== null, tempOk),  bg: getBg(temp     !== null, tempOk)  },
                        { label: "습도", value: formatSensor(humidity, "%"),                         color: getColor(humidity !== null, humidOk), bg: getBg(humidity !== null, humidOk) },
                        { label: "pH",   value: formatSensor(ph, ""),                               color: getColor(ph       !== null, phOk),    bg: getBg(ph       !== null, phOk)    },
                        { label: "TDS",  value: tds !== null ? `${Math.round(tds)}ppm` : "-",       color: getColor(tds      !== null, tdsOk),   bg: getBg(tds      !== null, tdsOk)   },
                        {
                            label: "수위",
                            value: waterOk === null ? "-" : waterOk ? "정상" : "부족",
                            color: waterOk === null ? "text-gray-300" : waterOk ? "text-blue-500" : "text-red-400",
                            bg:    waterOk === null ? "bg-gray-50"    : waterOk ? "bg-blue-50"   : "bg-red-50",
                        },
                        {
                            label: "LED",
                            value: device.ledStatus ? "ON" : "OFF",
                            color: device.ledStatus ? "text-yellow-500" : "text-gray-400",
                            bg:    "bg-gray-50",
                        },
                    ];
                })().map(({ label, value, color, bg }) => (
                    <div key={label} className={`${bg} rounded-lg py-2`}>
                        <div className="text-xs text-gray-400">{label}</div>
                        <div className={`text-sm font-semibold ${color}`}>{value}</div>
                    </div>
                ))}
            </div>
            {plants.length > 1 && (
                <p className="mt-2 text-caption text-gray-500">센서값은 기기 공통이며, 표시 색은 심은 모든 품종의 적정 범위를 기준으로 합니다.</p>
            )}
        </div>
    );
}

function HomePage() {
    const [devices, setDevices]       = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showAddModal, setShowAddModal] = useState(false);
    const [sortKey, setSortKey]       = useState("name");
    const [selectingPlant, setSelectingPlant] = useState(null);
    const [endingPlant, setEndingPlant] = useState(null);
    const [endingLoading, setEndingLoading] = useState(false);

    const navigate = useNavigate();

    const fetchDevices = async () => {
        try {
            const res = await getUserDevicesApi();
            setDevices(res.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;
        getUserDevicesApi()
            .then(res => setDevices(res.data))
            .catch(err => console.error(err));
        getUnreadCountApi()
            .then(res => setUnreadCount(res.data))
            .catch(err => console.error(err));
    }, []);

    const getSortedDevices = () => {
        const copy = [...devices];
        if (sortKey === "name")   return copy.sort((a, b) => a.deviceNickname.localeCompare(b.deviceNickname, "ko"));
        if (sortKey === "newest") return copy.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        if (sortKey === "oldest") return copy.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        return copy;
    };

    const getAverage = (deviceList, key) => {
        if (!deviceList || deviceList.length === 0) return "-";
        const values = deviceList
            .map(d => getSensorData(d.serialNumber)?.[key])
            .filter(v => v !== null && v !== undefined);
        if (values.length === 0) return "-";
        return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
    };

    const handleDelete = async (serialNumber) => {
        const device = devices.find(d => d.serialNumber === serialNumber);
        if (device?.plants?.length > 0) {
            alert("기기에 등록된 식물이 있어요.\n각 포트를 OFF하여 식물을 먼저 해제한 후 삭제해주세요.");
            return;
        }
        if (!window.confirm("기기를 삭제할까요?")) return;
        try {
            await deleteDeviceApi(serialNumber);
            // ✅ device_species는 이제 localStorage에 없지만, 아이콘/설정은 여전히 로컬 보관
            localStorage.removeItem(`device_icon_${serialNumber}`);
            localStorage.removeItem(`device_settings_${serialNumber}`);
            setDevices(prev => prev.filter(d => d.serialNumber !== serialNumber));
        } catch (err) {
            console.error(err);
            alert("기기 삭제에 실패했습니다.");
        }
    };

    const handlePortClick = async (device, portIndex, isOccupied) => {
        if (isOccupied) {
            const portPlant = device.plants?.find(p => p.portIndex === portIndex);
            if (portPlant) {
                setEndingPlant({ plant: portPlant, portIndex });
                return;
            }
            try {
                await updatePortStatusApi(device.serialNumber, portIndex, false);
                await fetchDevices();
            } catch (err) {
                console.error(err);
                alert("포트 제어에 실패했습니다.");
            }
        } else {
            setSelectingPlant({ serialNumber: device.serialNumber, portIndex });
        }
    };

    const handleFinishPlant = async (reason) => {
        if (!endingPlant || endingLoading) return;
        setEndingLoading(true);
        try {
            await finishPlantApi(endingPlant.plant.id, reason);
            setEndingPlant(null);
            await fetchDevices();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || err.response?.data || "재배 종료에 실패했습니다.");
        } finally {
            setEndingLoading(false);
        }
    };

    const handleOpenMonitoring = (serial, portIndex) => {
        const perfRunId = startMonitoringPerformanceRun(serial);
        navigate(`/monitoring/${serial}`, {
            state: {
                ...(portIndex !== null && portIndex !== undefined ? { portIndex } : {}),
                perfRunId,
            }
        });
    };

    const avgTemp     = getAverage(devices, "temperature");
    const avgHumidity = getAverage(devices, "humidity");

    const summaryItems = [
        { icon: "🌡", label: "평균 온도",   value: avgTemp     === "-" ? "-" : `${avgTemp}°C`,    color: "text-green-600" },
        { icon: "💧", label: "평균 습도",   value: avgHumidity === "-" ? "-" : `${avgHumidity}%`, color: "text-green-600" },
        { icon: "⚡", label: "활성 기기",   value: `${devices.length}대`,                         color: "text-green-600" },
        { icon: "🔔", label: "미확인 알림", value: `${unreadCount}건`,                            color: "text-green-600", onClick: () => navigate("/notifications") },
    ];

    const sortedDevices = getSortedDevices();

    return (
        <div className="flex flex-col lg:flex-row gap-6">
            <div className="w-full lg:w-64 lg:flex-shrink-0 flex flex-col gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="text-sm font-semibold text-gray-700 mb-3">바로가기</div>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => navigate("/diary")}
                            className="flex flex-col items-center gap-1 p-3 rounded-lg bg-green-50 hover:bg-green-100 transition-colors">
                            <span className="text-xl">📔</span>
                            <span className="text-xs text-gray-600">다이어리</span>
                        </button>
                        <button onClick={() => navigate("/mypage")}
                            className="flex flex-col items-center gap-1 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                            <span className="text-xl">🤍</span>
                            <span className="text-xs text-gray-600">마이페이지</span>
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="text-sm font-semibold text-gray-700 mb-3">전체 환경 요약</div>
                    <div className="flex flex-col gap-2 text-sm">
                        {summaryItems.map(({ icon, label, value, color, onClick }) => (
                            <div key={label} onClick={onClick}
                                className={`flex justify-between items-center py-1 border-b border-gray-50 last:border-0 ${onClick ? "cursor-pointer hover:bg-gray-50 rounded px-1 -mx-1 transition-colors" : ""}`}>
                                <span className="text-gray-500">{icon} {label}</span>
                                <span className={`font-semibold ${color}`}>{value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-grow min-w-0">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg font-bold text-gray-800">My Farm</h2>
                        <div className="flex gap-1">
                            {SORT_OPTIONS.map(({ key, label }) => (
                                <button key={key} onClick={() => setSortKey(key)}
                                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                                        sortKey === key
                                            ? "bg-green-600 text-white"
                                            : "bg-white border border-gray-200 text-gray-500 hover:border-green-400 hover:text-green-600"
                                    }`}>{label}</button>
                            ))}
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            const token = localStorage.getItem("token");
                            if (!token) { navigate("/login"); return; }
                            setShowAddModal(true);
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                        + 기기 추가
                    </button>
                </div>

                {sortedDevices.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
                        <div className="text-4xl mb-3">🌱</div>
                        <p className="text-gray-400 text-sm">등록된 기기가 없어요</p>
                        <button
                            onClick={() => {
                                const token = localStorage.getItem("token");
                                if (!token) { navigate("/login"); return; }
                                setShowAddModal(true);
                            }}
                            className="mt-4 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                            + 기기 추가하기
                        </button>
                    </div>
                ) : (
                    <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 ${sortedDevices.length > 4 ? "max-h-[900px] overflow-y-auto pr-1" : ""}`}>
                        {sortedDevices.map(device => (
                            <DeviceCard
                                key={device.serialNumber}
                                device={device}
                                onDelete={handleDelete}
                                onPortClick={handlePortClick}
                                onOpenMonitoring={handleOpenMonitoring}
                            />
                        ))}
                    </div>
                )}
            </div>

            {showAddModal && (
                <AddDeviceModal
                    onClose={() => setShowAddModal(false)}
                    onSuccess={fetchDevices}
                />
            )}

            {selectingPlant && (
                <SelectPlantModal
                    serialNumber={selectingPlant.serialNumber}
                    portIndex={selectingPlant.portIndex}
                    existingPlants={devices.find(device => device.serialNumber === selectingPlant.serialNumber)?.plants || []}
                    onClose={() => setSelectingPlant(null)}
                    onSuccess={fetchDevices}
                />
            )}
            {endingPlant && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
                        <h2 className="text-base font-bold text-gray-800">P{endingPlant.portIndex + 1} 재배 종료</h2>
                        <p className="mt-2 text-sm text-gray-600">{endingPlant.plant.name} 재배를 어떻게 마쳤나요? 기록과 일지는 보존됩니다.</p>
                        <div className="mt-5 flex flex-col gap-2">
                            <button disabled={endingLoading} onClick={() => handleFinishPlant("HARVESTED")}
                                className="rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">수확했어요</button>
                            <button disabled={endingLoading} onClick={() => handleFinishPlant("DIED")}
                                className="rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">병들거나 시들어 죽었어요</button>
                            <button disabled={endingLoading} onClick={() => setEndingPlant(null)}
                                className="px-4 py-2 text-sm text-gray-500 disabled:opacity-50">취소</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default HomePage;
