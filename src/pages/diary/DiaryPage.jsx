import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getPlantsApi, getDiariesApi, createDiaryApi, updateDiaryApi, deleteDiaryApi } from "../../api/diaryApi";

function DiaryPage() {
    const navigate = useNavigate();
    const [plants, setPlants] = useState([]);
    const [selectedPlant, setSelectedPlant] = useState(null);
    const [diaries, setDiaries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingDiary, setEditingDiary] = useState(null);
    const [selectedDiary, setSelectedDiary] = useState(null);
    const [form, setForm] = useState({ title: "", content: "", targetDate: "" });
    const [error, setError] = useState("");

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) { navigate("/login"); return; }
        fetchPlants();
    }, []);

    useEffect(() => {
        if (selectedPlant) fetchDiaries(selectedPlant.id);
    }, [selectedPlant]);

    const fetchPlants = async () => {
        try {
            const res = await getPlantsApi();
            setPlants(res.data);
            if (res.data.length > 0) setSelectedPlant(res.data[0]);
        } catch (err) { console.error(err); }
    };

    const fetchDiaries = async (plantId) => {
        setLoading(true);
        try {
            const res = await getDiariesApi(plantId);
            setDiaries(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleSubmit = async () => {
        if (!form.title || !form.content || !form.targetDate) {
            setError("모든 항목을 입력해주세요.");
            return;
        }
        setError("");
        try {
            const payload = {
                ...form,
                targetDate: `${form.targetDate} 00:00:00`, // 추가
            };
            if (editingDiary) {
                await updateDiaryApi(selectedPlant.id, editingDiary.id, payload);
            } else {
                await createDiaryApi(selectedPlant.id, payload);
            }
            setShowForm(false);
            setEditingDiary(null);
            setForm({ title: "", content: "", targetDate: "" });
            fetchDiaries(selectedPlant.id);
        } catch (err) {
            setError("저장 중 오류가 발생했습니다.");
        }
    };

    const handleEdit = (diary) => {
        setEditingDiary(diary);
        setForm({
            title: diary.title,
            content: diary.content,
            targetDate: diary.targetDate?.slice(0, 10) || "",
        });
        setSelectedDiary(null);
        setShowForm(true);
    };

    const handleDelete = async (diaryId) => {
        if (!window.confirm("정말 삭제할까요?")) return;
        try {
            await deleteDiaryApi(selectedPlant.id, diaryId);
            setSelectedDiary(null);
            fetchDiaries(selectedPlant.id);
        } catch (err) { console.error(err); }
    };

    const openForm = () => {
        setEditingDiary(null);
        setForm({ title: "", content: "", targetDate: "" });
        setSelectedDiary(null);
        setShowForm(true);
    };

    return (
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
            {/* 헤더 */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate("/")} className="text-gray-400 hover:text-gray-600 text-sm">← 홈</button>
                    <h1 className="text-xl font-bold text-gray-800">📔 다이어리</h1>
                </div>
                {selectedPlant && (
                    <button
                        onClick={openForm}
                        className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                    >+ 새 일지</button>
                )}
            </div>

            {/* 식물 선택 탭 */}
            {plants.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {plants.map(plant => (
                        <button
                            key={plant.id}
                            onClick={() => setSelectedPlant(plant)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
                                ${selectedPlant?.id === plant.id ? "bg-green-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-green-400"}`}
                        >🌱 {plant.name}</button>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
                    <div className="text-4xl mb-3">🌱</div>
                    <p className="text-gray-400 text-sm">등록된 식물이 없어요</p>
                </div>
            )}

            {/* 메인 영역 */}
            {selectedPlant && (
                <div className="flex gap-4">
                    {/* 다이어리 목록 */}
                    <div className="w-64 flex-shrink-0 bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-100">
                            <p className="text-sm font-semibold text-gray-700">{selectedPlant.name} 일지</p>
                            <p className="text-xs text-gray-400 mt-0.5">총 {diaries.length}개</p>
                        </div>
                        {loading ? (
                            <div className="p-4 text-center text-gray-400 text-sm">불러오는 중...</div>
                        ) : diaries.length === 0 ? (
                            <div className="p-6 text-center text-gray-400 text-sm">작성된 일지가 없어요</div>
                        ) : (
                            <div className="flex flex-col">
                                {diaries.map(diary => (
                                    <button
                                        key={diary.id}
                                        onClick={() => { setSelectedDiary(diary); setShowForm(false); }}
                                        className={`text-left px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors
                                            ${selectedDiary?.id === diary.id ? "bg-green-50 border-l-2 border-l-green-500" : ""}`}
                                    >
                                        <p className="text-sm font-medium text-gray-800 truncate">{diary.title}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{diary.targetDate?.slice(0, 10)}</p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 상세 / 작성 폼 */}
                    <div className="flex-grow bg-white rounded-xl border border-gray-200 p-6">
                        {showForm ? (
                            <div className="flex flex-col gap-4">
                                <h2 className="text-base font-bold text-gray-800">{editingDiary ? "일지 수정" : "새 일지 작성"}</h2>
                                {error && <div className="bg-red-50 text-red-500 text-sm rounded-lg px-4 py-2">{error}</div>}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">날짜</label>
                                    <input
                                        type="date"
                                        value={form.targetDate}
                                        onChange={e => setForm({ ...form, targetDate: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                                    <input
                                        type="text"
                                        value={form.title}
                                        onChange={e => setForm({ ...form, title: e.target.value })}
                                        placeholder="일지 제목을 입력하세요"
                                        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">내용</label>
                                    <textarea
                                        value={form.content}
                                        onChange={e => setForm({ ...form, content: e.target.value })}
                                        placeholder="오늘의 식물 상태를 기록해보세요"
                                        rows={8}
                                        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSubmit}
                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
                                    >{editingDiary ? "수정 완료" : "저장"}</button>
                                    <button
                                        onClick={() => { setShowForm(false); setEditingDiary(null); }}
                                        className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-500 hover:bg-gray-50"
                                    >취소</button>
                                </div>
                            </div>
                        ) : selectedDiary ? (
                            <div className="flex flex-col gap-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs text-gray-400 mb-1">{selectedDiary.targetDate?.slice(0, 10)}</p>
                                        <h2 className="text-lg font-bold text-gray-800">{selectedDiary.title}</h2>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEdit(selectedDiary)}
                                            className="text-xs text-green-600 hover:text-green-700 font-medium px-3 py-1.5 border border-green-200 rounded-lg hover:bg-green-50"
                                        >수정</button>
                                        <button
                                            onClick={() => handleDelete(selectedDiary.id)}
                                            className="text-xs text-red-400 hover:text-red-500 px-3 py-1.5 border border-red-100 rounded-lg hover:bg-red-50"
                                        >삭제</button>
                                    </div>
                                </div>
                                <hr className="border-gray-100" />
                                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedDiary.content}</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center py-20">
                                <div className="text-4xl mb-3">📔</div>
                                <p className="text-gray-400 text-sm">일지를 선택하거나 새 일지를 작성해보세요</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default DiaryPage;