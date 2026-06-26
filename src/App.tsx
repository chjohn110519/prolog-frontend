import ChatView from './ChatView';

function App() {
  const scrollToChat = () => {
    document.getElementById('mvp-test-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="bg-slate-50 min-h-screen relative text-slate-800 antialiased overflow-x-hidden">
      {/* Decorative background blobs (Fixed to viewport) */}
      <div className="fixed top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-gradient-to-br from-green-400 to-emerald-200 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 float-anim pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[35rem] h-[35rem] bg-gradient-to-tl from-teal-300 to-green-500 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 float-anim pointer-events-none z-0" style={{ animationDelay: '2s' }}></div>

      <div className="relative z-10 container mx-auto px-6 py-8 md:py-12 min-h-screen flex flex-col break-keep">
        {/* Navigation */}
        <nav className="flex justify-between items-center glass-panel px-6 py-4 md:px-8 rounded-2xl shadow-sm mb-12 animate-fade-in-down sticky top-6 z-50">
          <div 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-teal-500 tracking-tight cursor-pointer hover:opacity-80 transition-opacity"
          >
            ProLog.
          </div>
          <div className="flex gap-4">
            <button 
               onClick={scrollToChat}
               className="px-5 py-2 md:px-6 md:py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium rounded-xl shadow-lg hover:shadow-green-500/30 md:hover:-translate-y-0.5 transition-all duration-300 text-sm whitespace-nowrap"
            >
               MVP 테스트 시작하기
            </button>
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col gap-24">
          <HomeView scrollToChat={scrollToChat} />
          
          {/* Dedicated MVP Test Section */}
          <section id="mvp-test-section" className="scroll-mt-28 py-8">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 text-slate-800">
                사고 궤적 검증 <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-teal-500">MVP 시뮬레이터</span>
              </h2>
              <p className="text-sm md:text-base text-slate-500 max-w-xl mx-auto font-medium">
                과제 주제를 등록한 뒤 에이전트와 토론을 진행하십시오. 본인 확인 퀴즈 완료 시 공식 PDF 인증서가 자동 출력됩니다.
              </p>
            </div>
            <ChatView />
          </section>
        </main>
      </div>
    </div>
  );
}

// ==========================================
// HOME VIEW 
// ==========================================
function HomeView({ scrollToChat }: { scrollToChat: () => void }) {
  return (
    <div className="flex flex-col animate-fade-in">
        <div className="flex flex-col items-center text-center max-w-5xl mx-auto mt-8 md:mt-16 relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel text-sm font-semibold text-green-700 mb-8 shadow-sm cursor-pointer hover:bg-white/80 transition-colors" onClick={scrollToChat}>
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                AI 시대의 새로운 '성적 평가 표준' 인증 서비스
            </div>
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-tight mb-8">
                결과물의 완벽함 대신, <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 via-emerald-500 to-teal-400">
                    생각의 과정을 입증하다
                </span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-500 mb-10 max-w-3xl font-medium leading-relaxed">
                더 이상 AI에게 <strong>생각하는 근육</strong>을 외주화하지 마세요.<br className="hidden md:block"/> 결과 도출 과정을 투명하게 기록하고 질문의 질을 측정하여, 진짜 '나의 사고력'을 데이터로 증명하는 대학교 과제 및 학습 최적화 솔루션입니다.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                <button 
                  onClick={scrollToChat}
                  className="px-8 py-4 bg-slate-800 text-white font-semibold rounded-2xl shadow-xl shadow-slate-800/20 hover:-translate-y-1 active:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2 group whitespace-nowrap"
                >
                    MVP 테스트 시작하기 🚀
                </button>
            </div>
        </div>
        
        {/* Simplified Cards for Home */}
        <div className="grid md:grid-cols-3 gap-8 mt-24 max-w-6xl mx-auto relative z-10 w-full">
            {[ 
                { icon: "🧠", title: "퇴화 방지 트래킹", desc: "단순 복붙이 아닌, AI와의 상호작용 및 디벨롭 과정을 모두 기록합니다." },
                { icon: "💎", title: "질문 퀄리티 검증", desc: "표면적 요청과 심도 있는 비판적 사고의 질문을 구별해 퀄리티 데이터를 남깁니다." },
                { icon: "📜", title: "성적 평가 표준화", desc: "산출물이 아닌 탐구 과정을 입증하는 인증서로 공정한 평가 기준을 제시합니다." }
            ].map((card, i) => (
                <div 
                  key={i} 
                  onClick={scrollToChat}
                  className="glass-panel p-8 rounded-3xl hover:-translate-y-2 hover:border-green-300 hover:shadow-lg transition-all duration-500 group cursor-pointer h-full border border-transparent"
                >
                    <div className="w-14 h-14 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner text-2xl group-hover:scale-110 group-hover:bg-green-500 group-hover:text-white transition-all duration-300">
                        {card.icon}
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-slate-800">{card.title}</h3>
                    <p className="text-slate-500 font-medium">{card.desc}</p>
                </div>
            ))}
        </div>
    </div>
  )
}

export default App;
