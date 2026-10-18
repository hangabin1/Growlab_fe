import { harvestView } from "../utils/harvestPrediction";

const date = (value) => new Date(value).toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
const messages = {
    WAITING_OBSERVATION: "첫 촬영 기록을 기다리고 있어요.",
    WAITING_ANCHOR: "사진을 모아 예측 시작 단계를 확인하고 있어요.",
    NO_DETECTION: "최근 사진에서 식물을 확인하지 못했어요. 카메라 위치를 확인해 주세요.",
    PORT_OFF: "이 포트는 꺼져 있어요. 다시 켜면 관측을 이어갑니다.",
    UNSUPPORTED_CROP: "이 품종의 수확기 예측은 아직 제공하지 않아요.",
    LOAD_ERROR: "예측 결과를 불러오지 못했어요. 잠시 후 다시 확인해 주세요.",
};

export default function HarvestReadout({ plant, prediction }) {
    const value = harvestView(plant, prediction);
    return (
        <section className="rounded-xl bg-gray-50 p-4" aria-label="AI 수확기 예상">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-caption font-bold text-gray-500">수확기 예상</h3>
                <span className="text-caption text-brand rounded-full bg-brand-cream px-2 py-1">영상 기반 AI</span>
            </div>
            {value.status === "HARVEST_READY" ? (
                <>
                    <p className="text-h4 font-bold text-brand">수확기 도달 확인</p>
                    <p className="text-caption text-gray-500 mt-1">누적 촬영에서 수확기 모습이 확인됐어요.</p>
                </>
            ) : value.status === "PREDICTED" ? (
                <>
                    <p className="text-h2 font-bold text-gray-800">{date(value.expectedAt)}</p>
                    <p className="text-body2 text-gray-600">{value.overdue ? "예상일이 지났어요. 다음 촬영으로 상태를 확인해 주세요." : value.days === 0 ? "오늘 수확기 도달 예상" : `약 ${value.days}일 후 수확기 도달 예상`}</p>
                    {value.stale && <p className="text-caption text-amber-700 mt-2">최근 촬영이 지연되어 이전 예측을 표시하고 있어요.</p>}
                    <p className="text-caption text-gray-500 mt-2">사진 속 발육 상태와 성장 이력으로 계산한 예상일이에요. 실제 수확 여부는 식물 상태를 확인해 결정해 주세요.</p>
                </>
            ) : <p className="text-body2 text-gray-600 py-2">{messages[value.status] || messages.WAITING_OBSERVATION}</p>}
            {value.capturedAt && <p className="mt-2 text-caption text-gray-400">기준 촬영: {new Date(value.capturedAt).toLocaleString("ko-KR")}</p>}
        </section>
    );
}
