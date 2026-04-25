import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { getArticleDetailApi, toggleArticleLikeApi, createCommentApi } from '../../api/articleApi';

// ★ 핵심: 컴포넌트 외부에서 관리하여 리액트의 생명주기(Strict Mode)와 상관없이 상태를 유지합니다.
// 이 변수가 true인 동안에는 추가적인 fetchDetail 호출을 막습니다.
let isFetchingInternal = false;

const ArticleDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [comment, setComment] = useState("");
  const SERVER_URL = "http://localhost:8080";

  const [isOpen, setIsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const commentsPerPage = 5;

  useEffect(() => {
    // 1. 이미 데이터를 가져오고 있거나 가져왔다면 중복 실행 방지
    if (isFetchingInternal) return;

    fetchDetail();
    setCurrentPage(1);

    // 2. 클린업 함수: 컴포넌트가 사라지거나(언마운트) 다른 글로 이동할 때 변수 초기화
    return () => {
      isFetchingInternal = false;
    };
  }, [id]);

  // 상세 데이터 로드 (조회수 증가 및 좋아요 상태 포함)
  const fetchDetail = async () => {
    isFetchingInternal = true; // 잠금 장치 가동 (조회수 2번 올라가는 것 방지)
    
    const token = localStorage.getItem("token");
    try {
      const response = await getArticleDetailApi(id, token);
      setPost(response.data);
    } catch (error) {
      console.error("상세조회 실패:", error);
      isFetchingInternal = false; // 실패 시에는 다시 시도 가능하게 해제
    }
  };

  // 좋아요 토글 함수
  const handleLike = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("로그인이 필요한 기능입니다.");
      return;
    }
    try {
      await toggleArticleLikeApi(id, token);
      
      // 좋아요 클릭 시 조회수가 또 올라가는 것을 방지하기 위해 
      // 잠금을 해제한 뒤 fetchDetail을 부릅니다.
      isFetchingInternal = false; 
      fetchDetail(); 
    } catch (error) {
      console.error("좋아요 실패:", error);
    }
  };

  // 댓글 등록 함수
  const handleCommentSubmit = async () => {
    if (!comment.trim()) {
      alert("댓글 내용을 입력해주세요.");
      return;
    }
    const token = localStorage.getItem("token");
    try {
      await createCommentApi(id, { content: comment }, token);
      setComment(""); 
      
      // 댓글 등록 시에도 조회를 다시 해야 하므로 잠금 해제 후 호출
      isFetchingInternal = false;
      fetchDetail(); 
    } catch (error) {
      console.error("댓글 등록 실패:", error);
      alert("댓글 등록에 실패했습니다.");
    }
  };

  if (!post) return <div className="p-20 text-center font-bold text-gray-400">데이터를 불러오는 중...</div>;

  const allComments = post.comments || [];
  const indexOfLastComment = currentPage * commentsPerPage;
  const indexOfFirstComment = indexOfLastComment - commentsPerPage;
  const currentComments = allComments.slice(indexOfFirstComment, indexOfLastComment);
  const totalPages = Math.ceil(allComments.length / commentsPerPage);

  return (
    <div className="min-h-screen bg-[#f8f9fa] pt-6 pb-16 px-6 font-sans">
      <div className="max-w-4xl mx-auto">
        
        <button 
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-gray-400 hover:text-green-600 transition-all font-bold group text-sm"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span> 목록으로 돌아가기
        </button>

        <article className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden mb-10">
          <div className="p-12">
            <header className="mb-10">
              <span className="inline-block px-4 py-1.5 bg-green-50 text-green-600 rounded-full text-[11px] font-bold mb-4">
                {post.category}
              </span>
              <h1 className="text-4xl font-extrabold text-gray-900 mb-8 leading-tight">{post.title}</h1>
              
              <div className="flex items-center justify-between border-b border-gray-50 pb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-400 border border-indigo-100 font-bold">👤</div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{post.authorUsername}</p>
                    <p className="text-xs text-gray-400">{post.createdAt}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm text-gray-400 font-medium">
                  <span className="flex items-center gap-1.5">👁️ 조회수 {post.viewCount || 0}</span>
                  <span className={`flex items-center gap-1.5 font-bold ${post.liked ? 'text-orange-500' : 'text-gray-400'}`}>
                    ❤️ 좋아요 {post.likesCount || 0}
                  </span>
                </div>
              </div>
            </header>

            {post.imageUrl && (
              <div className="flex justify-center w-full mb-12">
                <div 
                  className="max-w-full rounded-[2.5rem] overflow-hidden border border-gray-50 shadow-sm cursor-pointer group relative"
                  onClick={() => setIsOpen(true)}
                >
                  <img 
                    src={post.imageUrl.startsWith('http') ? post.imageUrl : `${SERVER_URL}${post.imageUrl}`}
                    alt="content" 
                    className="w-full h-auto object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
                    <span className="text-white opacity-0 group-hover:opacity-100 font-bold bg-black/20 px-4 py-2 rounded-full backdrop-blur-sm transition-opacity">클릭하여 확대</span>
                  </div>
                </div>
              </div>
            )}

            <div className="text-gray-700 leading-relaxed text-lg whitespace-pre-wrap mb-12">
              {post.content}
            </div>

            <div className="flex justify-center border-t border-gray-50 pt-12">
              <button 
                onClick={handleLike}
                className={`flex items-center gap-3 px-10 py-4 rounded-full border-2 font-bold transition-all active:scale-95 shadow-sm ${
                  post.liked 
                  ? 'bg-orange-50 border-orange-200 text-orange-500' 
                  : 'border-orange-100 text-orange-400 hover:bg-orange-50'
                }`}
              >
                <span className="text-xl">{post.liked ? '❤️' : '🤍'}</span> 
                {post.liked ? '도움이 되었어요!' : '이 글이 도움이 되었나요?'}
              </button>
            </div>
          </div>
        </article>

        <section className="bg-white rounded-[2.5rem] p-12 shadow-sm border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-10 flex items-center gap-3">
            💬 댓글 <span className="text-green-600 text-lg">{allComments.length}</span>
          </h2>
          
          <div className="flex gap-4 mb-12 bg-gray-50 p-4 rounded-[2rem]">
            <textarea 
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="따뜻한 댓글로 스마트팜 지식을 나누어주세요!"
              className="flex-1 bg-transparent rounded-2xl p-4 text-sm outline-none resize-none h-28"
            />
            <button 
              onClick={handleCommentSubmit}
              className="px-10 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-100 h-28"
            >
              등록
            </button>
          </div>

          <div className="space-y-8 mb-10">
            {currentComments.length > 0 ? (
              currentComments.map((c, idx) => (
                <div key={idx} className="flex gap-5 group">
                  <div className="w-10 h-10 shrink-0 rounded-full bg-gray-100 flex items-center justify-center text-xs border border-gray-200 font-bold text-gray-400">👤</div>
                  <div className="flex-1 border-b border-gray-50 pb-6 group-last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-gray-800">{c.authorUsername || "익명"}</span>
                      <span className="text-[10px] text-gray-400 font-medium">{c.createdAt || "방금 전"}</span>
                    </div>
                    <p className="text-[15px] text-gray-600 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-16">
                <p className="text-gray-300 font-medium">아직 등록된 댓글이 없습니다. 🌱</p>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 pt-8 border-t border-gray-50">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm text-gray-400 disabled:opacity-30"
              >
                이전
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${
                    currentPage === i + 1 
                      ? 'bg-green-600 text-white shadow-md' 
                      : 'text-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm text-gray-400 disabled:opacity-30"
              >
                다음
              </button>
            </div>
          )}
        </section>
      </div>

      <Lightbox
        open={isOpen}
        close={() => setIsOpen(false)}
        slides={[{ src: post.imageUrl?.startsWith('http') ? post.imageUrl : `${SERVER_URL}${post.imageUrl}` }]}
      />
    </div>
  );
};

export default ArticleDetailPage;