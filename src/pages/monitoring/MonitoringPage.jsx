import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";
import { getUserDevicesApi, updateLedApi, updatePhotoIntervalApi } from "../../api/deviceApi";
import { getAllNoticesApi } from "../../api/noticeApi";
import { getSseStreamUrl } from "../../api/sensorApi";
import { API_BASE } from "../../api/config";
import { getLatestHarvestPredictionApi } from "../../api/predictionApi";
import HarvestReadout from "../../components/HarvestReadout";
import MonitoringView from "../../components/monitoring/MonitoringView";
import { isLettucePlant } from "../../utils/harvestPrediction";
import { getGrowthTrendApi } from "../../api/photoApi";
import {
    finishMonitoringPerformanceRun,
    getActiveMonitoringPerformanceRun,
    markMonitoringPerformance,
    measureMonitoringApi,
} from "../../utils/monitoringPerformance";
import { resolveRanges, scoreSensor } from "../../utils/sensorRange";
import { deviceSensorRanges, sharedSensorStatus } from "../../utils/sharedEnvironment";
import { prepareGrowthTrend, growthComparison, describeSizeChange, describeComparison, currentSizeRatio, growthTrendPath, SAME_SIZE_BAND_PERCENT } from "../../utils/growthEvidence";
import { withoutGrowthSection } from "../../utils/aiAdvice";
import { PORT_HEALTH_STYLES } from "../../utils/monitoringStatus";
import { deviceSettingsError, deviceSettingsSuccess } from "../../utils/deviceSettings";
import { isPortPreviewEnabled, previewAdvice } from "../../dev/portPreview";

const SPECIES_EMOJI = {
    "방울토마토": "🍅", "청상추": "🥬", "적상추": "🥬",
    "바질": "🌿", "딸기": "🍓", "파프리카": "🌶️",
    "브로콜리": "🥦", "고추": "🌶️", "블루베리": "🫐",
    "페퍼민트": "🌿", "청경채": "🥬", "테이블야자": "🌴",
    "산세베리아 스투키": "🪴",
};

const getSensorKey = (serial) => `growlab_sensor_${serial}`;
const getNoticeKey = (serial) => `growlab_notices_${serial}`;
const adviceRequests = new Map();

// ── AI 조언 API 호출 ──────────────────────────────────────────
const fetchAiData = async (serialNumber) => {
    if (isPortPreviewEnabled()) return "재배 조언 예시\n온도·습도·pH·TDS·수위를 기기 전체 기준으로 확인하세요.";
    try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE}/ai/advice`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ serialNumber })
        });
        const data = await response.json();
        return withoutGrowthSection(data.advice) || null;
    } catch {
        return null;
    }
};

// 개발 모드의 effect 재실행도 같은 기기의 진행 중인 GPT 요청 하나를 공유한다.
const loadAiAdvice = (serialNumber) => {
    if (adviceRequests.has(serialNumber)) return adviceRequests.get(serialNumber);
    const request = fetchAiData(serialNumber).finally(() => {
        if (adviceRequests.get(serialNumber) === request) adviceRequests.delete(serialNumber);
    });
    adviceRequests.set(serialNumber, request);
    return request;
};

// ── Vision AI 분석 점수 계산 (센서 데이터 기반) ───────────────
const calcVisionScore = (sensorData, ranges) => {
    const { temperature, humidity, ph, tds, water_level_status } = sensorData;
    const activeRanges = ranges || resolveRanges(null);

    const validCount = [
        temperature,
        humidity,
        ph,
        tds,
        water_level_status
    ].filter(v => v !== null).length;

    if (validCount === 0) {
        return {
            score: 0,
            grade: "-",
            growthStatus: "분석 대기",
            diseaseRisk: "-",
            issues: []
        };
    }

    let score = 100;
    const issues = [];

    const applySensorScore = (value, range, label) => {
        if (range[0] === null || range[1] === null) return;
        const { deduct, severity } = scoreSensor(value, range);
        score -= deduct;
        if (severity) issues.push(`${label} ${severity}`);
    };

    applySensorScore(temperature, activeRanges.temp, "온도");
    applySensorScore(humidity, activeRanges.humidity, "습도");
    applySensorScore(ph, activeRanges.ph, "pH");
    applySensorScore(tds, activeRanges.tds, "양액");

    // ===== 수위 =====
    if (water_level_status === false) {
        score -= 15;
        issues.push("수위 부족");
    } else if (water_level_status === null) {
        score -= 3;
    }

    score = Math.max(0, Math.round(score));

    const growthStatus =
        score >= 85 ? "정상" :
        score >= 65 ? "주의" :
        "위험";

    const diseaseRisk =
        issues.some(i => i.includes("위험")) ? "높음" :
        issues.length >= 2 ? "보통" :
        "낮음";

    const grade =
        score >= 95 ? "S" :
        score >= 85 ? "A" :
        score >= 75 ? "B" :
        score >= 65 ? "C" :
        "D";

    return {
        score,
        grade,
        growthStatus,
        diseaseRisk,
        issues,
    };
};

// 기기 공통 센서 점수에 확인된 질병과, 같은 시기 다른 재배와 견준 성장 속도만 반영한다.
// 사진에서 식물을 못 찾았더라도 센서 상태는 별도로 보여준다.
const calcPortHealth = (base, plant, trend) => {
    if (!plant) return { portDataAvailable: false, reason: "no_plant" };
    if (base.grade === "-") return { portDataAvailable: false, reason: "no_sensor" };
    const diseased = isDiseased(plant.diseaseResult);
    const { verdict, behind } = growthComparison(trend);

    let score = base.score;
    const issues = [...(base.issues || [])];
    if (diseased) { score -= 35; issues.unshift(`질병 의심(${plant.diseaseResult})`); }
    // 환경이 좋아도 같은 시기의 다른 재배보다 뚜렷이 느리면 점수에 반영한다.
    if (behind) { score -= 15; issues.unshift("같은 시기의 다른 재배보다 느린 성장"); }
    else if (verdict === "faster") { score += 3; }
    score = Math.max(0, Math.min(100, Math.round(score)));

    const grade = score >= 95 ? "S" : score >= 85 ? "A" : score >= 75 ? "B" : score >= 65 ? "C" : "D";
    let growthStatus = score >= 85 ? "정상" : score >= 65 ? "주의" : "위험";
    if ((diseased || behind) && growthStatus === "정상") growthStatus = "주의";
    const diseaseRisk = diseased ? "높음" : behind ? "보통" : base.diseaseRisk;

    return { portDataAvailable: true, score, grade, growthStatus, diseaseRisk, issues };
};

function EmptyTimeline({ children }) {
    return (
        <div className="min-h-44 rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 flex items-center justify-center px-4 text-center text-body2 text-gray-500">
            {children}
        </div>
    );
}

// ── 확장 기능 공통 헬퍼 ───────────────────────────────────────
// 질병 라벨 판정 (BE isHealthyLabel과 동일: healthy/normal/정상/no_detection은 정상으로 본다)
const HEALTHY_LABELS = new Set(["", "no_detection", "healthy", "normal", "정상"]);
const isDiseased = (label) => {
    if (label == null) return false;
    return !HEALTHY_LABELS.has(String(label).trim().toLowerCase());
};



// 서버가 한 번의 성장 추이 응답으로 계산한 전체 포트의 크기·속도 상태를 표시한다.
const resolvePortHealth = (plant, serverHealth) => {
    if (!plant) return "empty";
    if (isDiseased(plant.diseaseResult)) return "bad";
    return ["good", "warn", "bad", "pending"].includes(serverHealth) ? serverHealth : "pending";
};
// 관측된 생육 단계는 그대로 표시하지만, 날짜 예측은 수확기에만 제공한다.
function HarvestForecastSection({ selectedPlant, prediction }) {
    if (!selectedPlant) return <EmptyTimeline>이 포트에 식물이 없어요</EmptyTimeline>;
    if (!isLettucePlant(selectedPlant)) {
        return (
            <section className="rounded-xl bg-gray-50 p-4" aria-label="수확기 예상">
                <h3 className="text-caption font-bold text-gray-500">수확기 예상</h3>
                <p className="mt-2 text-body2 text-gray-600">이 품종의 수확기 예측 모델은 아직 제공하지 않아요.</p>
            </section>
        );
    }
    return <HarvestReadout plant={selectedPlant} prediction={prediction} />;
}

// 성장 추이 SVG (이 포트의 크기 변화). peerPoints를 주면 점선으로 함께 그리지만, 크기는 포트끼리 견주지 않으므로 지금은 쓰지 않는다.
function GrowthTrendSvg({ points, peerPoints, color }) {
    const vals = (points || []).map(p => p?.value).filter(v => v != null);
    if (!vals.length) {
        return <div className="h-12 flex items-center text-caption text-gray-500">아직 관측 데이터가 없어요</div>;
    }
    const w = 240, h = 48;
    const peerVals = (peerPoints || []).map(p => p?.value).filter(v => v != null);
    const all = vals.concat(peerVals);
    const mx = Math.max(...all), mn = Math.min(...all), r = (mx - mn) || 1;
    const n = points.length;
    const st = n > 1 ? w / (n - 1) : w;
    const Y = v => h - 3 - ((v - mn) / r) * (h - 8);
    const path = arr => growthTrendPath(arr, i => i * st, Y);
    const selfPath = path(points);
    const peerPath = path(peerPoints);
    const areaSegments = [];
    let areaSegment = [];
    const closeAreaSegment = () => {
        if (areaSegment.length > 1) areaSegments.push(areaSegment);
        areaSegment = [];
    };
    points.forEach((point, index) => {
        if (Number.isFinite(point?.value)) areaSegment.push([index * st, Y(point.value)]);
        else closeAreaSegment();
    });
    closeAreaSegment();
    const lastIdx = n - 1;
    const lastV = points[lastIdx]?.value;
    return (
        <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="block">
            <defs><linearGradient id="monitor-growth-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".8" /><stop offset="100%" stopColor={color} stopOpacity=".05" /></linearGradient></defs>
            {areaSegments.map((segment, index) => <path key={index} d={`M${segment.map(([x, y]) => `${x} ${y}`).join(' L')} L${segment.at(-1)[0]} ${h} L${segment[0][0]} ${h} Z`} fill="url(#monitor-growth-fill)" />)}
            {peerPath && <path d={peerPath} fill="none" stroke="#737373" strokeWidth="1.3" strokeDasharray="3 3" opacity="0.7" />}
            <path d={selfPath} fill="none" stroke={color} strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
            {lastV != null && <circle cx={(lastIdx * st).toFixed(1)} cy={Y(lastV).toFixed(1)} r="3"
                fill={points[lastIdx]?.lowerBound ? "none" : color} stroke={color} strokeWidth="1.5" />}
        </svg>
    );
}

// 성장 추이 카드 (이 포트 자신의 크기 변화)
function GrowthTrendCard({ trend, loading, error, color }) {
    const points = trend?.points ?? [];
    return (
        <div className="monitor-chart">
            <h5>성장 추이 관측</h5>
            {loading ? <div className="monitor-empty">불러오는 중...</div>
                : error ? <div className="monitor-empty text-error">관측 데이터를 불러오지 못했어요.</div>
                    : <GrowthTrendSvg points={points} color={color} />}
            <p className="monitor-chart-note" title="크기는 같은 포트의 과거 관측과 비교하고, 성장 속도는 같은 품종·시기의 다른 재배와 비교합니다.">크기는 과거 관측과, 성장 속도는 같은 품종·시기와 비교해요.</p>
        </div>
    );

}


const COMPARISON_COLOR = { faster: "text-brand", similar: "text-gray-700", slower: "text-amber-700" };

// 현재 관측 요약 (크기/질병/이 포트의 과거 대비 크기/같은 시기 다른 재배와의 속도 비교)
function PortObservation({ plant, trend, error }) {
    if (!plant) {
        return <div className="rounded-xl bg-gray-50 p-4 flex items-center justify-center text-caption text-gray-500">데이터 없음</div>;
    }
    const latest = currentSizeRatio(trend);
    const sizeChange = trend?.sizeChange;
    const comparison = trend?.reference;
    const diseased = isDiseased(plant.diseaseResult);
    const items = [
        ["YOLO 검출 면적", error ? "조회 실패" : latest != null
            ? `${trend?.latestLowerBound ? "최소 " : ""}${(latest * 100).toFixed(1)}%` : trend ? "계산 대기" : "관측 없음", "text-gray-700"],
        ["질병 검출 / 이상", diseased ? plant.diseaseResult : "판단 대기", diseased ? "text-red-600" : "text-gray-500"],
        ["과거 재배 크기", describeSizeChange(sizeChange),
            !sizeChange?.ready ? "text-gray-500"
                : sizeChange.changePercent >= -SAME_SIZE_BAND_PERCENT ? "text-brand" : "text-amber-700"],
        ["같은 품종 / 시기 성장 속도", describeComparison(comparison),
            comparison?.ready ? COMPARISON_COLOR[comparison.verdict] : "text-gray-500"],
    ];
    return (
        <div className="monitor-observation">
            {items.map(([k, v, c]) => (
                <div key={k}>
                    <div className="text-caption text-gray-500">{k}</div>
                    <div className={`text-body2 font-bold ${c}`}>{v}</div>
                </div>
            ))}
        </div>
    );
}

// AI 정밀 포트 분석 — '분석 요청' 버튼을 눌러야 이 포트의 센서·성장 데이터를 LLM에 보내고,
// 응답을 받아 표시한다. 처음에는 결과 없이 버튼만 보인다(온디맨드 · 토큰 절약).
function PortProblemBlock({ plant, trend, serialNumber, speciesId, speciesName, daysSincePlanted }) {
    const [llm, setLlm] = useState(null);
    const [llmLoading, setLlmLoading] = useState(false);
    const [llmError, setLlmError] = useState(false);
    if (!plant) return null;

    const runDiagnosis = async () => {
        if (isPortPreviewEnabled()) {
            setLlm(previewAdvice(plant.portIndex, true));
            setLlmError(false);
            return;
        }
        setLlmLoading(true); setLlmError(false);
        try {
            const token = localStorage.getItem("token");
            const currentSize = currentSizeRatio(trend);
            const res = await fetch(`${API_BASE}/ai/port-diagnosis`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    serialNumber,
                    speciesId: speciesId ?? null,
                    speciesName: speciesName ?? null,
                    portIndex: plant.portIndex,
                    daysSincePlanted: daysSincePlanted ?? null,
                    plantStage: plant.stageName ?? null,
                    sizeChangeDays: trend?.sizeChange?.ready ? trend.sizeChange.days : null,
                    sizeChangePercent: trend?.sizeChange?.ready ? Math.round(trend.sizeChange.changePercent) : null,
                    speedVerdict: trend?.reference?.ready ? trend.reference.verdict : null,
                    ownRatePerDay: trend?.reference?.ready && trend.growthRate.ready
                        ? Math.round(trend.growthRate.ratePerDay) : null,
                    referenceRatePerDay: trend?.reference?.ready ? Math.round(trend.reference.ratePerDay) : null,
                    referencePlantCount: trend?.reference?.ready ? trend.reference.plantCount : null,
                    currentSizePercent: currentSize != null
                        ? Math.round(currentSize * 1000) / 10 : null,
                    diseaseResult: plant.diseaseResult ?? null,
                }),
            });
            if (!res.ok) throw new Error();
            const data = await res.json();
            setLlm(data.advice || "분석 결과가 비어 있습니다.");
        } catch {
            setLlmError(true);
        } finally {
            setLlmLoading(false);
        }
    };

    return (
        <div className="monitor-diagnosis-block">
            <h5>AI 정밀 포트 분석</h5>
            <div className="monitor-diagnosis-body" aria-live="polite">
                {llmLoading && <p>AI가 분석 중입니다…</p>}
                {llmError && <p className="text-error">분석을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>}
                {!llm && !llmLoading && !llmError && <p>센서와 등록된 생육 단계를 기준으로 분석합니다.<br />영상 관측은 충분히 쌓였을 때만 참고해요.</p>}
                {llm && <><p>{llm}</p><p className="mt-2 text-caption text-gray-400">생성형 AI 추정 · 확정 진단 아님</p></>}
            </div>
            <button type="button" onClick={runDiagnosis} disabled={llmLoading}>
                {llmLoading ? "분석 중…" : llm ? "다시 분석" : "분석 요청"}
            </button>
        </div>
    );

}

// ── 메인 컴포넌트 ─────────────────────────────────────────────
function MonitoringPage() {
    const { serialNumber } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const targetPortIndex = location.state?.portIndex;
    const activePerfRun = getActiveMonitoringPerformanceRun(location.state?.perfRunId, serialNumber);
    const perfRunId = activePerfRun?.id ?? location.state?.perfRunId ?? null;
    const coreVisibleMarkedRef = useRef(false);
    const firstSensorMarkedRef = useRef(false);
    const performanceFinishedRef = useRef(false);

    const [device, setDevice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [noticesSettled, setNoticesSettled] = useState(false);
    const [predictionSettled, setPredictionSettled] = useState(false);

    const [sensorData, setSensorData] = useState(() => {
        try {
            const saved = sessionStorage.getItem(getSensorKey(serialNumber));
            return saved ? JSON.parse(saved) : {
                temperature: null, humidity: null, ph: null, tds: null, water_level_status: null,
            };
        } catch {
            return { temperature: null, humidity: null, ph: null, tds: null, water_level_status: null };
        }
    });

    const [sseConnected, setSseConnected] = useState(false);
    const sseRef = useRef(null);
    const reconnectTimerRef = useRef(null);

    const [notices, setNotices] = useState(() => {
        try {
            const saved = sessionStorage.getItem(getNoticeKey(serialNumber));
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });
    const [noticeVisibleCount, setNoticeVisibleCount] = useState(10);

    const [selectedPort, setSelectedPort] = useState(0);
    const [prediction, setPrediction] = useState(null);
    const [aiAdvice, setAiAdvice] = useState(null);

    // ── 분리된 로딩 상태 ───────────────────────────────────────
    const [adviceAiLoading, setAdviceAiLoading] = useState(false);

    const PORT_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7];

    const storageKey = `device_settings_${serialNumber}`;
    const getSavedSettings = () => {
        try {
            const saved = localStorage.getItem(storageKey);
            return saved ? JSON.parse(saved) : null;
        } catch { return null; }
    };
    const saved = getSavedSettings();

    const [isLedOn, setIsLedOn] = useState(saved?.isLedOn ?? true);
    const [isLedAuto, setIsLedAuto] = useState(saved?.isLedAuto ?? false);
    const [ledStart, setLedStart] = useState(saved?.ledStart ?? "06:00");
    const [ledEnd, setLedEnd] = useState(saved?.ledEnd ?? "22:00");
    const [captureInterval, setCaptureInterval] = useState(6);
    const [saveMessage, setSaveMessage] = useState("");
    const [ledSaving, setLedSaving] = useState(false);
    const [captureSaving, setCaptureSaving] = useState(false);

    useEffect(() => {
        if (!saveMessage.startsWith("✓") || saveMessage.includes("기기 전송 안 됨")) return;
        const timer = setTimeout(() => setSaveMessage(""), 2000);
        return () => clearTimeout(timer);
    }, [saveMessage]);

    useEffect(() => {
        coreVisibleMarkedRef.current = false;
        firstSensorMarkedRef.current = false;
        performanceFinishedRef.current = false;
        markMonitoringPerformance(perfRunId, "monitoring_route_rendered");
    }, [serialNumber, perfRunId]);

    // ── 포트 관측 새로고침 (성장 추이와 속도 비교를 다시 불러온다) ──
    const [growthTrendRefresh, setGrowthTrendRefresh] = useState(0);
    const handleRefreshObservation = useCallback(() => setGrowthTrendRefresh(count => count + 1), []);

    // ── AI 재배 조언만 새로고침 (조언 텍스트) ────────────────────
    const handleRefreshAdvice = useCallback(async (deviceData) => {
        if (!deviceData) return;
        setAdviceAiLoading(true);
        const advice = await fetchAiData(deviceData.serialNumber);
        setAiAdvice(advice);
        setAdviceAiLoading(false);
    }, []);

    // ── 1. 디바이스 + 부가 데이터 로드
    useEffect(() => {
        const loadNotices = async () => {
            try {
                const noticeRes = await measureMonitoringApi(
                    perfRunId,
                    "notices",
                    getAllNoticesApi
                );
                const filtered = noticeRes.data.filter(
                    n => n.deviceSerial === serialNumber
                );
                setNotices(filtered);
                sessionStorage.setItem(
                    getNoticeKey(serialNumber),
                    JSON.stringify(filtered)
                );
                markMonitoringPerformance(perfRunId, "notices_settled", {
                    totalCount: noticeRes.data.length,
                    filteredCount: filtered.length,
                });
            } catch (e) {
                console.error("[Initial notices]", e);
            } finally {
                setNoticesSettled(true);
            }
        };

        const fetchData = async () => {
            setLoading(true);
            setNoticesSettled(false);
            setPredictionSettled(false);

            try {
                const res = await measureMonitoringApi(
                    perfRunId,
                    "devices",
                    getUserDevicesApi
                );
                const found = res.data.find(d => d.serialNumber === serialNumber);
                setDevice(found);
                markMonitoringPerformance(perfRunId, "device_data_ready", {
                    deviceFound: Boolean(found),
                    deviceCount: res.data.length,
                });

                if (found) {
                    setIsLedOn(found.ledStatus ?? true);
                    setIsLedAuto(found.ledMode ?? false);
                    setLedStart(found.ledOnTime ?? "06:00");
                    setLedEnd(found.ledOffTime ?? "22:00");
                    setCaptureInterval(found.photoInterval >= 1 && found.photoInterval <= 6
                        ? found.photoInterval : 6);
                    const targetPort = targetPortIndex;
                    if (targetPort !== null && targetPort !== undefined) {
                        setSelectedPort(targetPort);
                    } else if (found.plants?.length > 0) {
                        const portStatus = found.portStatus || "00000000";
                        const onPortWithPlant = found.plants.find(p => portStatus[p.portIndex] === "1");
                        if (onPortWithPlant) setSelectedPort(onPortWithPlant.portIndex);
                        else {
                            const firstPlant = found.plants.reduce((a, b) => a.portIndex < b.portIndex ? a : b);
                            setSelectedPort(firstPlant.portIndex);
                        }
                    }
                }

                // 기기 데이터가 준비되는 즉시 핵심 화면을 먼저 표시한다.
                setLoading(false);

                // AI 조언과 알림은 서로 기다리지 않고 독립적으로 불러온다.
                loadNotices();
            } catch (e) {
                console.error("[Initial device]", e);
                setLoading(false);
                setNoticesSettled(true);
            }
        };
        fetchData();
    }, [serialNumber, perfRunId, targetPortIndex]);

    // 기기 공통 조언은 기기가 바뀔 때만 불러온다. 포트 선택과 센서 폴링은 재생성을 일으키지 않는다.
    const adviceSerial = device?.serialNumber;
    useEffect(() => {
        if (!adviceSerial) return;
        let active = true;
        setAiAdvice(null);
        setAdviceAiLoading(true);
        measureMonitoringApi(perfRunId, "ai_advice", () => loadAiAdvice(adviceSerial))
            .then(advice => {
                if (!active) return;
                setAiAdvice(advice);
                markMonitoringPerformance(perfRunId, "ai_advice_settled", { hasAdvice: Boolean(advice) });
            })
            .catch(error => { if (active) console.error("[AI advice]", error); })
            .finally(() => {
                if (active) setAdviceAiLoading(false);
            });
        return () => { active = false; };
    }, [adviceSerial, perfRunId]);

    // ── 2. 예측 조회
    useEffect(() => {
        let cancelled = false;
        setPrediction(null);
        if (!device) return;
        const plant = device.plants?.find(p => p.portIndex === selectedPort);
        if (!plant || !isLettucePlant(plant)) {
            setPrediction(null);
            setPredictionSettled(true);
            markMonitoringPerformance(perfRunId, "prediction_settled", {
                hasPlant: Boolean(plant), supported: false,
            });
            return;
        }
        setPredictionSettled(false);
        const fetchPrediction = () => measureMonitoringApi(perfRunId, "prediction", () =>
            getLatestHarvestPredictionApi(plant.id))
            .then(res => {
                if (!cancelled) setPrediction(res.data ? { plantId: plant.id, ...res.data } : null);
            })
            .catch(() => {
                if (!cancelled) setPrediction({ plantId: plant.id, status: "LOAD_ERROR" });
            })
            .finally(() => {
                if (cancelled) return;
                setPredictionSettled(true);
                markMonitoringPerformance(perfRunId, "prediction_settled", { hasPlant: true });
            });
        fetchPrediction();
        const predictionTimer = setInterval(fetchPrediction, 60000);
        return () => { cancelled = true; clearInterval(predictionTimer); };
    }, [device, selectedPort, perfRunId]);

    // ── 3. SSE 연결
    const connectSSE = useCallback(() => {
        if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }
        const es = new EventSource(getSseStreamUrl(serialNumber));
        sseRef.current = es;
        es.addEventListener("connect", () => setSseConnected(true));
        es.addEventListener("sensor", (e) => {
            try {
                const data = JSON.parse(e.data);
                if (!firstSensorMarkedRef.current) {
                    firstSensorMarkedRef.current = true;
                    markMonitoringPerformance(perfRunId, "sensor_first_value");
                }
                setSensorData(prev => {
                    const next = {
                        temperature:        data.temperature        ?? prev.temperature,
                        humidity:           data.humidity           ?? prev.humidity,
                        ph:                 data.ph                 ?? prev.ph,
                        tds:                data.tds                ?? prev.tds,
                        water_level_status: data.water_level_status ?? prev.water_level_status,
                    };
                    sessionStorage.setItem(getSensorKey(serialNumber), JSON.stringify(next));
                    return next;
                });
                setSseConnected(true);
            } catch (err) { console.error("[SSE] parse error", err); }
        });
        es.onerror = () => {
            setSseConnected(false);
            es.close();
            sseRef.current = null;
            reconnectTimerRef.current = setTimeout(connectSSE, 5000);
        };
    }, [serialNumber, perfRunId]);

    useEffect(() => {
        connectSSE();
        return () => {
            if (sseRef.current) sseRef.current.close();
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        };
    }, [connectSSE]);

    useEffect(() => {
        if (!loading && device && !coreVisibleMarkedRef.current) {
            coreVisibleMarkedRef.current = true;
            markMonitoringPerformance(perfRunId, "monitoring_core_visible");
        }
    }, [loading, device, perfRunId]);

    useEffect(() => {
        if (
            !loading &&
            device &&
            noticesSettled &&
            predictionSettled &&
            !adviceAiLoading &&
            !performanceFinishedRef.current
        ) {
            performanceFinishedRef.current = true;
            finishMonitoringPerformanceRun(perfRunId, {
                hasDevice: true,
                noticeCount: notices.length,
                hasPrediction: Boolean(prediction),
                hasAiAdvice: Boolean(aiAdvice),
            });
        }
    }, [
        loading,
        device,
        noticesSettled,
        predictionSettled,
        adviceAiLoading,
        notices.length,
        prediction,
        aiAdvice,
        perfRunId,
    ]);

    // ── 4. 알림 폴링
    useEffect(() => {
        const pollNotices = async () => {
            try {
                const res = await getAllNoticesApi();
                const filtered = res.data.filter(n => n.deviceSerial === serialNumber);
                setNotices(prev => {
                    const existingIds = new Set(prev.map(n => n.id));
                    const newOnes = filtered.filter(n => !existingIds.has(n.id));
                    if (newOnes.length === 0) return prev;
                    const merged = [...newOnes, ...prev];
                    sessionStorage.setItem(getNoticeKey(serialNumber), JSON.stringify(merged));
                    return merged;
                });
            } catch (e) { console.error("[Notice poll]", e); }
        };
        const timer = setInterval(pollNotices, 60000);
        return () => clearInterval(timer);
    }, [serialNumber]);

    // ── LED 핸들러
    const handleLedManual = async (on) => {
        const previous = isLedOn;
        setSaveMessage("");
        setIsLedOn(on);
        setLedSaving(true);
        try {
            const response = await updateLedApi(serialNumber, { ledMode: false, ledStatus: on });
            localStorage.setItem(storageKey, JSON.stringify({ ...getSavedSettings(), isLedOn: on, isLedAuto: false }));
            setSaveMessage("✓ " + deviceSettingsSuccess(response, "LED 설정이 저장되었습니다."));
        } catch (error) {
            setIsLedOn(previous);
            setSaveMessage("⚠ " + deviceSettingsError(error, "LED 설정을 저장하지 못했어요."));
        }
        finally { setLedSaving(false); }
    };

    const handleLedModeToggle = (auto) => {
        setIsLedAuto(auto);
        localStorage.setItem(storageKey, JSON.stringify({ ...getSavedSettings(), isLedAuto: auto }));
    };

    const handleLedScheduleSave = async () => {
        setSaveMessage("");
        setLedSaving(true);
        try {
            const response = await updateLedApi(serialNumber, { ledMode: true, ledOnTime: ledStart, ledOffTime: ledEnd });
            localStorage.setItem(storageKey, JSON.stringify({ ...getSavedSettings(), isLedAuto: true, ledStart, ledEnd }));
            setSaveMessage("✓ " + deviceSettingsSuccess(response, "LED 스케줄이 저장되었습니다."));
        } catch (error) {
            setSaveMessage("⚠ " + deviceSettingsError(error, "LED 스케줄을 저장하지 못했어요."));
        } finally { setLedSaving(false); }
    };

    const handleCaptureSave = async () => {
        setSaveMessage("");
        setCaptureSaving(true);
        try {
            const response = await updatePhotoIntervalApi(serialNumber, captureInterval);
            localStorage.setItem(storageKey, JSON.stringify({ ...getSavedSettings(), captureInterval }));
            setSaveMessage("✓ " + deviceSettingsSuccess(response, "촬영 주기가 저장되었습니다."));
        } catch (error) {
            setSaveMessage("⚠ " + deviceSettingsError(error, "촬영 주기를 저장하지 못했어요."));
        } finally { setCaptureSaving(false); }
    };

    const handleResetSettings = async () => {
        if (!window.confirm("설정을 초기화할까요?")) return;
        setSaveMessage("");
        setLedSaving(true);
        setCaptureSaving(true);
        try {
            const ledResponse = await updateLedApi(serialNumber, { ledMode: false, ledStatus: true });
            setIsLedOn(true);
            setIsLedAuto(false);
            const captureResponse = await updatePhotoIntervalApi(serialNumber, 6);
            setCaptureInterval(6);
            setLedStart("06:00");
            setLedEnd("22:00");
            localStorage.removeItem(storageKey);
            const dbOnly = [ledResponse, captureResponse].some(response =>
                deviceSettingsSuccess(response, "").includes("기기 전송 안 됨"));
            setSaveMessage(dbOnly ? "✓ 기기 설정 DB 초기화 완료 · MQTT 꺼짐으로 기기 전송 안 됨" : "✓ 기기 설정이 초기화되었습니다");
        } catch (error) {
            setSaveMessage("⚠ 일부 설정 초기화 실패: " + deviceSettingsError(error, "잠시 후 다시 시도해 주세요."));
        } finally {
            setLedSaving(false);
            setCaptureSaving(false);
        }
    };

    // 선택 포트의 성장 추이(관측 크기) + 같은 시기 다른 재배와의 속도 비교. 성장추이 카드/현재관측/문제분석이 공유.
    const [growthTrend, setGrowthTrend] = useState(null);
    const [portHealthSnapshot, setPortHealthSnapshot] = useState(null);
    const [growthTrendLoading, setGrowthTrendLoading] = useState(false);
    const [growthTrendError, setGrowthTrendError] = useState(false);
    useEffect(() => {
        // 빈 포트를 선택해도 서버의 전체 포트 상태를 받아 색상 점을 표시한다.
        if (!serialNumber || !device) {
            setGrowthTrend(null);
            setGrowthTrendError(false);
            setPortHealthSnapshot(null);
            return;
        }
        let alive = true;
        setGrowthTrend(null);
        setGrowthTrendError(false);
        setGrowthTrendLoading(true);
        getGrowthTrendApi(serialNumber, selectedPort)
            .then(res => {
                if (!alive) return;
                setGrowthTrend(res.data);
                if (Array.isArray(res.data?.ports)) {
                    setPortHealthSnapshot({
                        serialNumber,
                        byIndex: Object.fromEntries(res.data.ports.map(port => [port.portIndex, port.health])),
                    });
                } else {
                    setPortHealthSnapshot(null);
                }
            })
            .catch(() => { if (alive) { setGrowthTrend(null); setPortHealthSnapshot(null); setGrowthTrendError(true); } })
            .finally(() => { if (alive) setGrowthTrendLoading(false); });
        return () => { alive = false; };
    }, [serialNumber, selectedPort, device, growthTrendRefresh]);

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-gray-500 text-body2">로딩 중...</div>
        </div>
    );
    if (!device) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-gray-500 text-body2">기기를 찾을 수 없어요</div>
        </div>
    );

    const { temperature: temp, humidity, ph, tds, water_level_status } = sensorData;
    const waterOk      = water_level_status === true;
    const waterHasData = water_level_status !== null;
    const portStatus = device.portStatus || "00000000";
    const selectedPlant = device.plants?.find(p => p.portIndex === selectedPort) ?? null;
    const ranges = deviceSensorRanges(device.plants || []);
    const tempOk  = sharedSensorStatus(temp, ranges.temp);
    const humidOk = sharedSensorStatus(humidity, ranges.humidity);
    const phOk    = sharedSensorStatus(ph, ranges.ph);
    const tdsOk   = sharedSensorStatus(tds, ranges.tds);

    const selectedSpeciesName = selectedPlant?.species || selectedPlant?.speciesName || null;
    const stageNames = Array.isArray(selectedPlant?.stageNames) && selectedPlant.stageNames.length > 0
        ? selectedPlant.stageNames
        : ["씨앗", "발아", "수확"];
    const emoji = SPECIES_EMOJI[selectedSpeciesName] || "🌱";
    const daysSincePlanted = selectedPlant?.plantedAt
        ? Math.floor((new Date() - new Date(selectedPlant.plantedAt.replace(" ", "T"))) / (1000 * 60 * 60 * 24))
        : null;

    // 센서와 영상 근거를 따로 계산한다. 단일 날짜/두 포트의 비교값은 사용하지 않는다.
    const visionScore = calcVisionScore(sensorData, ranges);
    const evidencedTrend = prepareGrowthTrend(growthTrend?.portIndex === selectedPort ? growthTrend : null);
    const portHealth = calcPortHealth(visionScore, selectedPlant, evidencedTrend);
    const healthByPort = portHealthSnapshot?.serialNumber === serialNumber ? portHealthSnapshot.byIndex : {};
    const selectedHealth = resolvePortHealth(selectedPlant, healthByPort[selectedPort]);
    const selectedHealthColor = PORT_HEALTH_STYLES[selectedHealth][0];

    return <MonitoringView
        device={device} serialNumber={serialNumber} sseConnected={sseConnected}
        connectionText={isPortPreviewEnabled() ? "더미 데이터" : sseConnected ? "실시간 연결" : "재연결 중..."}
        sensor={{ temp, humidity, ph, tds, waterOk, waterHasData, tempOk, humidOk, phOk, tdsOk }}
        led={{ on: isLedOn, auto: isLedAuto, start: ledStart, end: ledEnd, saving: ledSaving,
            onMode: handleLedModeToggle, onStart: setLedStart, onEnd: setLedEnd,
            onManual: handleLedManual, onSchedule: handleLedScheduleSave }}
        capture={{ interval: captureInterval, saving: captureSaving, onInterval: setCaptureInterval, onSave: handleCaptureSave }}
        saveMessage={saveMessage} notices={notices} noticeVisibleCount={noticeVisibleCount}
        onMoreNotices={() => setNoticeVisibleCount(count => count + 10)} onLessNotices={() => setNoticeVisibleCount(10)}
        onBack={() => navigate("/")} onReset={handleResetSettings}
        advice={aiAdvice} adviceLoading={adviceAiLoading} onRefreshAdvice={() => handleRefreshAdvice(device)}
        ports={PORT_OPTIONS.map(index => ({ index, occupied: portStatus[index] === "1" && Boolean(device.plants?.find(plant => plant.portIndex === index)),
            health: resolvePortHealth(device.plants?.find(plant => plant.portIndex === index), healthByPort[index]) }))}
        selectedPort={selectedPort} onSelectPort={setSelectedPort} portStatus={portStatus}
        selectedPlant={selectedPlant} speciesName={selectedSpeciesName} emoji={emoji} stageNames={stageNames} daysSincePlanted={daysSincePlanted}
        environmentStatus={portHealth} growthLoading={growthTrendLoading} onRefreshObservation={handleRefreshObservation}
        forecast={<HarvestForecastSection selectedPlant={selectedPlant} prediction={prediction} />}
        observation={<PortObservation plant={selectedPlant} trend={evidencedTrend} error={growthTrendError} />}
        chart={<GrowthTrendCard trend={evidencedTrend} loading={growthTrendLoading} error={growthTrendError} color={selectedHealthColor} />}
        diagnosis={<PortProblemBlock key={selectedPlant?.id ?? "empty"} plant={selectedPlant} trend={evidencedTrend}
            serialNumber={serialNumber} speciesId={selectedPlant?.speciesId ?? null} speciesName={selectedSpeciesName} daysSincePlanted={daysSincePlanted} />}
    />;

}

export default MonitoringPage;
