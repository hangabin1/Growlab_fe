import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createArticleApi } from '../../api/articleApi';

const ArticleCreatePage = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('재배 노하우');
  const [file, setFile] = useState(null); 
  const [preview, setPreview] = useState(""); 
  const token = localStorage.getItem("token");

  // 파일 선택 핸들러
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile)); // 미리보기 생성
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return alert("제목과 내용을 입력하세요.");

    const formData = new FormData();
    const articleData = {
      title: title,
      content: content,
      category: category
    };
    formData.append(
      'articleData', 
      new Blob([JSON.stringify(articleData)], { type: 'application/json' })
    );

    if (file) {
      formData.append('file', file);
    }

    try {
      // API 호출 
      await createArticleApi(formData, token);
      alert("글이 성공적으로 등록되었습니다!");
      navigate('/articles');
    } catch (error) {
      console.error("글 등록 실패:", error);
      alert("글 등록 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-10 font-sans">
      <div className="max-w-4xl mx-auto bg-white rounded-[3rem] shadow-sm border border-gray-100 p-12">
        <header className="mb-10">
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">새 게시글 작성</h2>
          <p className="text-sm text-gray-500 mt-2 font-medium">GrowLab의 지식 창고에 당신의 노하우를 더해주세요.</p>
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
            
            {/* 사진 업로드 버튼 및 미리보기 */}
            <div className="flex flex-col gap-4">
              <label className="w-fit cursor-pointer bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-2">
                📸 사진 첨부하기
                <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
              </label>
              
              {preview && (
                <div className="relative w-40 h-40 rounded-2xl overflow-hidden border border-gray-100">
                  <img src={preview} alt="미리보기" className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={() => {setFile(null); setPreview("");}}
                    className="absolute top-1 right-1 bg-black/50 text-white w-6 h-6 rounded-full text-xs"
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
            <button type="button" onClick={() => navigate(-1)} className="px-8 py-3 text-gray-400 font-bold">취소</button>
            <button type="submit" className="px-12 py-3 bg-[#16a34a] text-white rounded-2xl font-bold shadow-lg shadow-green-100">
              등록하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ArticleCreatePage;