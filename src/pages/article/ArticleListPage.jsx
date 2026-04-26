import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getArticlesApi } from '../../api/articleApi';

const ArticleListPage = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [currentCategory, setCurrentCategory] = useState('전체');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 10;

  const SERVER_URL = "http://localhost:8080";

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [currentCategory]);

  const fetchPosts = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await getArticlesApi(token);
      if (response.data && response.data.content) {
        setPosts(response.data.content);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error("데이터 로딩 실패:", error);
    }
  };

  const filteredPosts = posts.filter(post => {
    const matchesCategory = currentCategory === '전체' || post.category === currentCategory;
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const indexOfLastPost = currentPage * postsPerPage;
  const indexOfFirstPost = indexOfLastPost - postsPerPage;
  const currentPosts = filteredPosts.slice(indexOfFirstPost, indexOfLastPost);
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);

  const popularPosts = [...posts].sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0)).slice(0, 3);

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-10 font-sans">
      <div className="max-w-7xl mx-auto flex gap-8">
        
        {/* 사이드바 */}
        <aside className="w-64 bg-white rounded-[2rem] p-8 shadow-sm h-fit border border-gray-100 sticky top-10">
          <div className="relative mb-8 mt-2">
            <input 
              type="text" 
              placeholder="게시글 이름으로 검색..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-green-500 transition-all"
            />
          </div>
          <nav className="space-y-2">
            {['전체', '재배 노하우', '자유 게시판', '질문/답변'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCurrentCategory(cat)}
                className={`w-full flex justify-between items-center px-4 py-3 rounded-xl transition-all ${
                  currentCategory === cat ? 'bg-green-50 text-green-600 font-bold' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span>{cat}</span>
                <span className="text-[10px] bg-white px-2 py-1 rounded-md border border-gray-100">
                  {cat === '전체' ? posts.length : posts.filter(p => p.category === cat).length}개
                </span>
              </button>
            ))}
          </nav>
          <button 
            onClick={() => navigate('/articles/write')}
            className="w-full mt-10 bg-[#16a34a] text-white py-4 rounded-2xl font-bold shadow-lg shadow-green-100 transition-transform active:scale-95"
          >
            + 글쓰기
          </button>
        </aside>

        {/* 메인 콘텐츠 */}
        <main className="flex-1 bg-white rounded-[3rem] p-12 shadow-sm border border-gray-100">
          <header className="mb-10">
            <h1 className="text-4xl font-extrabold text-gray-900 mb-2">{currentCategory}</h1>
            <p className="text-gray-500">
              {currentCategory === '전체' 
                ? "GrowLab의 모든 지식을 한눈에 확인하세요." 
                : `${currentCategory}에 대한 정보를 공유하고 소통하세요.`}
            </p>
          </header>

          {/* 1. 인기 게시글 섹션 */}
          {currentCategory === '전체' && popularPosts.length > 0 && (
            <section className="mb-16">
              <h2 className="flex items-center gap-2 text-xl font-bold mb-6 text-gray-800">
                <span className="text-orange-500">🔥</span> 인기 게시글
              </h2>
              <div className="grid grid-cols-3 gap-6">
                {popularPosts.map((post) => (
                  <div 
                    key={post.id}
                    onClick={() => navigate(`/articles/${post.id}`)}
                    className="bg-white rounded-[2rem] border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="w-full h-32 rounded-xl overflow-hidden mb-4 bg-gray-100">
                      {post.imageUrl ? (
                        <img 
                          src={post.imageUrl.startsWith('http') ? post.imageUrl : `${SERVER_URL}${post.imageUrl}`} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          alt="popular"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs font-medium">No Image</div>
                      )}
                    </div>
                    <span className="inline-block px-3 py-1 bg-green-50 text-green-600 text-[10px] font-bold rounded-full mb-2">
                      {post.category}
                    </span>
                    <h3 className="font-bold text-gray-800 text-sm line-clamp-2 mb-4 group-hover:text-green-600">
                      {post.title}
                    </h3>
                    <div className="flex items-center justify-between text-[10px] text-gray-400 font-medium">
                      <span className="flex items-center gap-1">👤 {post.authorUsername}</span>
                      <div className="flex items-center gap-2">
                        {/* ★ 16 대신 post.viewCount 사용 */}
                        <span className="flex items-center gap-0.5 font-medium">👁️ {post.viewCount || 0}</span>
                        <span className="flex items-center gap-0.5 text-orange-500 font-bold">❤️ {post.likesCount || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 2. 게시글 리스트 섹션 */}
          <section>
            <div className="flex items-center justify-between px-6 pb-4 border-b border-gray-100 text-sm font-bold text-gray-400">
              <span className="w-[50%]">제목</span>
              <div className="flex-1 grid grid-cols-4 text-center">
                <span>작성자</span>
                <span>작성일</span>
                <span>조회수</span>
                <span className="text-green-600">좋아요</span>
              </div>
            </div>

            <div className="divide-y divide-gray-50 mb-10">
              {currentPosts.length > 0 ? (
                currentPosts.map((post) => (
                  <div 
                    key={post.id}
                    onClick={() => navigate(`/articles/${post.id}`)}
                    className="flex items-center justify-between px-6 py-5 hover:bg-gray-50/50 transition-colors cursor-pointer group"
                  >
                    <div className="w-[50%] flex items-center gap-3">
                      <span className="text-lg opacity-70">🌱</span>
                      <span className="font-bold text-gray-700 group-hover:text-green-600 truncate">
                        {post.title}
                      </span>
                    </div>
                    <div className="flex-1 grid grid-cols-4 text-center text-sm text-gray-500 items-center">
                      <span className="flex items-center justify-center gap-1">
                        <div className="w-5 h-5 rounded-full bg-indigo-50 text-[10px] flex items-center justify-center text-indigo-400 border border-indigo-100">👤</div>
                        {post.authorUsername}
                      </span>
                      <span className="text-gray-400">{post.createdAt?.split(' ')[0]}</span>
                      {/* ★ 16 대신 post.viewCount 사용 */}
                      <span>{post.viewCount || 0}</span>
                      <span className="font-bold text-gray-900">{post.likesCount || 0}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 text-gray-400 font-medium">
                  해당 카테고리에 게시글이 존재하지 않습니다.
                </div>
              )}
            </div>

            {/* 페이지네이션 UI */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 pt-6">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm text-gray-400 disabled:opacity-30 hover:text-green-600"
                >
                  이전
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${
                      currentPage === i + 1 
                        ? 'bg-green-600 text-white shadow-md shadow-green-100' 
                        : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm text-gray-400 disabled:opacity-30 hover:text-green-600"
                >
                  다음
                </button>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};

export default ArticleListPage;