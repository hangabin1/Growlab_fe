import { useState, useEffect } from "react";
import { getAllSpeciesApi } from "../../api/speciesApi";
import { createPlantApi, deletePlantApi } from "../../api/plantApi";
import { updatePortStatusApi } from "../../api/deviceApi";
import { checkSharedEnvironment } from "../../utils/sharedEnvironment";
import { toLocalISO } from "../../utils/datetime";
import { DEVICE_ICONS } from "../../assets/deviceIcons";
import closeIcon from "../../assets/icons/close.svg";
import "./SelectPlantModal.css";

const CATEGORY_FILTERS = ["전체", "채소", "허브", "과일", "관상식물"];

const CATEGORY_MAP = {
    "채소": "VEGETABLE",
    "허브": "HERB",
    "과일": "FRUIT",
    "관상식물": "ORNAMENTAL",
};

const SPECIES_EMOJI = {
    "방울토마토": "🍅",
    "청상추":    "🥬",
    "적상추":    "🥬",
    "딸기":      "🍓",
    "파프리카":  "🌶️",
    "풋고추":    "🌶️",
    "고추":      "🌶️",
    "블루베리":  "🫐",
    "시금치":    "🥬",
    "토마토":    "🍅",
    "오이":      "🥒",
    "피망":      "🫑",
    "깻잎":      "🍃",
    "청경채":    "🥬",
    "브로콜리":  "🥦",
    "바질":      "🌿",
    "페퍼민트":  "🌿",
    "장미":      "🌹",
    "테이블야자": "🌴",
    "산세베리아 스투키": "🪴",
};

const DIFFICULTY_LABEL = { EASY: "쉬움", NORMAL: "보통", HARD: "어려움" };


const SPECIES_ICON_INDEX = { '딸기':0, '바질':1, '페퍼민트':1, '상추':5, '청상추':5, '적상추':5, '시금치':5, '청경채':5, '방울토마토':4, '토마토':4, '파프리카':6, '풋고추':6, '고추':6 };

function SpeciesSymbol({ species, detail = false }) {
    const name = species.name || species.koreanName;
    const index = SPECIES_ICON_INDEX[name];
    const icon = index === undefined ? null : DEVICE_ICONS[index];
    return <span className={`plant-select__symbol${detail ? ' plant-select__symbol--detail' : ''}`} aria-hidden="true">
        {icon ? <img src={icon.src} alt="" width={detail ? 52 : 36} height={detail ? 52 : 36} /> : SPECIES_EMOJI[name] || <img src={DEVICE_ICONS[2].src} alt="" width={detail ? 52 : 36} height={detail ? 52 : 36} />}
    </span>;
}

function DifficultyBadge({ difficulty = 'NORMAL' }) {
    const variant = difficulty === 'HARD' ? 'hard' : difficulty === 'EASY' ? 'easy' : 'normal';
    return <span className={`plant-select__difficulty plant-select__difficulty--${variant}`}>{DIFFICULTY_LABEL[difficulty] || '보통'}</span>;
}

function SelectionCheck({ selected }) {
    return <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="7" fill={selected ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" />
        <path d="m5.5 9 2.25 2.25 4.5-4.5" stroke={selected ? 'white' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>;
}

function SelectPlantModal({ serialNumber, portIndex, existingPlants = [], onClose, onSuccess }) {
    const [species, setSpecies]         = useState([]);
    const [selected, setSelected]       = useState(null);
    const [search, setSearch]           = useState("");
    const [category, setCategory]       = useState("전체");
    const [plantName, setPlantName]     = useState("");
    const [loading, setLoading]         = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [error, setError]             = useState("");

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = previousOverflow; };
    }, []);

    useEffect(() => {
        getAllSpeciesApi()
            .then(res => setSpecies(res.data))
            .catch(() => setSpecies([]))
            .finally(() => setFetchLoading(false));
    }, []);

    const handleSelect = (sp) => {
        setSelected(sp);
        const previous = existingPlants.find(plant => plant.speciesId === sp.id);
        setPlantName(previous?.name || sp.name || sp.koreanName || "");
        setError("");
    };

    const filtered = species.filter(sp => {
        const matchSearch   = (sp.name || "").includes(search);
        const matchCategory = category === "전체" || sp.category === CATEGORY_MAP[category];
        return matchSearch && matchCategory;
    });

    const handleSubmit = async () => {
        if (!selected) return;
        const compatibility = checkSharedEnvironment(selected, existingPlants, species);
        if (!compatibility.compatible) { setError(compatibility.reason); return; }
        if (!plantName.trim()) {
            setError("식물 이름을 입력해주세요.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const created = await createPlantApi({
                    name:        plantName.trim(),
                    stageIndex:  0,
                    plantedAt:   toLocalISO(),
                    germinatedAt: null,
                    maturedAt:   null,
                    speciesId:   selected.id,
                    serialNumber,
                    portIndex,
                });
                try {
                    await updatePortStatusApi(serialNumber, portIndex, true);
                } catch (portError) {
                    // 포트 활성화에 실패하면 식물 등록도 되돌려 빈 포트로 유지한다.
                    try { await deletePlantApi(created.data.id); } catch (rollbackError) {
                        console.error("[Plant rollback]", rollbackError);
                    }
                    throw portError;
                }
                await onSuccess();
                onClose();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                err.response?.data ||
                "처리에 실패했습니다."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="plant-select-backdrop">
            <section role="dialog" aria-modal="true" aria-labelledby="plant-select-title" className="plant-select">
                <header className="plant-select__header">
                    <h2 id="plant-select-title" className="plant-select__title">식물 선택</h2>
                    <span className="plant-select__port">P{portIndex + 1}에 심을 품종</span>
                    <button type="button" onClick={onClose} aria-label="식물 선택 닫기" className="plant-select__close">
                        <img src={closeIcon} alt="" width="28" height="28" />
                    </button>
                </header>

                <div className="plant-select__body">
                    <div className="plant-select__catalog">
                        <div className="plant-select__categories" role="group" aria-label="식물 카테고리">
                            {CATEGORY_FILTERS.map(cat => (
                                <button key={cat} type="button" aria-pressed={category === cat}
                                    className="plant-select__category" onClick={() => setCategory(cat)}>{cat}</button>
                            ))}
                        </div>
                        <label className="plant-select__search" title={`재배 가능한 식물 ${filtered.length}가지`}>
                            <span className="sr-only">식물 이름으로 검색</span>
                            <input type="search" value={search} onChange={event => setSearch(event.target.value)}
                                placeholder="식물 이름으로 검색" aria-describedby="plant-select-result-count" />
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <circle cx="10" cy="10" r="6" /><path d="m15 15 6 6" strokeLinecap="round" />
                            </svg>
                        </label>
                        <div className="plant-select__list" aria-busy={fetchLoading}>
                            <span id="plant-select-result-count" className="sr-only" role="status">재배 가능한 식물 {filtered.length}가지</span>
                            {fetchLoading ? (
                                <p className="plant-select__empty">불러오는 중...</p>
                            ) : filtered.length === 0 ? (
                                <p className="plant-select__empty">검색 결과가 없어요</p>
                            ) : (
                                <div className="plant-select__grid">
                                    {filtered.map(sp => {
                                        const name = sp.name || sp.koreanName;
                                        const compatibility = checkSharedEnvironment(sp, existingPlants, species);
                                        const isSelected = selected?.id === sp.id;
                                        return (
                                            <button key={sp.id} type="button" className="plant-select__card"
                                                aria-label={`${name} 선택`} aria-pressed={isSelected}
                                                disabled={!compatibility.compatible} title={compatibility.reason || name}
                                                onClick={() => handleSelect(sp)}>
                                                <span className="plant-select__check" aria-hidden="true"><SelectionCheck selected={isSelected} /></span>
                                                <SpeciesSymbol species={sp} />
                                                <span className="plant-select__card-name">{name}</span>
                                                <DifficultyBadge difficulty={sp.difficulty} />
                                                {!compatibility.compatible && <span className="plant-select__incompatible">{compatibility.reason}</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    <aside className="plant-select__detail" aria-label="선택한 식물 상세">
                        {!selected ? (
                            <p className="plant-select__placeholder">식물을 선택하면<br />상세 정보가 표시됩니다</p>
                        ) : (
                            <>
                                <div className="plant-select__summary">
                                    <SpeciesSymbol species={selected} detail />
                                    <div className="plant-select__summary-copy">
                                        <h3 className="plant-select__name">{selected.name || selected.koreanName}</h3>
                                        <DifficultyBadge difficulty={selected.difficulty} />
                                    </div>
                                </div>
                                {(selected.stageNames?.length > 0 || selected.description || selected.aiPromptGuideline) && (
                                    <div className="plant-select__guide">
                                        {selected.stageNames?.length > 0 && (
                                            <div className="plant-select__stages">
                                                <p>생육 단계 ({selected.stageNames.length}단계)</p>
                                                <p>{selected.stageNames.join(" → ")}</p>
                                            </div>
                                        )}
                                        {(selected.description || selected.aiPromptGuideline) && (
                                            <div className="plant-select__guideline">
                                                {selected.description && <p>{selected.description}</p>}
                                                {selected.aiPromptGuideline && <p>{selected.aiPromptGuideline}</p>}
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="plant-select__naming">
                                    <label htmlFor="plant-select-name">식물 이름</label>
                                    <input id="plant-select-name" type="text" value={plantName} maxLength={20}
                                        disabled={existingPlants.some(plant => plant.speciesId === selected.id)}
                                        onChange={event => setPlantName(event.target.value)} placeholder="식물 이름을 입력해주세요."
                                        aria-describedby="plant-select-name-help" />
                                    <p id="plant-select-name-help" className="plant-select__help">같은 기기의 동일 품종 별명이 자동으로 적용됩니다.<span className="sr-only"> 최대 20자.</span></p>
                                </div>
                                {(selected.englishName || selected.growthDays || selected.temperature || selected.waterRequirement) && (
                                    <details className="plant-select__extra">
                                        <summary>추가 정보</summary>
                                        <dl>
                                            {selected.englishName && <><dt>영문명</dt><dd>{selected.englishName}</dd></>}
                                            {selected.growthDays && <><dt>재배 기간</dt><dd>{selected.growthDays}일</dd></>}
                                            {selected.temperature && <><dt>최적 온도</dt><dd>{selected.temperature}</dd></>}
                                            {selected.waterRequirement && <><dt>수분 요구</dt><dd>{selected.waterRequirement}</dd></>}
                                        </dl>
                                    </details>
                                )}
                                {error && <p role="alert" className="plant-select__error">{error}</p>}
                                <button type="button" onClick={handleSubmit} disabled={loading} className="plant-select__submit">
                                    {loading ? "처리 중..." : "식물 추가"}
                                </button>
                            </>
                        )}
                    </aside>
                </div>
            </section>
        </div>
    );
}

export default SelectPlantModal;
