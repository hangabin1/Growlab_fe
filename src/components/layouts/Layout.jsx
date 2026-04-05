import Footer from "./Footer";
import Header from "./Header";

function Layout({ children }) {
    return (
        <div className="min-h-screen flex flex-col">
            <Header />
                <main className="flex-grow container mx-auto p-4">
                    {children}
                </main>
            <Footer />
        </div>
    )
}

export default Layout;