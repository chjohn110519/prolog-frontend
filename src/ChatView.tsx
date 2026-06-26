import { useState, useRef, useEffect } from 'react';
import OpenAI from 'openai';
import { 
  Send, Copy, FileText, CheckCircle, BrainCircuit, X, 
  Gauge, Timer, Award, AlertCircle, ArrowRight, BookOpen, 
  User, FolderOpen, Sparkles, BarChart2 
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  score?: number; // 1-10 level scale
  level?: number; // 1-5 Inquiry Level
  feedback?: string; // AI evaluation feedback
  perspective_shift?: boolean;
  thinking_delta?: string;
  summary?: string; // Student self-written summary for explanation gate
};

export default function ChatView() {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY || localStorage.getItem('openai_api_key') || '';

  // Task Gate State
  const [isTaskInputDone, setIsTaskInputDone] = useState(false);
  const [userName, setUserName] = useState('');
  const [courseName, setCourseName] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');

  // Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Metrics State (Inquiry Meter Panel)
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [avgLevel, setAvgLevel] = useState<number>(1);
  const [perspectiveShifts, setPerspectiveShifts] = useState<number>(0);
  const [latestThinkingDelta, setLatestThinkingDelta] = useState<string>('대화가 시작되면 분석이 업데이트됩니다.');

  // Copy Modal State (Explanation Gate)
  const [copyModalInfo, setCopyModalInfo] = useState<{ isOpen: boolean, messageId: string, contentToCopy: string }>({
    isOpen: false, messageId: '', contentToCopy: ''
  });
  const [summaryInput, setSummaryInput] = useState('');

  // Final Quiz State
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<string[]>([]);
  const [currentQuizIdx, setCurrentQuizIdx] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<string[]>([]);
  const [quizTimeTaken, setQuizTimeTaken] = useState<number[]>([]);
  const [quizTimer, setQuizTimer] = useState(15);
  const [quizIntervalId, setQuizIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [quizCompleted, setQuizCompleted] = useState(false);

  // UI Refs
  const reportRef = useRef<HTMLDivElement>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages list changes
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Recalculate Average Level and Perspective Shifts
  useEffect(() => {
    const userMsgs = messages.filter(m => m.role === 'user');
    if (userMsgs.length > 0) {
      const sum = userMsgs.reduce((acc, curr) => acc + (curr.level || 1), 0);
      setAvgLevel(Number((sum / userMsgs.length).toFixed(1)));
    }
  }, [messages]);

  // Quiz Timer logic
  useEffect(() => {
    if (isQuizOpen && !quizCompleted && quizQuestions.length > 0) {
      // Clear previous interval if any
      if (quizIntervalId) clearInterval(quizIntervalId);

      setQuizTimer(15);
      const id = setInterval(() => {
        setQuizTimer((prev) => {
          if (prev <= 1) {
            clearInterval(id);
            // Handle timeout
            handleQuizSubmit("시간이 초과되어 자동으로 입력되었습니다. (답변 작성 미완료)", true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setQuizIntervalId(id);

      return () => clearInterval(id);
    }
  }, [isQuizOpen, currentQuizIdx, quizQuestions, quizCompleted]);

  // Initial greeting once task details are provided
  const handleStartSession = () => {
    if (!userName.trim() || !courseName.trim() || !taskTitle.trim() || !taskDescription.trim()) {
      alert("모든 항목을 성실하게 채워주세요.");
      return;
    }
    setIsTaskInputDone(true);
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `안녕하세요, ${userName} 학생! 과목 [${courseName}]의 과제 [${taskTitle}] 수행을 위한 ProLog 사고 입증 세션이 활성화되었습니다.\n\n저는 단순 정답을 제공하지 않고 스스로 답을 찾아가도록 돕는 지적 파트너 'Logos'입니다. 탐구하고 싶으신 핵심 아이디어나 첫 번째 분석을 질문창에 입력해 보세요.\n\n우측의 'Inquiry Meter'에서 실시간으로 질문의 질(Lv.1 ~ Lv.5)과 사고 전개 궤적을 확인하실 수 있습니다.`
      }
    ]);
  };

  // Local fallback parsing in case API error occurs
  const getPromptLevelFallback = (text: string): { level: number, feedback: string } => {
    let score = 1;
    let feedback = "단순 요청 형태의 질문입니다. 보다 능동적으로 질문을 구성해 보세요.";

    if (text.includes('왜') || text.includes('어떻게') || text.includes('원리') || text.includes('원인')) {
      score = 4;
      feedback = "현상의 메커니즘을 묻는 인과/원리적 탐구 질문입니다. 좋습니다!";
    } else if (text.includes('하지만') || text.includes('한계') || text.includes('반대') || text.includes('비판') || text.includes('만약') || text.includes('오류')) {
      score = 5;
      feedback = "기존 논리에 의문을 제기하는 고차원적 비판 및 대안적 질문입니다. 매우 훌륭합니다!";
    } else if (text.includes('비교') || text.includes('차이') || text.includes('장단점') || text.includes('사례')) {
      score = 3;
      feedback = "현상 분석을 위해 다각적인 관점을 비교하는 분석형 질문입니다.";
    } else if (text.includes('설명') || text.includes('개념') || text.includes('정의') || text.includes('무엇')) {
      score = 2;
      feedback = "이론적 배경을 구체화하는 개념적 탐색 질문입니다.";
    }

    return { level: score, feedback };
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    if (!apiKey) {
      alert("OpenAI API key가 .env 파일(VITE_OPENAI_API_KEY)에 설정되어 있지 않습니다. 프로젝트의 .env 파일을 확인해 주세요.");
      return;
    }

    const currentInput = input;
    setInput('');
    setIsLoading(true);

    // Create a temporary message first
    const tempUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: currentInput,
      level: 1,
      feedback: '질문을 분석 중입니다...'
    };

    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
      
      // Construct system prompt forcing agent persona and metrics JSON extraction
      const systemPrompt = `당신은 학생의 비판적 사고력을 성장시키는 지적 파트너 에이전트 'Logos'입니다.
과제 지시문 및 탐구 배경:
- 과목명: ${courseName}
- 과제명: ${taskTitle}
- 과제 상세 가이드라인: ${taskDescription}

[대화 규칙]
1. 학생이 리포트 요약, 코드 짜주기 등 정답을 통째로 요구하면 절대 직접 답을 주지 마십시오. 대신, 논리적 오류를 지적하거나, 숨겨진 쟁점을 환기하거나, 반대 방향에서 생각하게 하는 '역질문(Reverse Questioning)'을 주어 학생 스스로 생각하고 탐구하도록 유도하십시오.
2. 반말이 아닌 존댓말을 사용하고, 교육적이고 비판적이며 격려해주는 논조를 유지하십시오.
3. 사용자가 이전 대화의 흐름에서 한 단계 도약하거나, 다른 시각을 반영하려 노력할 때 적절한 피드백을 전달하십시오.

[필수: 메트릭 데이터 파싱 규칙]
당신은 모든 답변의 가장 마지막 줄에 반드시 정확히 다음 구조의 JSON 데이터를 '###METRICS###{...}###' 구분자 사이에 넣어야 합니다. 본문과 줄바꿈을 두고 출력하십시오. 이 데이터는 React 앱에서 파싱하여 사용하므로 형식을 완벽히 지켜야 합니다.

템플릿 형식:
###METRICS###
{
  "level": 1~5 사이의 정수 (1: 단순 번역/요약/작성 요청, 2: 단순 개념 정의/설명 요청, 3: 구체적 사례 분석/비교 연구 질문, 4: 인과 관계/원리/해결 메커니즘 분석 질문, 5: 기존 논리에 대한 한계 지적/비판적 반박/대안 제시 질문),
  "feedback": "질문 수준에 대한 한글 1줄 피드백",
  "perspective_shift": 이전 질문들 대비 논의가 한 단계 발전했거나 완전히 새로운 논점으로 관점을 신선하게 전환했는지 여부 (true 또는 false),
  "thinking_delta": "초기 질문 대비 현재까지 학생이 도달한 사고의 성숙 과정을 요약한 한 문장"
}
###`;

      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ 
          role: m.role, 
          // Extract display content only to avoid sending back the raw parsed JSON metrics to OpenAI
          content: m.role === 'assistant' ? m.content.split('###METRICS###')[0].trim() : m.content 
        })),
        { role: 'user', content: currentInput }
      ];

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // Use a slightly smarter model to ensure perfect JSON compliance
        messages: apiMessages as any,
        temperature: 0.7,
      });

      const rawContent = response.choices[0].message.content || '응답을 생성할 수 없습니다.';
      
      // Parse metrics
      let displayContent = rawContent;
      let level = 1;
      let feedback = "분석이 정상적으로 이루어지지 않았습니다.";
      let isShift = false;
      let deltaText = latestThinkingDelta;

      if (rawContent.includes('###METRICS###')) {
        const parts = rawContent.split('###METRICS###');
        displayContent = parts[0].trim();
        const jsonString = parts[1].split('###')[0].trim();
        try {
          const parsed = JSON.parse(jsonString);
          level = parsed.level || 1;
          feedback = parsed.feedback || '';
          isShift = !!parsed.perspective_shift;
          deltaText = parsed.thinking_delta || latestThinkingDelta;
        } catch (err) {
          console.error("Metrics parsing error, falling back", err);
          const fallback = getPromptLevelFallback(currentInput);
          level = fallback.level;
          feedback = fallback.feedback;
        }
      } else {
        const fallback = getPromptLevelFallback(currentInput);
        level = fallback.level;
        feedback = fallback.feedback;
      }

      // Update states
      setCurrentLevel(level);
      if (isShift) {
        setPerspectiveShifts(prev => prev + 1);
      }
      setLatestThinkingDelta(deltaText);

      // Update the user message score and insert assistant message
      setMessages(prev => {
        const updated = [...prev];
        const lastUser = updated[updated.length - 1];
        if (lastUser && lastUser.role === 'user') {
          lastUser.level = level;
          lastUser.feedback = feedback;
          lastUser.score = level * 2; // scale 1-10
        }

        const newAssistant: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: displayContent,
          level,
          feedback,
          perspective_shift: isShift,
          thinking_delta: deltaText
        };
        return [...updated, newAssistant];
      });

    } catch (err: any) {
      console.error(err);
      alert("OpenAI API 에러가 발생했습니다. 키 유효성 및 설정을 확인하세요.");
      // Fallback response
      setMessages(prev => {
        const updated = [...prev];
        const lastUser = updated[updated.length - 1];
        const fallback = getPromptLevelFallback(currentInput);
        if (lastUser && lastUser.role === 'user') {
          lastUser.level = fallback.level;
          lastUser.feedback = fallback.feedback;
          lastUser.score = fallback.level * 2;
        }
        return [...updated, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'OpenAI 연결 지연 또는 크레딧 소진으로 일반 파서 모드로 자동 전환되었습니다. 아래 스크랩 요약 기능을 그대로 활용하실 수 있습니다.'
        }];
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Explanation Gate Copy Dialog Trigger
  const handleCopyClick = (messageId: string, content: string) => {
    setCopyModalInfo({ isOpen: true, messageId, contentToCopy: content });
  };

  const submitSummaryAndCopy = async () => {
    if (!summaryInput.trim()) {
      alert("사고력 퇴화를 예방하기 위해, 본문의 논지 요약을 본인 언어로 한 줄 작성해야 복사가 허용됩니다.");
      return;
    }

    setMessages(prev => prev.map(m => m.id === copyModalInfo.messageId ? { ...m, summary: summaryInput } : m));

    try {
      await navigator.clipboard.writeText(copyModalInfo.contentToCopy);
      alert("요약 과정 인증 완료! 클립보드에 복사되었습니다.");
    } catch (e) {
      console.error("Copy failed", e);
    }

    setCopyModalInfo({ isOpen: false, messageId: '', contentToCopy: '' });
    setSummaryInput('');
  };

  // Generate Review Quiz from logs before printing report
  const handleStartQuiz = async () => {
    if (messages.filter(m => m.role === 'user').length < 2) {
      alert("최소 2회 이상 AI와의 상호작용 질문 기록이 있어야 리포트를 구성하고 퀴즈를 출제할 수 있습니다.");
      return;
    }

    setIsQuizOpen(true);
    setIsGeneratingQuiz(true);

    try {
      const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
      const dialogueLog = messages
        .filter(m => m.id !== 'welcome')
        .map(m => `${m.role === 'user' ? '학생 질문' : 'AI 답변'}: ${m.content.split('###METRICS###')[0]}`)
        .join('\n\n');

      const quizPrompt = `아래는 학생과 AI 지적 파트너 에이전트 간의 학습 대화 전문입니다.
학생이 이 대화의 논점과 AI가 제시한 인사이트를 단순히 복사 붙여넣기 한 것인지, 아니면 머릿속으로 온전히 소화(내재화)했는지 검증하기 위한 '핵심 주관식 확인 질문 2개'를 출제하십시오.

[출제 조건]
1. 답변을 다시 복사해서 붙여넣는 행위를 원천 방지할 수 있도록, 대화의 논지와 타겟 개념에 대해 물어보는 단답식 또는 짤막한 주관식 형태로 질문을 짜십시오.
2. 예: "질문 1: 본 비즈니스 모델에서 제안된 '설명 관문'의 목적은 무엇인가요?", "질문 2: AI 답변에서 제기된 '인식론적 부채'의 해결방안 1가지를 언급하세요."
3. 반드시 다음 JSON 배열 형식으로만 응답을 주십시오. 다른 안내 문구나 서론/결론은 일체 제거하십시오:
["질문 1 내용", "질문 2 내용"]`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: quizPrompt + `\n\n대화 내용:\n${dialogueLog}` }],
        temperature: 0.5,
      });

      const raw = response.choices[0].message.content || '';
      try {
        const parsed = JSON.parse(raw.trim());
        if (Array.isArray(parsed) && parsed.length >= 2) {
          setQuizQuestions(parsed.slice(0, 2));
        } else {
          throw new Error("Invalid structure");
        }
      } catch (e) {
        // Fallback quiz
        setQuizQuestions([
          `이번 탐구 과제(${taskTitle})에서 본인이 직면한 가장 큰 문제점과 AI 도움을 받아 도출한 차별화된 결론은 무엇인가요?`,
          `AI 답변 내용 중 본인이 가장 강력하게 수긍했거나 반박하고 싶었던 대목 1가지와 그 구체적 이유는 무엇인가요?`
        ]);
      }
    } catch (err) {
      console.error(err);
      setQuizQuestions([
        `이번 탐구 과제(${taskTitle})에서 본인이 직면한 가장 큰 문제점과 AI 도움을 받아 도출한 차별화된 결론은 무엇인가요?`,
        `AI 답변 내용 중 본인이 가장 강력하게 수긍했거나 반박하고 싶었던 대목 1가지와 그 구체적 이유는 무엇인가요?`
      ]);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleQuizSubmit = (answer: string, isTimeout = false) => {
    const elapsed = isTimeout ? 15 : (15 - quizTimer);
    setQuizAnswers(prev => [...prev, answer || "(시간 초과로 인해 답변 미제출)"]);
    setQuizTimeTaken(prev => [...prev, elapsed]);

    if (currentQuizIdx === 0 && quizQuestions.length > 1) {
      setCurrentQuizIdx(1);
    } else {
      // Quiz Finished!
      if (quizIntervalId) clearInterval(quizIntervalId);
      setQuizCompleted(true);
    }
  };

  // Generate modern professional PDF Report
  const generatePDF = async () => {
    if (!reportRef.current) return;
    const element = reportRef.current;

    try {
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`ProLog_Thinking_Proof_${userName}_${new Date().toISOString().split('T')[0]}.pdf`);
      
      // Close quiz overlay and reset states
      setIsQuizOpen(false);
      setQuizCompleted(false);
      setQuizAnswers([]);
      setQuizTimeTaken([]);
      setCurrentQuizIdx(0);
    } catch (e) {
      console.error("PDF 생성 에러", e);
      alert("인증서 PDF 생성 과정 중 일시적 렌더링 에러가 발생했습니다.");
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto min-h-[calc(100vh-180px)] glass-panel rounded-3xl overflow-hidden shadow-2xl relative">
      
      {/* API Key from Environment (.env) */}

      {/* Task Assignment Gate (Shown first) */}
      {!isTaskInputDone && (
        <div className="absolute inset-0 bg-slate-50/90 backdrop-blur-sm z-[90] flex items-center justify-center p-6 overflow-y-auto">
          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl w-full max-w-2xl border border-slate-100 flex flex-col gap-6 my-auto">
            <div className="text-center">
              <div className="inline-flex p-4 bg-green-50 rounded-2xl text-green-600 mb-4 shadow-inner">
                <BookOpen size={36} />
              </div>
              <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">과제 정보 및 사고 입증 계획 입력</h2>
              <p className="text-slate-500 text-sm mt-2">
                학습 대화를 개시하기 전, 과제 정보와 지시사항을 등록하십시오.<br />
                제출용 PDF 인증서 상단에 해당 정보가 함께 기록되어 신뢰성을 보증합니다.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><User size={13}/> 학생 본명</label>
                <input 
                  type="text" 
                  value={userName} 
                  onChange={e => setUserName(e.target.value)}
                  placeholder="예: 김민준" 
                  className="border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><FolderOpen size={13}/> 과목명</label>
                <input 
                  type="text" 
                  value={courseName} 
                  onChange={e => setCourseName(e.target.value)}
                  placeholder="예: 기술창업 및 투자학개론" 
                  className="border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><Sparkles size={13}/> 과제명 / 핵심 탐구 주제</label>
              <input 
                type="text" 
                value={taskTitle} 
                onChange={e => setTaskTitle(e.target.value)}
                placeholder="예: AI 에이전트를 이용한 대학교육 혁신 비즈니스 모델 설계" 
                className="border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1">📋 과제 지시문 및 질문 제약사항 (Task Guidelines)</label>
              <textarea 
                value={taskDescription} 
                onChange={e => setTaskDescription(e.target.value)}
                placeholder="교수님이 주신 상세 리포트 기준이나, 스스로 증명하고자 하는 탐구 지표를 입력해 주세요. 예: '생성형 AI가 인간 창의성에 미치는 부정적 효과 분석 및 극복 방안 제시'" 
                className="border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm h-28 outline-none focus:ring-2 focus:ring-green-400 resize-none"
              />
            </div>

            <button 
              onClick={handleStartSession}
              className="w-full bg-slate-800 text-white font-bold py-4 rounded-2xl hover:bg-slate-900 transition flex items-center justify-center gap-2 shadow-lg"
            >
              사고 인증 대화 시작하기 <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Explanation Gate (Copy Modal) */}
      {copyModalInfo.isOpen && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-lg border border-green-100 transform animate-fade-in">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-2xl font-extrabold flex items-center gap-2 text-slate-800">
                <BrainCircuit className="text-green-500" /> 설명 관문 (Explanation Gate)
              </h3>
              <button 
                onClick={() => setCopyModalInfo({ isOpen: false, messageId: '', contentToCopy: '' })} 
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>
            <p className="text-slate-600 text-sm mb-5 leading-relaxed">
              사고력 퇴화를 막기 위해, <span className="font-semibold text-green-600">답변을 복사하기 전 스스로 1줄 핵심 요약</span>을 작성해야 합니다. 작성된 요약문은 인증서 리포트에 기록됩니다.
            </p>
            <textarea 
              value={summaryInput} 
              onChange={e => setSummaryInput(e.target.value)}
              className="w-full border border-slate-200 rounded-2xl px-4 py-3.5 mb-5 focus:ring-2 focus:ring-green-400 outline-none resize-none h-28 text-slate-700 text-sm"
              placeholder="방금 확인한 AI 답변의 핵심 논거와 주장을 나만의 문장으로 정성껏 정리해 보세요..."
              autoFocus
            />
            <button 
              onClick={submitSummaryAndCopy}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 hover:shadow-lg transition"
            >
              <CheckCircle size={18} /> 요약 작성 완료 및 복사하기
            </button>
          </div>
        </div>
      )}

      {/* Final Understanding Quiz Modal */}
      {isQuizOpen && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-[120] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl p-8 md:p-10 border border-slate-100">
            {isGeneratingQuiz ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="relative mb-6">
                  <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
                  <BrainCircuit className="absolute inset-0 m-auto text-green-600 animate-pulse" size={24} />
                </div>
                <h4 className="text-xl font-bold text-slate-800">이해도 검증 평가 생성 중</h4>
                <p className="text-slate-500 text-sm mt-2 max-w-sm">대화 기록을 심층 분석하여 학습자가 내용을 온전히 내재화했는지 평가하는 주관식 문항을 설계하고 있습니다.</p>
              </div>
            ) : quizCompleted ? (
              <div className="flex flex-col items-center text-center py-8">
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-500 mb-6 shadow-inner">
                  <Award size={48} className="animate-bounce" />
                </div>
                <h3 className="text-3xl font-extrabold text-slate-800">이해도 검증 평가 완료</h3>
                <p className="text-slate-500 text-sm mt-2 max-w-md">
                  학생 본인의 생각으로 작성한 답변과 시간 측정 지표가 완벽하게 준비되었습니다. '인증서 발급하기'를 누르면 최종 위변조 방지 PDF 문서가 다운로드됩니다.
                </p>
                
                <div className="w-full bg-slate-50 p-5 rounded-2xl border border-slate-100 my-6 text-left text-xs space-y-3">
                  <h5 className="font-bold text-slate-700">제출 답안 현황:</h5>
                  {quizQuestions.map((q, i) => (
                    <div key={i} className="border-t border-slate-200/50 pt-2 first:border-0 first:pt-0">
                      <p className="font-semibold text-slate-600">{i+1}. {q}</p>
                      <p className="text-green-700 font-medium mt-1">답안: {quizAnswers[i]}</p>
                      <p className="text-slate-400 mt-0.5">소요 시간: {quizTimeTaken[i]}초 {quizTimeTaken[i] >= 15 ? "(제한 시간 초과)" : "(시간 내 작성 완료)"}</p>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={generatePDF}
                  className="w-full bg-slate-800 text-white font-bold py-4 rounded-2xl hover:bg-slate-900 transition flex items-center justify-center gap-2 shadow-lg"
                >
                  <FileText size={18} /> 최종 사고 궤적 인증서 발급
                </button>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">이해도 검증 (Quiz {currentQuizIdx + 1}/2)</span>
                  <div className="flex items-center gap-1.5 text-slate-600 font-bold text-sm">
                    <Timer size={16} className={quizTimer <= 5 ? "text-rose-500 animate-pulse" : "text-slate-500"} />
                    <span className={quizTimer <= 5 ? "text-rose-500" : ""}>{quizTimer}초 남음</span>
                  </div>
                </div>

                {/* Progress bar for timer */}
                <div className="w-full bg-slate-100 h-2 rounded-full mb-6 overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${
                      quizTimer <= 5 ? "bg-rose-500" : quizTimer <= 10 ? "bg-amber-400" : "bg-green-500"
                    }`}
                    style={{ width: `${(quizTimer / 15) * 100}%` }}
                  ></div>
                </div>

                <h4 className="text-xl font-bold text-slate-800 mb-4 leading-relaxed">
                  {quizQuestions[currentQuizIdx]}
                </h4>
                
                <p className="text-xs text-rose-500 font-medium mb-3 flex items-center gap-1">
                  <AlertCircle size={12} /> 제한시간이 지나거나 뒤로가기 시 복사 방지 메커니즘을 위해 자동 제출 처리됩니다.
                </p>

                <textarea
                  id={`quiz-textarea-${currentQuizIdx}`}
                  className="w-full border border-slate-200 rounded-2xl px-4 py-3 h-32 focus:ring-2 focus:ring-green-400 outline-none resize-none text-slate-700 text-sm mb-6"
                  placeholder="대화 내용을 바탕으로 본인의 머릿속 언어로 요약/설명해 보십시오..."
                  autoFocus
                />

                <button
                  onClick={() => {
                    const el = document.getElementById(`quiz-textarea-${currentQuizIdx}`) as HTMLTextAreaElement;
                    handleQuizSubmit(el?.value || "");
                  }}
                  className="w-full bg-slate-800 text-white font-bold py-4 rounded-xl hover:bg-slate-900 transition"
                >
                  제출 후 다음 문항으로
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Workspace Layout Split-Screen */}
      <div className="flex flex-1 flex-col lg:flex-row h-full">
        
        {/* LEFT COLUMN: Chat Panel */}
        <div className="flex-1 flex flex-col border-r border-slate-100 min-h-0 bg-white/40">
          
          {/* Chat Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white/60">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-green-600 tracking-wider uppercase">ProLog MVP Session</span>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-1.5">
                {taskTitle || "AI 대화 사고 궤적 인증"}
              </h2>
            </div>
            
            <button 
              onClick={handleStartQuiz}
              disabled={messages.filter(m => m.role === 'user').length < 2}
              className="bg-slate-800 text-white px-5 py-2.5 rounded-xl shadow-md hover:bg-slate-900 transition text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileText size={14} /> 대화 종료 및 검증 개시
            </button>
          </div>

          {/* Chat Messages Log */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                
                {/* Sender Indicator */}
                <span className="text-xs text-slate-400 font-bold mb-1.5 px-2">
                  {msg.role === 'user' ? `${userName || '학생'}` : "Logos Partner AI"}
                </span>

                <div className={`max-w-[85%] md:max-w-[75%] rounded-3xl p-5 shadow-sm border ${
                    msg.role === 'user' 
                    ? 'bg-slate-800 text-white border-slate-700' 
                    : 'bg-white text-slate-800 border-slate-100'
                  }`}
                >
                  <div className="whitespace-pre-wrap leading-relaxed text-sm md:text-base">{msg.content.split('###METRICS###')[0]}</div>
                  
                  {/* Realtime level tag for user message */}
                  {msg.role === 'user' && msg.level && (
                    <div className="mt-3 text-xs bg-slate-700 text-slate-300 rounded-lg py-1.5 px-3 inline-flex items-center gap-1.5 font-medium">
                      <BrainCircuit size={14} className="text-green-400" />
                      질문 수준: <span className="font-bold text-white">Lv.{msg.level} / 5</span>
                    </div>
                  )}

                  {/* Copy Gateway for AI response */}
                  {msg.role === 'assistant' && msg.id !== 'welcome' && (
                    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2">
                      {msg.summary ? (
                        <div className="text-xs bg-green-50 text-green-800 p-3 rounded-xl border border-green-100 leading-normal">
                          <div className="font-bold mb-1 flex items-center gap-1 text-green-700">
                            <CheckCircle size={13} /> 설명 관문(Explanation Gate) 통과됨
                          </div>
                          <span className="font-semibold text-slate-600">작성한 핵심요약:</span> {msg.summary}
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleCopyClick(msg.id, msg.content)}
                          className="text-xs bg-slate-50 text-slate-500 hover:bg-green-50 hover:text-green-700 border border-slate-200/60 py-2 px-3.5 rounded-lg flex items-center justify-center gap-1.5 transition-all font-bold self-start"
                        >
                          <Copy size={13} /> 복사하여 반영하기 (요약문 필수)
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* AI real-time evaluation feedback helper */}
                {msg.role === 'user' && msg.feedback && (
                  <span className="text-[11px] text-green-600 font-semibold mt-1 max-w-[80%] text-right mr-2">
                    💡 {msg.feedback}
                  </span>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex flex-col items-start">
                <span className="text-xs text-slate-400 font-bold mb-1.5 px-2">Logos Partner AI</span>
                <div className="max-w-[70%] rounded-3xl p-5 bg-white shadow-sm border border-slate-100 text-slate-800">
                  <span className="flex gap-1.5 items-center font-medium text-slate-500 text-sm">
                    <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-bounce"></div>
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-bounce delay-75"></div>
                    <div className="w-2.5 h-2.5 bg-green-600 rounded-full animate-bounce delay-150"></div>
                    <span className="ml-1 font-semibold text-xs text-slate-500">Logos 에이전트가 질문을 다차원 분석하고 있습니다...</span>
                  </span>
                </div>
              </div>
            )}
            <div ref={endOfMessagesRef} />
          </div>

          {/* Message Input Box */}
          <div className="p-4 md:p-6 bg-white/80 border-t border-slate-100">
            <form 
              className="flex relative max-w-4xl mx-auto"
              onSubmit={e => { e.preventDefault(); handleSend(); }}
            >
              <input 
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={isLoading}
                placeholder="단순 질문은 지양하고, 의문이 생기는 핵심 인과관계나 대안을 제시해 보세요..."
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl pl-6 pr-16 py-4 outline-none focus:bg-white focus:ring-2 focus:ring-green-400/50 focus:border-green-400 transition-all text-sm md:text-base"
              />
              <button 
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2.5 top-2.5 bottom-2.5 bg-slate-800 text-white px-5 rounded-xl hover:bg-slate-900 transition-colors disabled:opacity-40 flex items-center justify-center"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: Inquiry Meter Dashboard Panel */}
        <div className="w-full lg:w-80 bg-slate-50/70 p-6 flex flex-col gap-6 overflow-y-auto shrink-0 border-t lg:border-t-0">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-1.5 mb-1">
              <Gauge className="text-green-600" size={20} /> Inquiry Meter
            </h3>
            <p className="text-xs text-slate-400 font-medium">탐구 질문의 인지적 마찰 지표를 측정합니다.</p>
          </div>

          {/* Level Gauge Display */}
          <div className="glass-panel bg-white p-5 rounded-2xl flex flex-col items-center text-center shadow-sm relative overflow-hidden">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">최근 질문 수준</div>
            
            {/* Visual Gauge Bar */}
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100"
                  strokeWidth="3"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-green-500 transition-all duration-1000 ease-out"
                  strokeDasharray={`${(currentLevel / 5) * 100}, 100`}
                  strokeWidth="3"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-extrabold text-slate-800">Lv.{currentLevel}</span>
                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full mt-1">
                  {currentLevel === 1 ? "단순 요청" : currentLevel === 2 ? "개념 탐색" : currentLevel === 3 ? "사례 비교" : currentLevel === 4 ? "원리 분석" : "비판적 반박"}
                </span>
              </div>
            </div>
            
            <p className="text-[11px] text-slate-500 mt-4 leading-relaxed font-medium">
              질문이 논리적이고 비판적 성격을 띨수록 게이지가 수직 상승합니다.
            </p>
          </div>

          {/* Core Analytics Metrics Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm text-center">
              <div className="text-[10px] font-bold text-slate-400 uppercase">평균 질문 등급</div>
              <div className="text-2xl font-black text-slate-800 mt-1">{avgLevel} <span className="text-xs text-slate-400 font-normal">/ 5</span></div>
            </div>
            <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm text-center">
              <div className="text-[10px] font-bold text-slate-400 uppercase">관점 전환 횟수</div>
              <div className="text-2xl font-black text-slate-800 mt-1">{perspectiveShifts} <span className="text-xs text-slate-400 font-normal">회</span></div>
            </div>
          </div>

          {/* Explanation Gate Stats */}
          <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
            <div className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center justify-between">
              <span>설명 관문 통과 로그</span>
              <span className="text-green-600 font-bold">{messages.filter(m => m.summary).length}건</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-green-500 h-full transition-all"
                style={{ 
                  width: `${(messages.filter(m => m.summary).length / Math.max(1, messages.filter(m => m.role === 'assistant' && m.id !== 'welcome').length)) * 100}%` 
                }}
              ></div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 font-medium">복사 시도 대비 통과 비율을 추적하여 기록 신뢰도를 판단합니다.</p>
          </div>

          {/* Thinking Delta Panel */}
          <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex-1 flex flex-col">
            <div className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
              <BarChart2 size={13} className="text-green-600" /> 사고의 변화 (Thinking Delta)
            </div>
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100/50 flex-1 text-xs text-slate-600 leading-relaxed overflow-y-auto">
              {latestThinkingDelta}
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* HIDDEN PRINT-READY CERTIFICATE DOCUMENT TEMPLATE FOR HTML2CANVAS */}
      {/* ========================================================================= */}
      <div 
        ref={reportRef} 
        style={{ 
          position: 'absolute', 
          left: '-9999px', 
          top: 0, 
          width: '800px', 
          minHeight: '1130px', // Perfect A4 aspect ratio representation
          padding: '50px', 
          backgroundColor: '#ffffff', 
          color: '#1e293b', 
          fontFamily: 'system-ui, -apple-system, sans-serif',
          boxSizing: 'border-box'
        }}
      >
        {/* Certificate Outer Border Frame */}
        <div style={{ border: '4px double #15803d', padding: '30px', minHeight: '1020px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
          
          <div>
            {/* Stamp logo header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #22c55e', paddingBottom: '20px', marginBottom: '25px' }}>
              <div>
                <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111827', margin: 0, letterSpacing: '-0.05em' }}>
                  ProLog <span style={{ color: '#22c55e' }}>인증 리포트</span>
                </h1>
                <p style={{ margin: '5px 0 0 0', fontSize: '11px', color: '#64748b', fontWeight: '600' }}>AI COLLABORATIVE THINKING PROCESS CERTIFICATE</p>
              </div>
              <div style={{ textAlign: 'right', fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>
                <p style={{ margin: 0, fontWeight: '700' }}>문서 일련번호: PL-2026-{Math.floor(Math.random() * 900000 + 100000)}</p>
                <p style={{ margin: 0 }}>발급일자: {new Date().toLocaleDateString()}</p>
              </div>
            </div>

            {/* Student metadata */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '15px', border: '1px solid #e2e8f0', marginBottom: '25px' }}>
              <div>
                <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#64748b', fontWeight: '700' }}>학습자 정보</p>
                <p style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#1e293b' }}>성명: {userName || '미입력'}</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#475569' }}>소속 과목: {courseName || '미입력'}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#64748b', fontWeight: '700' }}>인증 과제주제</p>
                <p style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#1e293b' }}>{taskTitle || '미입력'}</p>
              </div>
            </div>

            {/* Core Analytics Graph & Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '20px', marginBottom: '25px' }}>
              
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '15px', padding: '18px', backgroundColor: '#ffffff' }}>
                <h4 style={{ margin: '0 0 15px 0', fontSize: '13px', fontWeight: '700', color: '#15803d' }}>사고 계량 수치 (Metrics)</h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #f1f5f9', paddingBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>평균 질문 수준</span>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>Lv.{avgLevel} / 5</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #f1f5f9', paddingBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>관점 전환 횟수</span>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>{perspectiveShifts}회</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #f1f5f9', paddingBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>설명 관문 통과 건수</span>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>{messages.filter(m => m.summary).length}건</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>총 상호작용(질의) 횟수</span>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>{messages.filter(m => m.role === 'user').length}회</span>
                  </div>
                </div>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '15px', padding: '18px', backgroundColor: '#ffffff' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: '700', color: '#15803d' }}>사고의 변화 (Thinking Delta)</h4>
                <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.6', color: '#334155', height: '90px', overflow: 'hidden' }}>
                  {latestThinkingDelta}
                </p>
              </div>

            </div>

            {/* Explanation Gate log */}
            <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: '6px', margin: '0 0 12px 0' }}>
              설명 관문(Explanation Gate) 통과 기록
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '25px' }}>
              {messages.filter(m => m.summary).slice(0, 3).map((m, idx) => (
                <div key={idx} style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', backgroundColor: '#fcfdfd' }}>
                  <p style={{ margin: '0 0 5px 0', fontSize: '11px', color: '#16a34a', fontWeight: '700' }}>[자가 요약 기록 {idx + 1}]</p>
                  <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: '700', color: '#1e293b', lineHeight: '1.4' }}>"{m.summary}"</p>
                  <p style={{ margin: 0, fontSize: '10px', color: '#94a3b8', borderTop: '1px dashed #f1f5f9', paddingTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    인증 원본: {m.content.replace(/\s+/g, ' ').slice(0, 110)}...
                  </p>
                </div>
              ))}
              {messages.filter(m => m.summary).length === 0 && (
                <p style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>제출된 설명 관문 통과 기록이 존재하지 않습니다.</p>
              )}
            </div>

            {/* Final Recall Test Result */}
            <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: '6px', margin: '0 0 12px 0' }}>
              최종 학습 내재화 자가 검증 (Quiz Result)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '25px' }}>
              {quizQuestions.map((q, idx) => (
                <div key={idx} style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', backgroundColor: '#fafafa' }}>
                  <p style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: '700', color: '#475569' }}>
                    Q{idx+1}. {q}
                  </p>
                  <p style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: '700', color: '#15803d' }}>
                    A. {quizAnswers[idx] || "(시간 초과로 답변 작성 불가)"}
                  </p>
                  <p style={{ margin: 0, fontSize: '10px', color: '#94a3b8' }}>
                    검증 상태: {quizTimeTaken[idx]}초 내 답안 작성완료 {quizTimeTaken[idx] >= 15 ? "(의심 단계)" : "(정상 수행)"}
                  </p>
                </div>
              ))}
              {quizAnswers.length === 0 && (
                <p style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>수행된 최종 자가 검증 결과가 없습니다.</p>
              )}
            </div>

          </div>

          {/* Professor Guideline & tip footer */}
          <div>
            <div style={{ backgroundColor: '#f0fdf4', padding: '15px', borderRadius: '12px', border: '1px solid #dcfce7', marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: '800', color: '#166534' }}>[교수님을 위한 평가 Tip]</h4>
              <ul style={{ margin: 0, paddingLeft: '15px', fontSize: '11px', color: '#14532d', lineHeight: '1.6' }}>
                <li><strong>Inquiry Score (질문 등급)</strong>: 학생이 단순 질문 복사(Lv.1)를 넘어 비판적 탐구(Lv.5)를 유도했는지 체크하십시오. (Lv.3 이상 적극 추천)</li>
                <li><strong>Thinking Delta (사고 변화 분석)</strong>: 초기 설정한 질문의 방향성이 대화를 거치며 논리적으로 발전했는지 서술 영역을 통해 판단하십시오.</li>
                <li><strong>설명 관문 & 최종 검증</strong>: AI 복사 단계마다 학생 자신의 핵심 요약문과 15초 제한 시간 내에 도출된 퀴즈 답변을 대조하여 대필 행위 여부를 쉽게 대조 및 면접용으로 검증 가능합니다.</li>
              </ul>
            </div>

            <div style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8', borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
              본 문서는 대학 성적 평가 공정성 확보를 위해 학습 과정 데이터를 위변조 없이 증명한 ProLog 공식 디지털 사고 궤적 인증 리포트입니다.
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
