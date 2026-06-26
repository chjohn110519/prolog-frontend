import { useState } from 'react';
import ChatView from './ChatView';

function App() {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <div className="bg-slate-50 min-h-screen relative text-slate-800 antialiased overflow-x-hidden">
      {/* Decorative background blobs (Fixed to viewport) */}
      <div className="fixed top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-gradient-to-br from-green-400 to-emerald-200 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 float-anim pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[35rem] h-[35rem] bg-gradient-to-tl from-teal-300 to-green-500 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 float-anim pointer-events-none z-0" style={{ animationDelay: '2s' }}></div>

      <div className="relative z-10 container mx-auto px-6 py-8 md:py-12 min-h-screen flex flex-col break-keep">
        {/* Navigation */}
        <nav className="flex justify-between items-center glass-panel px-6 py-4 md:px-8 rounded-2xl shadow-sm mb-12 animate-fade-in-down sticky top-6 z-50">
          <div 
            onClick={() => setActiveTab('home')}
            className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-teal-500 tracking-tight cursor-pointer hover:opacity-80 transition-opacity"
          >
            ProLog.
          </div>
          <div className="hidden md:flex gap-8 font-semibold text-sm text-slate-500">
            <button 
                onClick={() => setActiveTab('home')} 
                className={`hover:text-green-600 transition-colors ${activeTab === 'home' ? 'text-green-600 font-bold' : ''}`}
            >
                Home
            </button>
            <button 
                onClick={() => setActiveTab('features')} 
                className={`hover:text-green-600 transition-colors ${activeTab === 'features' ? 'text-green-600 font-bold' : ''}`}
            >
                Core Features
            </button>
            <button className="hover:text-green-600 transition-colors">Pricing</button>
          </div>
          <div className="flex gap-4">
            <button 
                onClick={() => setActiveTab('chat')} 
                className={`hidden md:flex items-center gap-2 hover:text-green-600 transition-colors font-semibold text-sm ${activeTab === 'chat' ? 'text-green-600' : 'text-slate-500'}`}
            >
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> MVP Test
            </button>
            <button 
               onClick={() => setActiveTab('chat')}
               className="px-5 py-2 md:px-6 md:py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium rounded-xl shadow-lg hover:shadow-green-500/30 md:hover:-translate-y-0.5 transition-all duration-300 text-sm whitespace-nowrap"
            >
               MVP 테스트 시작하기
            </button>
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col">
          {activeTab === 'home' && <HomeView setActiveTab={setActiveTab} />}
          {activeTab === 'features' && <FeaturesView />}
          {activeTab === 'chat' && <ChatView />}
        </main>
      </div>
    </div>
  );
}

// ==========================================
// HOME VIEW 
// ==========================================
function HomeView({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  return (
    <div className="flex flex-col animate-fade-in">
        <div className="flex flex-col items-center text-center max-w-5xl mx-auto mt-8 md:mt-16 relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel text-sm font-semibold text-green-700 mb-8 shadow-sm cursor-pointer hover:bg-white/80 transition-colors">
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
                  onClick={() => setActiveTab('chat')}
                  className="px-8 py-4 bg-slate-800 text-white font-semibold rounded-2xl shadow-xl shadow-slate-800/20 hover:-translate-y-1 active:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2 group whitespace-nowrap"
                >
                    MVP 테스트 시작하기 🚀
                </button>
                <button 
                  onClick={() => setActiveTab('features')}
                  className="px-8 py-4 bg-white text-slate-700 font-semibold rounded-2xl shadow-md border border-slate-100 hover:border-green-200 hover:text-green-600 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2 group whitespace-nowrap"
                >
                    핵심 기능 알아보기
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
                <div key={i} className="glass-panel p-8 rounded-3xl hover:-translate-y-2 transition-all duration-500 group cursor-default h-full">
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

// ==========================================
// FEATURES VIEW 
// ==========================================
function FeaturesView() {
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      id: 0,
      title: "프롬프트 고민 로그 기록기",
      icon: "🕵️‍♂️",
      description: "학생이 처음 입력한 '원시적인 질문'부터 최종 결과가 도출되기까지 거친 수많은 AI와의 티키타카(질의응답 과정)를 타임라인으로 투명하게 시각화합니다.",
      benefits: ["결과물이 아닌 질문 도출 과정을 인증", "과제 맥락 이해도 점검 기능", "시간 흐름에 따른 사고 확장을 다이어그램화"],
      color: "from-green-400 to-emerald-500",
      lightBg: "bg-green-50"
    },
    {
      id: 1,
      title: "질의 심층도(Quality) 분석 엔진",
      icon: "📊",
      description: "내용 요약이나 번역 등 '단순 노동성 질문'과 비판적 사고가 담긴 '창의적 질문'을 분석해 냅니다. 이를 기반으로 학생의 사고 깊이를 데이터화하여 제시합니다.",
      benefits: ["단순 복붙형 질문 필터링", "비판적 논의 비율 스코어링", "학생 스스로의 질문 개선 추천 프롬프트"],
      color: "from-emerald-400 to-teal-500",
      lightBg: "bg-emerald-50"
    },
    {
      id: 2,
      title: "사고 증명 기반 성적 평가서 발급",
      icon: "🎓",
      description: "모두가 AI로 완벽한 리포트를 추출해 내는 시대. 이젠 결과물이 아니라 '탐구 과정을 진짜 거쳤는지' 증명하는 위변조 불가능한 인증 마크를 교수에게 제출하도록 돕습니다.",
      benefits: ["결과-과정 로그 일치율(Authenticity) 체크", "교수자용 데이터 대시보드 연동", "AI 시대의 공정성 높은 제출 양식 제공"],
      color: "from-teal-400 to-cyan-500",
      lightBg: "bg-teal-50"
    }
  ];

  return (
    <div className="animate-fade-in flex-1 flex flex-col mb-12">
      <div className="text-center mb-16 mt-4">
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-slate-800">
          결과보다 <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-teal-500">생각의 과정</span>을 설계합니다
        </h2>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium">
          생각하는 근육의 퇴화를 막고, 결과물 속 진짜 '나의 노력'을 입증해줄 대학 과제 전용 핵심 기능 3가지를 만나보세요.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-12 lg:gap-8 items-start relative max-w-6xl mx-auto w-full">
        
        {/* Left Side: Interactive Feature List */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4 relative z-10">
          {features.map((feature, idx) => {
            const isActive = activeFeature === idx;
            return (
              <button
                key={feature.id}
                onClick={() => setActiveFeature(idx)}
                className={`text-left p-6 rounded-3xl transition-all duration-500 relative overflow-hidden flex items-start gap-4 group
                  ${isActive 
                    ? `glass-panel shadow-xl ring-2 ring-green-400/30 md:translate-x-4 scale-[1.02]` 
                    : `bg-white/40 hover:bg-white/60 hover:shadow-md hover:scale-[1.01] border border-transparent`
                  }
                `}
              >
                {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-green-400 to-teal-500 rounded-l-3xl"></div>
                )}
                
                <div className={`text-3xl transition-transform duration-500 ${isActive ? 'scale-110 drop-shadow-md' : 'grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100'}`}>
                  {feature.icon}
                </div>
                <div>
                  <h3 className={`font-bold text-lg mb-1 transition-colors ${isActive ? 'text-slate-800' : 'text-slate-600'}`}>
                    {feature.title}
                  </h3>
                  <p className={`text-sm line-clamp-2 transition-colors ${isActive ? 'text-slate-600' : 'text-slate-400'}`}>
                    {feature.description}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Right Side: Feature Deep Dive (Bouncy Panel) */}
        <div className="w-full lg:w-2/3 lg:sticky lg:top-32 relative z-10">
          <div className="glass-panel rounded-[2.5rem] p-8 md:p-12 shadow-2xl transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] relative overflow-hidden h-full flex flex-col justify-between min-h-[460px]">
            <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl ${features[activeFeature].color} blur-[80px] opacity-20 transition-colors duration-700 pointer-events-none`}></div>
            
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center gap-4 mb-8">
                <div className={`w-16 h-16 rounded-2xl ${features[activeFeature].lightBg} flex items-center justify-center text-3xl shadow-inner transition-colors duration-500`}>
                  {features[activeFeature].icon}
                </div>
                <h3 className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-800 break-keep">
                  {features[activeFeature].title}
                </h3>
              </div>
              
              <p className="text-lg text-slate-600 leading-relaxed mb-8 break-keep">
                {features[activeFeature].description}
              </p>

              <div className="space-y-4 mb-10 w-full">
                <h4 className="font-semibold text-green-700 uppercase tracking-widest text-xs">핵심 기능 (Capabilities)</h4>
                <ul className="grid gap-3 w-full">
                  {features[activeFeature].benefits.map((benefit, i) => (
                    <li key={i} className="flex items-center gap-3 animate-fade-in-right" style={{ animationDelay: `${i * 100}ms` }}>
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                      </div>
                      <span className="text-slate-700 font-medium break-keep">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-auto pt-8 border-t border-slate-200/50 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-400">ProLog Education Verified</span>
                <button className={`px-6 py-2.5 rounded-xl text-white font-medium bg-gradient-to-r ${features[activeFeature].color} shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300`}>
                  기능 시뮬레이션
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
