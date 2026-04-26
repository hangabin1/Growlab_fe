import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { 
  getArticleDetailApi, 
  toggleArticleLikeApi, 
  createCommentApi,
  deleteArticleApi, 
  deleteCommentApi,
  updateCommentApi // 정식 추가된 API 사용
} from '../../api/articleApi';

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

  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingContent, setEditingContent] = useState("");

  // ★ 수정 포인트: userId가 null인 문제를 해결하기 위해 username으로 본인 확인
  const currentUsername = localStorage.getItem("username");

  useEffect(() => {
    if (isFetchingInternal) return;
    fetchDetail();
    setCurrentPage(1);
    return () => { isFetchingInternal = false; };
  }, [id]);

  const fetchDetail = async () => {
    isFetchingInternal = true;
    const token = localStorage.getItem("token");
    try {
      const response = await getArticleDetailApi(id, token);
      setPost(response.data);
      // 디버깅용 로그
      console.log("현재 접속자:", currentUsername, "작성자:", response.data.authorUsername);
    } catch (error) {
      console.error("상세조회 실패:", error);
      isFetchingInternal = false;
    }
  };

  const handleDeleteArticle = async () => {
    if (!window.confirm("정말로 이 게시글을 삭제하시겠습니까?")) return;
    const token = localStorage.getItem("token");
    try {
      await deleteArticleApi(id, token);
      alert("삭제되었습니다.");
      navigate('/articles');
    } catch (error) { 
      alert("삭제 실패: 권한이 없습니다."); 
    }
  };

  const handleCommentSubmit = async () => {
    if (!comment.trim()) return;
    const token = localStorage.getItem("token");
    try {
      await createCommentApi(id, { content: comment }, token);
      setComment(""); 
      isFetchingInternal = false;
      fetchDetail(); 
    } catch (error) { console.error(error); }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("댓글을 삭제하시겠습니까?")) return;
    const token = localStorage.getItem("token");
    try {
      await deleteCommentApi(commentId, token);
      isFetchingInternal = false;
      fetchDetail();
    } catch (error) { alert("댓글 삭제 실패"); }
  };

  const startEditComment = (c) => {
    setEditingCommentId(c.id);
    setEditingContent(c.content);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingContent("");
  };

  const handleUpdateComment = async (commentId) => {
    const token = localStorage.getItem("token");
    try {
      // ★ 수정 포인트: 정식 updateCommentApi 호출
      await updateCommentApi(commentId, { content: editingContent }, token);
      setEditingCommentId(null);
      isFetchingInternal = false;
      fetchDetail();
    } catch (error) {
      alert("댓글 수정 실패");
    }
  };

  const handleLike = async () => {
    const token = localStorage.getItem("token");
    if (!token) return alert("로그인이 필요합니다.");
    try {
      await toggleArticleLikeApi(id, token);
      isFetchingInternal = false; 
      fetchDetail(); 
    } catch (error) { console.error(error); }
  };

  if (!post) return <div className="p-20 text-center font-bold text-gray-400">로딩 중...</div>;

  const allComments = post.comments || [];
  const currentComments = allComments.slice((currentPage-1)*commentsPerPage, currentPage*commentsPerPage);

  return (
    <div className="min-h-screen bg-[#f8f9fa] pt-6 pb-16 px-6 font-sans">
      <div className="max-w-4xl mx-auto">
        
        <div className="mb-6 flex justify-between items-center">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-green-600 font-bold text-sm group">
            <span className="group-hover:-translate-x-1 transition-transform">←</span> 목록으로 돌아가기
          </button>

          {/* ★ 수정 포인트: ID 대신 Username으로 비교하여 버튼 노출 제어 */}
          {post.authorUsername === currentUsername && (
            <div className="flex gap-2">
              <button onClick={() => navigate(`/articles/edit/${id}`)} className="text-xs font-bold text-gray-500 bg-gray-100 px-4 py-2 rounded-xl hover:bg-gray-200 transition-all shadow-sm">게시글 수정</button>
              <button onClick={handleDeleteArticle} className="text-xs font-bold text-red-500 bg-red-50 px-4 py-2 rounded-xl hover:bg-red-100 transition-all shadow-sm">게시글 삭제</button>
            </div>
          )}
        </div>

        <article className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden mb-10 p-12">
          <header className="mb-10">
            <span className="inline-block px-4 py-1.5 bg-green-50 text-green-600 rounded-full text-[11px] font-bold mb-4">{post.category}</span>
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
                <span>👁️ 조회수 {post.viewCount || 0}</span>
                <span className={post.liked ? 'text-orange-500 font-bold' : ''}>❤️ 좋아요 {post.likesCount || 0}</span>
              </div>
            </div>
          </header>

          {post.imageUrl && (
            <div className="flex justify-center mb-12">
              <img src={post.imageUrl.startsWith('http') ? post.imageUrl : `${SERVER_URL}${post.imageUrl}`} className="max-w-full rounded-[2.5rem] border border-gray-50 shadow-sm" alt="post" />
            </div>
          )}

          <div className="text-gray-700 leading-relaxed text-lg whitespace-pre-wrap mb-12">{post.content}</div>

          <div className="flex justify-center border-t border-gray-50 pt-12">
            <button onClick={handleLike} className={`flex items-center gap-3 px-10 py-4 rounded-full border-2 font-bold transition-all ${post.liked ? 'bg-orange-50 border-orange-200 text-orange-500' : 'border-orange-100 text-orange-400 hover:bg-orange-50'}`}>
              <span>{post.liked ? '❤️' : '🤍'}</span> {post.liked ? '도움이 되었어요!' : '이 글이 도움이 되었나요?'}
            </button>
          </div>
        </article>

        <section className="bg-white rounded-[2.5rem] p-12 shadow-sm border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-10">💬 댓글 <span className="text-green-600">{allComments.length}</span></h2>
          
          <div className="flex gap-4 mb-12 bg-gray-50 p-4 rounded-[2rem]">
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="지식을 나누어주세요!" className="flex-1 bg-transparent p-4 text-sm outline-none resize-none h-28" />
            <button onClick={handleCommentSubmit} className="px-10 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 h-28">등록</button>
          </div>

          <div className="space-y-8">
            {currentComments.map((c, idx) => (
              <div key={idx} className="flex gap-5 group border-b border-gray-50 pb-6 last:border-0">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400">👤</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-800">{c.authorUsername}</span>
                      {/* ★ 수정 포인트: 댓글도 Username으로 비교 */}
                      {c.authorUsername === currentUsername && (
                        <div className="flex gap-2">
                          <button onClick={() => startEditComment(c)} className="text-[10px] text-gray-400 hover:text-green-600 font-bold">수정</button>
                          <button onClick={() => handleDeleteComment(c.id)} className="text-[10px] text-red-300 hover:text-red-500 font-bold">삭제</button>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400">{c.createdAt}</span>
                  </div>

                  {editingCommentId === c.id ? (
                    <div className="mt-2">
                      <textarea 
                        value={editingContent} 
                        onChange={(e) => setEditingContent(e.target.value)}
                        className="w-full bg-gray-50 border border-green-100 rounded-xl p-3 text-sm outline-none resize-none"
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <button onClick={cancelEditComment} className="text-xs font-bold text-gray-400">취소</button>
                        <button onClick={() => handleUpdateComment(c.id)} className="text-xs font-bold text-green-600">완료</button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[15px] text-gray-600 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <Lightbox open={isOpen} close={() => setIsOpen(false)} slides={[{ src: post.imageUrl?.startsWith('http') ? post.imageUrl : `${SERVER_URL}${post.imageUrl}` }]} />
    </div>
  );
};

export default ArticleDetailPage;