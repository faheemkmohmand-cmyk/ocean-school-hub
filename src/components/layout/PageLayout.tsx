import { ReactNode } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ScrollToTop from "../shared/ScrollToTop";
import { MessageCircle } from "lucide-react";

const WhatsAppFloat = () => (
  <a
    href="https://wa.me/923469898295"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Chat with us on WhatsApp"
    className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-elevated hover:scale-110 hover:shadow-2xl transition-all duration-300 group"
  >
    <MessageCircle className="w-7 h-7 text-white fill-white" />
    {/* Tooltip */}
    <span className="absolute right-16 bg-[#25D366] text-white text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg pointer-events-none">
      Chat on WhatsApp
    </span>
    {/* Pulse ring */}
    <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-30" />
  </a>
);

const PageLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <ScrollToTop />
      <WhatsAppFloat />
    </div>
  );
};

export default PageLayout;
