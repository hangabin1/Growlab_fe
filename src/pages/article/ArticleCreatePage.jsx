import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createArticleApi, getArticleDetailApi, updateArticleApi } from '../../api/articleApi';

const ArticleCreatePage = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // URL에 id가 있으면 수정 모드
  const isEditMode = !!id;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('재배 노하우');
  const [file, setFile] = useState(null); 
  const [preview, setPreview] = useState(""); 

  // 수정 모드일 경우 기존 데이터 불러오기
  useEffect(() => {
    if (isEditMode) {
      fetchPostDetail();
    }
  }, [id]);

  const fetchPostDetail = async () => {
    const token = localStorage.getItem("token"); // 상세 조회 시에도 최신 토큰 사용
    try {
      const response = await getArticleDetailApi(id, token);
      const post = response.data;
      setTitle(post.title);
      setContent(post.content);
      setCategory(post.category);
      if (post.imageUrl) {
        const SERVER_URL = "http://localhost:8080";
        setPreview(post.imageUrl.startsWith('http') ? post.imageUrl : `${SERVER_URL}${post.imageUrl}`);
      }
    } catch (error) {
      console.error("데이터 로드 실패:", error);
      alert("글 데이터를 불러오지 못했습니다.");
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile)); 
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return alert("제목과 내용을 입력하세요.");

    // ★ 핵심 수정: 전송 직전에 localStorage에서 최신 토큰을 가져옵니다.
    const currentToken = localStorage.getItem("token");
    if (!currentToken) {
      alert("로그인이 필요합니다.");
      navigate('/login');
      return;
    }

    const formData = new FormData();
    const articleData = { title, content, category };
    
    // JSON 데이터를 Blob으로 감싸서 전달 (Spring Boot의 @RequestPart와 매칭)
    formData.append(
      'articleData', 
      new Blob([JSON.stringify(articleData)], { type: 'application/json' })
    );

    if (file) {
      formData.append('file', file);
    }

    try {
      if (isEditMode) {
        // 수정 모드: PUT 호출
        await updateArticleApi(id, formData, currentToken);
        alert("글이 성공적으로 수정되었습니다!");
      } else {
        // 작성 모드: POST 호출
        await createArticleApi(formData, currentToken);
        alert("글이 성공적으로 등록되었습니다!");
      }
      navigate(isEditMode ? `/articles/${id}` : '/articles');
    } catch (error) {
      console.error("작업 실패:", error);
      
      // 서버에서 전달한 에러 메시지가 있다면 표시, 없으면 기본 메시지
      if (error.response?.status === 401) {
        alert("수정 권한이 없거나 세션이 만료되었습니다.");
      } else {
        alert(isEditMode ? "글 수정 중 오류가 발생했습니다." : "글 등록 중 오류가 발생했습니다.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-10 font-sans">
      <div className="max-w-4xl mx-auto bg-white rounded-[3rem] shadow-sm border border-gray-100 p-12">
        <header className="mb-10">
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {isEditMode ? "게시글 수정" : "새 게시글 작성"}
          </h2>
          <p className="text-sm text-gray-500 mt-2 font-medium">
            {isEditMode ? "내용을 자유롭게 수정해 보세요." : "GrowLab의 지식 창고에 당신의 노하우를 더해주세요."}
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 카테고리 선택 */}
          <div className="flex gap-3">
            {['재배 노하우', '자유 게시판', '질문/답변'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                  category === cat ? 'bg-[#16a34a] text-white' : 'bg-gray-100 text-gray-400'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="space-y-6">
            <input 
              type="text" 
              placeholder="제목을 입력하세요" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-2xl font-bold border-b border-gray-100 py-4 focus:border-green-500 outline-none transition-all"
            />
            
            <div className="flex flex-col gap-4">
              <label className="w-fit cursor-pointer bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-2">
                📸 {isEditMode ? "사진 변경하기" : "사진 첨부하기"}
                <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
              </label>
              
              {preview && (
                <div className="relative w-40 h-40 rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                  <img src={preview} alt="미리보기" className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={() => {setFile(null); setPreview("");}}
                    className="absolute top-1 right-1 bg-black/50 text-white w-6 h-6 rounded-full text-xs hover:bg-black/70"
                  >✕</button>
                </div>
              )}
            </div>

            <textarea 
              placeholder="내용을 입력하세요..." 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full min-h-[350px] py-4 outline-none resize-none text-gray-700 leading-relaxed text-lg"
            />
          </div>

          <div className="flex justify-end gap-3 pt-6">
            <button type="button" onClick={() => navigate(-1)} className="px-8 py-3 text-gray-400 font-bold hover:text-gray-600">취소</button>
            <button type="submit" className="px-12 py-3 bg-[#16a34a] text-white rounded-2xl font-bold shadow-lg shadow-green-100 hover:bg-[#15803d] transition-all">
              {isEditMode ? "수정 완료" : "등록하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ArticleCreatePage;