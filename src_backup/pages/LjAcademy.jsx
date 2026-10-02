import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, MonitorPlay, Award, Target, ArrowRight, BookOpen, Clock, Scale, FileText, Edit3, Library, Briefcase, Trophy, Sparkles } from 'lucide-react';

// Import your existing global components
import Navbar from '../components/landing/sections/Navbar';
import Footer from '../components/landing/sections/Footer';
import FAQSection from '../components/landing/sections/FAQSection';
import ScrollReveal from '../components/landing/ScrollReveal';
import LenisProvider from '../components/landing/LenisProvider';

const STUDENT_FEATURES = [
    { 
        icon: Scale, title: "AI Live Courtroom", desc: "Practice real courtroom proceedings with AI judges and opposing counsel, receiving instant feedback to sharpen your advocacy skills.",
        colorClasses: { cardBorder: "hover:border-blue-300", gradient: "from-blue-50/80", iconBg: "group-hover:from-blue-500 group-hover:to-blue-600", title: "group-hover:text-blue-700" }
    },
    { 
        icon: FileText, title: "Moot Memorial Lab", desc: "Build professional moot memorials with AI-assisted legal research, argument structuring, and drafting guidance designed for law students.",
        colorClasses: { cardBorder: "hover:border-purple-300", gradient: "from-purple-50/80", iconBg: "group-hover:from-purple-500 group-hover:to-purple-600", title: "group-hover:text-purple-700" }
    },
    { 
        icon: Edit3, title: "Smart Drafting Learn Mode", desc: "Master legal drafting through step-by-step AI explanations that teach the purpose behind every clause while improving your drafting skills.",
        colorClasses: { cardBorder: "hover:border-emerald-300", gradient: "from-emerald-50/80", iconBg: "group-hover:from-emerald-500 group-hover:to-emerald-600", title: "group-hover:text-emerald-700" }
    },
    { 
        icon: BookOpen, title: "AI Legal Notebook", desc: "Upload judgments, bare acts, and notes to chat with your documents, generate case briefs, and receive answers with precise legal citations.",
        colorClasses: { cardBorder: "hover:border-amber-300", gradient: "from-amber-50/80", iconBg: "group-hover:from-amber-500 group-hover:to-amber-600", title: "group-hover:text-amber-700" }
    },
    { 
        icon: Library, title: "Bare Acts AI", desc: "Understand complex legal provisions through simplified explanations, landmark judgments, and intelligent cross-references.",
        colorClasses: { cardBorder: "hover:border-rose-300", gradient: "from-rose-50/80", iconBg: "group-hover:from-rose-500 group-hover:to-rose-600", title: "group-hover:text-rose-700" }
    },
    { 
        icon: Target, title: "Exam & Moot Preparation", desc: "Prepare for CLAT PG, Judiciary, AIBE, and university exams with AI-powered mock tests, flashcards, and practice questions.",
        colorClasses: { cardBorder: "hover:border-cyan-300", gradient: "from-cyan-50/80", iconBg: "group-hover:from-cyan-500 group-hover:to-cyan-600", title: "group-hover:text-cyan-700" }
    },
    { 
        icon: Briefcase, title: "Internship & Career Hub", desc: "Discover verified internships, build an ATS-ready legal CV, earn certifications, and connect with experienced mentors.",
        colorClasses: { cardBorder: "hover:border-indigo-300", gradient: "from-indigo-50/80", iconBg: "group-hover:from-indigo-500 group-hover:to-indigo-600", title: "group-hover:text-indigo-700" }
    },
    { 
        icon: Trophy, title: "Certifications & Leaderboards", desc: "Earn verifiable DraftMate certifications, showcase your legal achievements, and compete with students nationwide.",
        colorClasses: { cardBorder: "hover:border-orange-300", gradient: "from-orange-50/80", iconBg: "group-hover:from-orange-500 group-hover:to-orange-600", title: "group-hover:text-orange-700" }
    },
];

/* ─────────────────────────────────────────────────────────────
   Updated Course & Faculty Data (Native Indian Context)
───────────────────────────────────────────────────────────── */
const COURSES = [
    {
        id: 1,
        title: "AI Legal Drafting Fundamentals",
        duration: "2 Hours",
        price: "₹499",
        img: "/ljacademy/courses/fundamentals.png" // Law books/gavel
    },
    {
        id: 2,
        title: "Draft Contracts 10x Faster with AI",
        duration: "3 Hours",
        price: "₹999",
        img: "/ljacademy/courses/contract.png" // Indian business professionals meeting
    },
    {
        id: 3,
        title: "Master Legal Prompt Engineering",
        duration: "2.5 Hours",
        price: "₹799",
        img: "/ljacademy/courses/prompt_eng.png"
    },
    {
        id: 4,
        title: "AI-Powered Notice & Legal Letter Drafting",
        duration: "2 Hours",
        price: "₹699",
        img: "/ljacademy/courses/draft_doc.png" // Documents and typing
    },
    {
        id: 5,
        title: "Draft Your First Contract in Under 30 Minutes",
        duration: "90 Minutes",
        price: "₹599",
        img: "/ljacademy/courses/30_min.png" // Quick work desk
    },
    {
        id: 6,
        title: "AI for Law Students & Junior Associates",
        duration: "4 Hours",
        price: "₹1,499",
        img: "/ljacademy/courses/student.png" // Indian university students
    },
];

const FACULTY = [
    {
        id: 1,
        name: "Dr. Rajesh Desai",
        role: "Associate Professor of Constitutional Law",
        // Senior professional Indian male
        img: "/ljacademy/faculty/f3.png"
    },
    {
        id: 2,
        name: "Prof. Meera Menon",
        role: "Assistant Professor of Corporate Law",
        // Professional Indian female in business attire
        img: "/ljacademy/faculty/f1.png"
    },
    {
        id: 3,
        name: "Dr. Sanjay Verma",
        role: "Assistant Professor of Criminal Law",
        // Young professional Indian male
        img: "/ljacademy/faculty/f4.png"
    },
    {
        id: 4,
        name: "Prof. Kavita Iyer",
        role: "Professor of Human Rights Law",
        // Senior professional Indian female
        img: "/ljacademy/faculty/f2.png"
    },
];

const FEATURES = [
    { icon: Users, title: "Community & Networking", desc: "Interact, discuss, and network with like-minded individuals in exclusive chat groups." },
    { icon: MonitorPlay, title: "Live Interactions", desc: "Learn live with top educators, engage in interactive chats with teachers and fellow attendees." },
    { icon: Target, title: "Structured Learning", desc: "Our expertly curated structured curriculum provides you with a comprehensive understanding." },
    { icon: Award, title: "Get Certified", desc: "Our expert-designed curriculum ensures you receive the best learning experience and certificate." },
];

const TypingSubtitle = ({ text, delay = 0 }) => {
    const [displayedText, setDisplayedText] = useState("");
    
    useEffect(() => {
        let i = 0;
        let timeout;
        let interval;
        const startTyping = () => {
            interval = setInterval(() => {
                setDisplayedText(text.substring(0, i + 1));
                i++;
                if (i >= text.length) clearInterval(interval);
            }, 50);
        };
        if (delay > 0) {
            timeout = setTimeout(() => {
                startTyping();
            }, delay);
        } else {
            startTyping();
        }
        return () => {
            if (timeout) clearTimeout(timeout);
            if (interval) clearInterval(interval);
        };
    }, [text, delay]);

    return (
        <span className="inline-block">
            {displayedText}
            {displayedText.length < text.length && (
                <motion.span 
                    animate={{ opacity: [1, 0, 1] }} 
                    transition={{ repeat: Infinity, duration: 0.8 }} 
                    className="font-light text-blue-500 ml-1"
                >|</motion.span>
            )}
        </span>
    );
};

export default function LjAcademy() {
    const location = useLocation();
    const isDashboard = window.location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/dashboard');
    console.log("LJ Academy Render: pathname =", window.location.pathname, "routerPath =", location.pathname, "isDashboard =", isDashboard);

    const content = (
        <main className="flex flex-col bg-[#F8FAFF] min-h-screen">
                {!isDashboard && <Navbar />}

                {/* ── DRAFTMATE STUDENT CENTER (COMING SOON) ── */}
                <section className={`pb-16 lg:pb-20 relative overflow-hidden ${isDashboard ? 'pt-24' : 'pt-40 lg:pt-48'}`}>
                    {/* Infinite Marquee Banner */}
                    <div className="absolute top-10 left-0 w-full overflow-hidden bg-amber-300 py-3 z-20 shadow-lg -rotate-1 scale-110 border-y border-amber-400">
                        <div className="flex w-max animate-marquee-right items-center gap-10" style={{ willChange: "transform" }}>
                            {Array(15).fill("COMING SOON").map((text, i) => (
                                <div key={i} className="flex items-center gap-10">
                                    <span className="text-[13px] tracking-[0.3em] font-black text-amber-900 uppercase whitespace-nowrap">
                                        {text}
                                    </span>
                                    <Sparkles className="w-4 h-4 text-amber-700" />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-amber-400/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
                    
                    <div className="container-xl px-5 md:px-10 mx-auto max-w-7xl relative z-10 text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                            className="max-w-3xl mx-auto space-y-6"
                        >
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#0F1C2E] leading-[1.15]">
                                DraftMate <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Student Center</span>
                            </h1>
                            
                            <p className="text-[#475569] text-lg leading-relaxed md:text-xl min-h-[60px]">
                                <TypingSubtitle 
                                    text="The ultimate AI-powered ecosystem designed exclusively for law students. Prepare for exams, practice moot courts, and build your career with next-generation legal technology." 
                                    delay={600} 
                                />
                            </p>
                        </motion.div>
                    </div>
                </section>

                <section className="py-16 bg-white border-y border-slate-200/60">
                    <div className="container-xl px-5 md:px-10 mx-auto max-w-7xl">
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {STUDENT_FEATURES.map((feat, i) => (
                                <ScrollReveal key={i} delay={i * 50}>
                                    <div className={`group bg-[#F8FAFF] p-8 rounded-2xl border border-slate-100 h-full hover:shadow-2xl hover:-translate-y-2 ${feat.colorClasses.cardBorder} transition-all duration-500 relative overflow-hidden`}>
                                        <div className={`absolute inset-0 bg-gradient-to-br ${feat.colorClasses.gradient} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />
                                        <div className="relative z-10">
                                            <div className={`w-14 h-14 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm flex items-center justify-center mb-6 text-blue-600 border border-blue-200/50 group-hover:scale-110 ${feat.colorClasses.iconBg} group-hover:text-white group-hover:border-transparent group-hover:shadow-lg transition-all duration-300`}>
                                                <feat.icon className="w-7 h-7" strokeWidth={1.5} />
                                            </div>
                                            <h4 className={`font-bold text-[#0F1C2E] text-lg mb-3 leading-tight ${feat.colorClasses.title} transition-colors`}>{feat.title}</h4>
                                            <p className="text-sm text-[#475569] leading-relaxed group-hover:text-[#334155] transition-colors">{feat.desc}</p>
                                        </div>
                                    </div>
                                </ScrollReveal>
                            ))}
                        </div>

                        {/* Notification CTA */}
                        <ScrollReveal delay={400}>
                            <div className="mt-16 bg-gradient-to-r from-[#0F1C2E] to-blue-900 rounded-3xl p-10 text-center text-white shadow-2xl relative overflow-hidden hover:scale-[1.02] transition-transform duration-500 group">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                                <div className="relative z-10 max-w-2xl mx-auto">
                                    <h3 className="text-2xl md:text-3xl font-black mb-4">Want early access?</h3>
                                    <p className="text-blue-100 mb-8">Join the waitlist to be the first to experience the DraftMate Student Center when we launch.</p>
                                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                        <input 
                                            type="email" 
                                            placeholder="Enter your student email address" 
                                            className="px-6 py-3.5 rounded-xl text-[#0F1C2E] w-full sm:w-96 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                        />
                                        <button className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-8 rounded-xl transition-colors whitespace-nowrap shadow-lg shadow-blue-900/50">
                                            Join Waitlist
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </ScrollReveal>
                    </div>
                </section>
            </main>
    );

    // Only use Lenis smooth-scroll on the public landing page.
    // Inside the dashboard the scroll container is a nested div, not window —
    // Lenis blocks touch/finger scrolling while the scrollbar still works.
    if (isDashboard) return content;
    return <LenisProvider>{content}</LenisProvider>;
}