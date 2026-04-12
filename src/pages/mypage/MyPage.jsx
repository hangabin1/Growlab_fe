function MyPage() {
    const username = localStorage.getItem("username");

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                <div className="text-5xl mb-4">🌱</div>
                <h1 className="text-2xl font-bold text-gray-800 mb-1">{username}</h1>
                <p className="text-sm text-gray-400">GrowLab 회원</p>
            </div>
        </div>
    );
}

export default MyPage;