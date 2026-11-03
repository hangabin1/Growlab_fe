import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DEVICE_ICONS } from "../../assets/deviceIcons";
import backIcon from "../../assets/icon-back.svg";
import closeIcon from "../../assets/icons/close.svg";
import { PORT_HEALTH_STYLES as HEALTH } from "../../utils/monitoringStatus";
import "./MonitoringView.css";

const PLANT_ICONS = { 상추: 5, 청상추: 5, 적상추: 5, 딸기: 0, 바질: 1, 페퍼민트: 1, 토마토: 4, 방울토마토: 4, 고추: 6, 파프리카: 6 };

function RefreshIcon() {
    return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M19 5v5h-5" strokeLinecap="round" strokeLinejoin="round" /><path d="M19 10a7 7 0 1 0 .2 5" strokeLinecap="round" /></svg>;
}
function BellIcon() {
    return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5l-2 3ZM10 20h4M12 2v2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function StateBadge({ children, good = true }) {
    return <span className={`monitor-badge ${good ? "is-good" : "is-bad"}`}>{children}</span>;
}
function NoticeModal({ notices, visibleCount, onMore, onLess, onClose }) {
    const ref = useRef(null);
    useEffect(() => {
        const overflow = document.body.style.overflow;
        const root = document.getElementById("root");
        const inert = root?.inert;
        const focused = document.activeElement;
        document.body.style.overflow = "hidden";
        if (root) root.inert = true;
        ref.current?.querySelector("button")?.focus();
        return () => {
            document.body.style.overflow = overflow;
            if (root) root.inert = inert;
            if (focused instanceof HTMLElement && focused.isConnected) focused.focus();
        };
    }, []);
    const onKeyDown = event => {
        if (event.key === "Escape") { event.stopPropagation(); onClose(); }
        if (event.key !== "Tab") return;
        const buttons = [...ref.current.querySelectorAll("button:not([disabled])")];
        const first = buttons[0], last = buttons.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    return createPortal(<div className="monitor-notice-backdrop">
        <section ref={ref} className="monitor-notice-dialog" role="dialog" aria-modal="true" aria-labelledby="monitor-notice-title" onKeyDown={onKeyDown}>
            <header><h2 id="monitor-notice-title">최근 알림</h2><button type="button" aria-label="최근 알림 닫기" onClick={onClose}><img src={closeIcon} alt="" width="28" height="28" /></button></header>
            <div className="monitor-notice-list">
                {notices.length === 0 ? <p className="monitor-empty">새로운 알림이 없어요</p> : <>
                    <ul>{notices.slice(0, visibleCount).map(notice => <li key={notice.id} className={`monitor-notice-item ${notice.isRead ? "is-read" : ""}`}>
                        <p>{notice.noticeType}</p><p>{notice.message}</p><p>{notice.deviceSerial}</p>
                    </li>)}</ul>
                    {visibleCount < notices.length && <button type="button" className="monitor-more" onClick={onMore}>더보기 ({notices.length - visibleCount}개 남음)</button>}
                    {visibleCount > 10 && <button type="button" className="monitor-more" onClick={onLess}>접기</button>}
                </>}
            </div>
        </section>
    </div>, document.body);
}

export default function MonitoringView({ device, serialNumber, sseConnected, connectionText, sensor, led, capture, saveMessage,
    notices, noticeVisibleCount, onMoreNotices, onLessNotices, onBack, onReset, advice, adviceLoading, onRefreshAdvice,
    ports, selectedPort, onSelectPort, portStatus, selectedPlant, speciesName, emoji, stageNames, daysSincePlanted,
    environmentStatus, growthLoading, onRefreshObservation, forecast, observation, chart, diagnosis }) {
    const [noticesOpen, setNoticesOpen] = useState(false);
    const latest = notices[0];
    const plantIcon = DEVICE_ICONS[PLANT_ICONS[speciesName] ?? 2];
    const sensorClass = value => value === true ? "is-good" : value === false ? "is-bad" : "is-pending";
    return <div className="monitoring">
        <header className="monitoring__heading">
            <button type="button" onClick={onBack} aria-label="홈으로 돌아가기" className="monitor-back"><img src={backIcon} alt="" width="32" height="32" /></button>
            <svg className="monitor-device-icon" width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><rect x="5" y="7" width="30" height="22" rx="1" /><path d="M20 29v5M12 34h16" /></svg>
            <h2>{device.deviceNickname} 모니터링</h2>
            <span className={`monitor-connection ${sseConnected ? "is-good" : "is-pending"}`} role="status"><i />{connectionText}</span>
        </header>

        <div className="monitoring__scroll">
            <button type="button" className={`monitor-banner ${latest ? "" : "is-empty"}`} onClick={() => setNoticesOpen(true)} aria-label="최근 알림 열기">
                <BellIcon /><strong>{latest?.noticeType || "최근 알림"}</strong>
                <span className="monitor-banner-message" title={latest?.message}>{latest?.message || "새로운 알림이 없어요"}</span>
                {latest && <span className="monitor-banner-serial">|&nbsp; {latest.deviceSerial}</span>}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
            </button>

            <section className="monitor-section monitor-common" aria-labelledby="monitor-common-title">
                <h3 id="monitor-common-title">기기 공통 상태</h3>
                <div className="monitor-sensors" title="센서값과 적정 판정은 기기 전체 품종의 공통 범위 기준">
                    <div className={`monitor-sensor ${sensorClass(sensor.tempOk)}`}><h4>온도</h4><p>{sensor.temp != null ? `${sensor.temp} °C` : "-"}</p><span>{sensor.tempOk === true ? "안전" : sensor.tempOk === false ? "위험" : sensor.temp != null ? "적정 범위 미설정" : "데이터 없음"}</span></div>
                    <div className={`monitor-sensor ${sensorClass(sensor.humidOk)}`}><h4>습도</h4><p>{sensor.humidity != null ? `${sensor.humidity} %` : "-"}</p><span>{sensor.humidOk === true ? "안전" : sensor.humidOk === false ? "위험" : sensor.humidity != null ? "적정 범위 미설정" : "데이터 없음"}</span></div>
                    <div className="monitor-nutrients">
                        <h4>양액 시스템 모니터링</h4>
                        <div>
                            <section className="monitor-nutrient"><header>물</header><p className={sensor.waterHasData && !sensor.waterOk ? "is-water-empty" : undefined}>{sensor.waterHasData ? sensor.waterOk ? "있음" : "없음" : "-"}</p></section>
                            <section className="monitor-nutrient"><header>PH 레벨{sensor.phOk !== null && <StateBadge good={sensor.phOk}>{sensor.phOk ? "정상" : "조절 필요"}</StateBadge>}</header><p>{sensor.ph ?? "-"}</p></section>
                            <section className="monitor-nutrient"><header>농도{sensor.tdsOk !== null && <StateBadge good={sensor.tdsOk}>{sensor.tdsOk ? "정상" : "조절 필요"}</StateBadge>}</header><p>{sensor.tds != null ? `${Math.round(sensor.tds)} ppm` : "-"}</p></section>
                        </div>
                    </div>
                </div>
                <div className="monitor-advice">
                    <header><h4>AI 재배 조언</h4><button type="button" aria-label="AI 재배 조언 새로고침" disabled={adviceLoading} onClick={onRefreshAdvice}><RefreshIcon /></button></header>
                    <div aria-live="polite">{adviceLoading ? "AI가 분석 중이에요..." : advice || "조언을 불러올 수 없어요"}</div>
                </div>
            </section>

            <section className="monitor-section monitor-controls" aria-labelledby="monitor-controls-title">
                <header className="monitor-section-heading"><h3 id="monitor-controls-title">시스템 제어</h3><button type="button" className="monitor-reset" disabled={led.saving || capture.saving} onClick={onReset}>전체 설정 초기화</button></header>
                <div className="monitor-controls-grid">
                    <section className="monitor-control"><header><h4>LED 조명</h4><div className="monitor-mode"><span>수동</span><button type="button" role="switch" aria-label="LED 자동 모드" aria-checked={led.auto} onClick={() => led.onMode(!led.auto)} className={led.auto ? "is-auto" : ""}><i /></button><span>자동</span></div></header>
                        <div className="monitor-control-body">
                            {led.auto ? <div className="monitor-times">
                                <label>시작 시간<input type="time" aria-label="LED 시작 시간" value={led.start} onChange={event => led.onStart(event.target.value)} /></label>
                                <span>~</span>
                                <label>종료 시간<input type="time" aria-label="LED 종료 시간" value={led.end} onChange={event => led.onEnd(event.target.value)} /></label>
                            </div> : <div className="monitor-manual" role="group" aria-label="LED 수동 제어">
                                <button type="button" aria-pressed={led.on} disabled={led.saving} onClick={() => led.onManual(true)}>ON</button>
                                <button type="button" aria-pressed={!led.on} disabled={led.saving} onClick={() => led.onManual(false)}>OFF</button>
                            </div>}
                            <button type="button" className="monitor-primary" disabled={led.saving} onClick={led.auto ? led.onSchedule : () => led.onManual(led.on)}>{led.saving ? "저장 중..." : "스케줄 적용"}</button>
                        </div>
                    </section>
                    <section className="monitor-control"><header><h4>카메라 촬영</h4></header><div className="monitor-control-body">
                        <label className="monitor-capture">시작 시간<select aria-label="카메라 촬영 주기" value={capture.interval} onChange={event => capture.onInterval(Number(event.target.value))}>{[1, 2, 3, 4, 5, 6].map(hours => <option key={hours} value={hours}>{hours}시간</option>)}</select></label>
                        <button type="button" className="monitor-primary" disabled={capture.saving} onClick={capture.onSave}>{capture.saving ? "저장 중..." : "주기 적용"}</button>
                    </div></section>
                </div>
                {saveMessage && <p className={`monitor-save-message ${saveMessage.startsWith("⚠") ? "is-error" : ""}`} role="status">{saveMessage}</p>}
            </section>

            <section className="monitor-section monitor-ports" aria-labelledby="monitor-ports-title">
                <header className="monitor-section-heading"><h3 id="monitor-ports-title">포트별 상태</h3><span className="monitor-selected-port"><i className={portStatus[selectedPort] === "1" ? "is-on" : ""} />{portStatus[selectedPort] === "1" ? "ON" : "OFF"}<strong>포트 {selectedPort + 1}</strong><span>|&nbsp; {selectedPlant ? speciesName || selectedPlant.name : "식물 미등록"}</span></span></header>
                <div className="monitor-port-picker">
                    <div className="monitor-port-buttons"><strong>포트</strong><div>{ports.map(({ index, health, occupied }) => <button key={index} type="button" aria-label={`포트 ${index + 1}${occupied ? " 사용 중" : ""}`} aria-pressed={selectedPort === index} onClick={() => onSelectPort(index)}><i style={{ background: HEALTH[health]?.[0] || HEALTH.pending[0] }} />포트 {index + 1}</button>)}</div></div>
                    <div className="monitor-port-legend">{Object.entries(HEALTH).map(([key, [color, label]]) => <span key={key}><i style={{ background: color }} />{label}</span>)}</div>
                </div>
                <div className="monitor-port-detail">
                    <section className="monitor-plant-info">
                        <header><span className="monitor-plant-icon" aria-hidden="true">{PLANT_ICONS[speciesName] !== undefined ? <img src={plantIcon.src} alt="" width="56" height="56" /> : emoji}</span><div><div><h4>{speciesName || "미등록"}</h4><span>포트 {selectedPort + 1}</span></div><p>{serialNumber}</p></div></header>
                        {selectedPlant ? <>
                            <dl>{[["재배일수", daysSincePlanted !== null ? `${daysSincePlanted}일` : "-"], ["등록된 생육 단계", selectedPlant.stageName || stageNames[Number(selectedPlant.stageIndex)] || selectedPlant.plantStage || "-"], ["품종", speciesName || "-"]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
                            <p className="monitor-stage-note">수동 등록, 변경된 단계일 수 있어요.<br />YOLO가 확인한 단계와는 별개입니다.</p>
                            <details className="monitor-extra"><summary>추가 진단 정보</summary><dl><div><dt>재배 환경 상태</dt><dd>{environmentStatus.portDataAvailable ? environmentStatus.growthStatus : "진단 대기"}</dd></div><div><dt>환경 위험도</dt><dd>{environmentStatus.portDataAvailable ? environmentStatus.diseaseRisk : "-"}</dd></div></dl><button type="button" disabled={growthLoading} onClick={onRefreshObservation}>{growthLoading ? "불러오는 중..." : "관측 새로고침"}</button></details>
                        </> : <p className="monitor-empty">이 포트에 식물이 없어요</p>}
                    </section>
                    <section className="monitor-growth-detail">
                        <h4>생육 상세</h4>
                        <div className="monitor-growth-summary"><div className="monitor-forecast">{forecast}</div>{observation}</div>
                        <div className="monitor-growth-bottom"><div className="monitor-chart-slot">{chart}</div><div className="monitor-diagnosis-slot">{diagnosis || <p className="monitor-empty">이 포트에 식물이 없어요</p>}</div></div>
                    </section>
                </div>
            </section>
        </div>
        {noticesOpen && <NoticeModal notices={notices} visibleCount={noticeVisibleCount} onMore={onMoreNotices} onLess={onLessNotices} onClose={() => setNoticesOpen(false)} />}
    </div>;
}
