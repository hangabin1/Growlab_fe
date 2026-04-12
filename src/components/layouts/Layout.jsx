import Footer from "./Footer";
import Header from "./Header";

function Layout({ children }) {
    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />
                <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-6">
                    {children}
                </main>
            <Footer />
        </div>
    )
}

export default Layout;