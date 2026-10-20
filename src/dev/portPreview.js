import axios from "axios";
import { API_BASE } from "../api/config";

export const PREVIEW_SERIAL = "DEMO-TOWER-001";
// The real backend is the default, including local development.
// Enable dummy data only when explicitly requested in a local Vite environment.
export const canPreviewPorts = import.meta.env.DEV
    && import.meta.env.VITE_ENABLE_PORT_PREVIEW === "true"
    && ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);

export function isPortPreviewEnabled() {
    return canPreviewPorts
        && (window.location.pathname === "/"
            || window.location.pathname === `/monitoring/${PREVIEW_SERIAL}`);
}

const day = 86400000;
const timestamp = (daysAgo = 0) => new Date(Date.now() - daysAgo * day).toISOString();
const examples = [
    { species: "청상추", age: 12, stage: 2, values: [8, 9.4, 11, 13, 15, 17, 20], verdict: "similar", eta: 18 },
    { species: "적상추", age: 22, stage: 2, values: [15, 18, 22, 27, 33, 39, 46], verdict: "faster", eta: 8 },
    { species: "청상추", age: 5, stage: 1, values: [1.8], verdict: null, eta: 28 },
    { species: "바질", age: 18, stage: 2, values: [10, 11, 13, 14, 16, 18, 21], verdict: "similar", eta: 12 },
    { species: "청상추", age: 14, stage: 2, values: [14, 14.2, 14, 13.5, 13, 12, 11], verdict: "slower", eta: 24 },
    { species: "적상추", age: 20, stage: 2, values: [26, 25, 23, 21, 18, 16, 14], verdict: "slower", disease: "잎마름 의심(더미)", eta: 20 },
    { species: "청상추", age: 35, stage: 3, values: [40, 44, 48, 52, 56, 61, 65], verdict: "similar", eta: 0 },
    { species: "청상추", age: 1, stage: 0, values: [], verdict: null, off: true, eta: 35 },
];

export const previewSensor = {
    temperature: 24.5, humidity: 65, ph: 6.2, tds: 750, water_level_status: true,
};

const stageNames = ["씨앗", "발아", "생장", "수확"];
const previewDevice = {
    id: 99000, serialNumber: PREVIEW_SERIAL, deviceNickname: "우리집 타워 (더미)",
    createdAt: timestamp(35), portStatus: "11111110", ledStatus: true, ledMode: true,
    ledOnTime: "06:00", ledOffTime: "22:00", photoInterval: 6,
    ...previewSensor,
    plants: examples.map((example, portIndex) => ({
        id: 99001 + portIndex, portIndex, name: `P${portIndex + 1} 미리보기`,
        species: example.species, speciesName: example.species,
        speciesId: example.species === "바질" ? 99003 : example.species === "적상추" ? 99002 : 99001,
        plantedAt: timestamp(example.age), stageNames, stageIndex: example.stage,
        stageName: stageNames[example.stage], diseaseResult: example.disease ?? "healthy",
        minTemperature: 18, maxTemperature: 28, minHumidity: 50, maxHumidity: 80,
        minPh: 5.5, maxPh: 7, minTds: 200, maxTds: 800,
    })),
};

export function previewGrowthTrend(portIndex) {
    const example = examples[portIndex];
    if (!example) throw new Error("미리보기 포트가 없습니다.");
    const values = example.values;
    const first = values[0];
    const last = values.at(-1);
    const ready = values.length >= 3;
    const rate = ready ? (Math.pow(last / first, 1 / (values.length - 1)) - 1) * 100 : null;
    return {
        portIndex, latestRatio: last == null ? null : last / 100,
        points: values.map((value, index) => ({
            elapsedDay: example.age - values.length + 1 + index,
            date: timestamp(values.length - 1 - index).slice(0, 10), value,
        })),
        sizeChange: ready
            ? { ready: true, days: values.length - 1, changePercent: (last / first - 1) * 100 }
            : { ready: false },
        growthRate: { status: ready ? rate < -1 ? "down" : rate > 1 ? "growing" : "flat" : "pending", ratePerDay: rate, observationDays: values.length, spanDays: values.length - 1 },
        reference: { ready: ready && Boolean(example.verdict), verdict: example.verdict, ratePerDay: 12, plantCount: 6 },
        portCount: ready ? 6 : null, rank: ready ? example.verdict === "faster" ? 1 : example.verdict === "slower" ? 6 : 3 : null,
        gapPercent: ready ? example.verdict === "slower" ? -28 : example.verdict === "faster" ? 24 : 2 : null,
        peerPoints: [], viewChangedDay: null,
    };
}

export function previewAdvice(portIndex, diagnosis = false) {
    const example = examples[portIndex] ?? examples[0];
    const observation = example.off ? "포트가 OFF인 예시입니다. 관측을 기다리고 있어요."
        : example.values.length < 2 ? "발아 초기로, 성장 비교에 필요한 사진을 모으는 예시입니다."
        : example.disease ? "잎마름 의심과 크기 감소가 표시되는 예시입니다. 잎과 뿌리 상태를 확인하는 화면을 보여줍니다."
        : example.verdict === "slower" ? "최근 관측 크기가 줄고 성장 속도가 느린 예시입니다. 뿌리 상태와 물 공급을 확인하는 화면을 보여줍니다."
        : example.stage === 3 ? "수확기에 도달한 예시입니다. 수확할 잎의 상태를 확인해 주세요."
        : "성장 중인 예시입니다. 일정한 조명과 양액 관리를 유지해 주세요.";
    return `${diagnosis ? `P${portIndex + 1} 분석 예시` : "재배 조언 예시"}\n${observation}\n화면 확인용 더미 데이터이며 실제 AI 진단 결과가 아닙니다.`;
}

function previewResponse(config) {
    const url = new URL(config.url, API_BASE);
    const path = url.pathname.slice(new URL(API_BASE).pathname.length);
    const method = (config.method ?? "get").toLowerCase();
    let data;
    if (method !== "get") {
        throw new axios.AxiosError("더미 미리보기에서는 실제 기기를 변경할 수 없어요.", "ERR_PREVIEW_READONLY", config);
    }
    if (path === "/devices") data = previewDevice ? [previewDevice] : [];
    else if (path === `/sensor_logs/latest/${PREVIEW_SERIAL}`) data = previewSensor;
    else if (path === "/photos/growth-trend") data = previewGrowthTrend(Number(config.params?.portIndex));
    else if (/^\/harvest-predictions\/\d+$/.test(path)) {
        const portIndex = Number(path.split("/").at(-1)) - 99001;
        const example = examples[portIndex];
        if (!example) throw new Error("미리보기 식물이 없습니다.");
        data = {
            plantId: 99001 + portIndex,
            status: example.off ? "PORT_OFF" : example.values.length < 2 ? "WAITING_ANCHOR" : example.stage === 3 ? "HARVEST_READY" : "PREDICTED",
            expectedAt: timestamp(-example.eta), capturedAt: timestamp(),
        };
    } else if (path === "/notices/unread/count") data = 0;
    else if (path === "/notices" || path === "/notices/unread") data = [];
    else throw new axios.AxiosError("이 메뉴는 실제 데이터 보기에서 이용해 주세요.", "ERR_PREVIEW_READONLY", config);
    return { data: structuredClone(data), status: 200, statusText: "OK", headers: {}, config };
}

// Only the local development preview intercepts API calls. No fake login or server writes.
export function installPortPreview() {
    if (!canPreviewPorts) return () => {};
    if (isPortPreviewEnabled()) {
        sessionStorage.setItem(`growlab_sensor_${PREVIEW_SERIAL}`, JSON.stringify(previewSensor));
    }
    const interceptor = axios.interceptors.request.use(config => {
        if (!isPortPreviewEnabled()) return config;
        const url = new URL(config.url, API_BASE);
        const base = new URL(API_BASE);
        if (url.origin === base.origin && url.pathname.startsWith(`${base.pathname}/`)) {
            config.adapter = async request => previewResponse(request);
        }
        return config;
    });
    return () => axios.interceptors.request.eject(interceptor);
}
