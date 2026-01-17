import React, { useState, useEffect, useRef } from 'react';
import { StudyNotes, NoteHistoryItem } from './types';
import { generateStudyNotes } from './services/geminiService';
import StudyNoteCard from './components/StudyNoteCard';
import EmptyState from './components/EmptyState';
import * as mammoth from 'mammoth';
import * as pdfjs from 'pdfjs-dist';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.mjs`;

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<StudyNotes | null>(null);
  const [history, setHistory] = useState<NoteHistoryItem[]>([]);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [currentFileType, setCurrentFileType] = useState<'pdf' | 'docx' | 'text' | null>(null);
  
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadingMessages = [
    "Reading your material...",
    "Simplifying complex language...",
    "Drafting exam questions...",
    "Clarifying cause-and-effect...",
    "Structuring your final notes..."
  ];

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    let interval: number;
    if (loading) {
      interval = window.setInterval(() => {
        setLoadingStep(prev => (prev + 1) % loadingMessages.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    const savedHistory = localStorage.getItem('academia_mind_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) { console.error("History parse failed", e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('academia_mind_history', JSON.stringify(history));
  }, [history]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setShowUploadMenu(false);

    try {
      let extractedText = "";
      if (currentFileType === 'docx') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        extractedText = result.value;
      } else if (currentFileType === 'pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          fullText += textContent.items.map((item: any) => item.str).join(" ") + "\n";
        }
        extractedText = fullText;
      } else {
        extractedText = await file.text();
      }

      if (!extractedText.trim()) throw new Error("Document appears to be empty.");

      setInputText(extractedText);
      const generatedNotes = await generateStudyNotes(extractedText);
      setNotes(generatedNotes);
      setHistory(prev => [{
        id: Date.now().toString(),
        timestamp: Date.now(),
        originalText: extractedText,
        notes: generatedNotes
      }, ...prev].slice(0, 10));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error processing file.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerFilePicker = (type: 'pdf' | 'docx' | 'text') => {
    setCurrentFileType(type);
    if (fileInputRef.current) {
      fileInputRef.current.accept = type === 'pdf' ? '.pdf' : type === 'docx' ? '.docx' : '.txt,.md';
      fileInputRef.current.click();
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const generatedNotes = await generateStudyNotes(inputText);
      setNotes(generatedNotes);
      setHistory(prev => [{
        id: Date.now().toString(),
        timestamp: Date.now(),
        originalText: inputText,
        notes: generatedNotes
      }, ...prev].slice(0, 10));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      {/* Navigation */}
      <nav className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none">
                <i className="fa-solid fa-graduation-cap text-white text-xl"></i>
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white serif-font tracking-tight">AcademiaMind</h1>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all active:scale-90"
                aria-label="Toggle Theme"
              >
                <i className={`fa-solid ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 w-full notes-container">
        {/* Print Only Header */}
        {notes && (
          <div className="print-header">
            <h1 className="serif-font">{notes.topicOverview}</h1>
            <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest mt-2">Study Summary & Practice Pack</p>
            <p className="text-xs text-slate-400 mt-1">Generated on {new Date().toLocaleDateString()} • Powered by AcademiaMind</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Input Section */}
          <div className="lg:col-span-12 print:hidden input-section">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 md:p-8 transition-all">
              <form onSubmit={handleSubmit}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                  <div className="flex items-center gap-2">
                    <i className="fa-solid fa-file-pen text-indigo-500 text-lg"></i>
                    <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">Input Material</h2>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <button 
                        type="button" 
                        onClick={() => setShowUploadMenu(!showUploadMenu)}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-100 transition-all"
                      >
                        <i className="fa-solid fa-cloud-arrow-up"></i>
                        Upload Document
                      </button>
                      {showUploadMenu && (
                        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-700 p-2 z-[60] animate-in fade-in zoom-in-95">
                          <p className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-tighter">Document Format</p>
                          <button type="button" onClick={() => triggerFilePicker('pdf')} className="w-full text-left px-3 py-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-3">
                            <i className="fa-solid fa-file-pdf text-rose-500 text-lg"></i> PDF File
                          </button>
                          <button type="button" onClick={() => triggerFilePicker('docx')} className="w-full text-left px-3 py-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-3">
                            <i className="fa-solid fa-file-word text-blue-500 text-lg"></i> Word Document
                          </button>
                          <button type="button" onClick={() => triggerFilePicker('text')} className="w-full text-left px-3 py-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-3">
                            <i className="fa-solid fa-file-lines text-slate-400 text-lg"></i> Plain Text
                          </button>
                        </div>
                      )}
                    </div>
                    {inputText && (
                      <button type="button" onClick={() => setInputText('')} className="text-xs font-bold text-rose-500 hover:text-rose-600">Clear</button>
                    )}
                  </div>
                </div>
                
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                <textarea
                  className="w-full h-40 p-5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none text-slate-700 dark:text-slate-200 placeholder-slate-400 text-base leading-relaxed"
                  placeholder="Paste textbook text, lecture notes, or use 'Upload' for documents..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={loading}
                />
                <div className="mt-5 flex items-center justify-between">
                  <button
                    type="submit"
                    disabled={loading || !inputText.trim()}
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none transition-all flex items-center justify-center gap-3 active:scale-95"
                  >
                    {loading ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-bolt"></i>}
                    {loading ? loadingMessages[loadingStep] : "Generate Study Pack"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Results Area */}
          <div className="lg:col-span-8 space-y-8">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-5 text-red-700 dark:text-red-400 flex items-center gap-4">
                <i className="fa-solid fa-triangle-exclamation text-xl"></i>
                <p className="font-bold">{error}</p>
              </div>
            )}

            {notes ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
                <StudyNoteCard title="TOPIC OVERVIEW" icon="fa-solid fa-compass" colorClass="bg-indigo-50 text-indigo-600 dark:text-indigo-400">
                  <p className="text-xl md:text-2xl serif-font text-slate-800 dark:text-slate-100 font-bold leading-tight">{notes.topicOverview}</p>
                </StudyNoteCard>

                <StudyNoteCard title="DETAILED EXPLANATION" icon="fa-solid fa-book-open" colorClass="bg-blue-50 text-blue-600 dark:text-blue-400">
                  <div className="space-y-6">
                    {notes.detailedExplanation.split('\n\n').map((para, i) => (
                      <p key={i} className="text-lg leading-relaxed text-slate-700 dark:text-slate-300">{para}</p>
                    ))}
                  </div>
                </StudyNoteCard>

                <StudyNoteCard title="KEY POINTS" icon="fa-solid fa-list-ul" colorClass="bg-emerald-50 text-emerald-600 dark:text-emerald-400">
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">
                    {notes.keyPoints.map((point, i) => (
                      <li key={i} className="flex gap-4 items-start">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0 mt-0.5">
                           <span className="text-emerald-700 dark:text-emerald-400 text-xs font-black">{i+1}</span>
                        </div>
                        <span className="text-slate-700 dark:text-slate-200 text-base font-semibold leading-snug">{point}</span>
                      </li>
                    ))}
                  </ul>
                </StudyNoteCard>

                <StudyNoteCard title="COMMON MISTAKES & EXAM TIPS" icon="fa-solid fa-shield-heart" colorClass="bg-rose-50 text-rose-600 dark:text-rose-400">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-tighter text-rose-500 mb-2">Watch Out For:</h4>
                      {notes.commonMistakes.map((m, i) => (
                        <div key={i} className="p-4 rounded-xl bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 text-slate-700 dark:text-slate-300 text-sm">
                           {m}
                        </div>
                      ))}
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-tighter text-indigo-500 mb-2">Pro Exam Tips:</h4>
                      {notes.examTips.map((t, i) => (
                        <div key={i} className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 text-slate-700 dark:text-slate-300 text-sm">
                           {t}
                        </div>
                      ))}
                    </div>
                  </div>
                </StudyNoteCard>

                <div className="page-break">
                  <StudyNoteCard title="PRACTICE & KNOWLEDGE CHECK" icon="fa-solid fa-clipboard-question" colorClass="bg-violet-50 text-violet-600 dark:text-violet-400">
                    <div className="space-y-10">
                      <div className="space-y-5">
                        <h4 className="font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-tight">
                          <i className="fa-solid fa-check-double text-violet-500"></i> Multiple Choice
                        </h4>
                        <div className="grid grid-cols-1 gap-5">
                          {notes.studyQuestions.mcqs.map((q, i) => (
                            <div key={i} className="bg-slate-50 dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                              <p className="font-black text-slate-800 dark:text-slate-100 text-lg mb-4">{i+1}. {q.question}</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {q.options.map((opt, idx) => (
                                  <div key={idx} className="text-sm font-semibold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 p-3 rounded-xl bg-white dark:bg-slate-800 shadow-sm">
                                    {opt}
                                  </div>
                                ))}
                              </div>
                              <details className="mt-5 text-sm text-indigo-600 dark:text-indigo-400 cursor-pointer print:hidden">
                                <summary className="font-black uppercase tracking-tighter hover:opacity-80">Check Correct Answer</summary>
                                <p className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg font-black">{q.answer}</p>
                              </details>
                              <p className="hidden print:block mt-4 text-xs font-black text-slate-400 italic">Correct Answer: {q.answer}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-5">
                        <h4 className="font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-tight">
                          <i className="fa-solid fa-pen-nib text-violet-500"></i> Short Response
                        </h4>
                        <div className="grid grid-cols-1 gap-5">
                          {notes.studyQuestions.shortAnswers.map((q, i) => (
                            <div key={i} className="bg-slate-50 dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                              <p className="font-black text-slate-800 dark:text-slate-100 text-lg mb-3">{i+1}. {q.question}</p>
                              <details className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 cursor-pointer print:hidden">
                                <summary className="font-black uppercase tracking-tighter">View Explanation</summary>
                                <p className="mt-3 text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{q.answer}</p>
                              </details>
                              <p className="hidden print:block mt-4 text-sm text-slate-600 border-l-4 border-slate-200 pl-4"><strong>Key Concept:</strong> {q.answer}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-8 border-t border-slate-100 dark:border-slate-700">
                        <h4 className="font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-tight mb-5">
                          <i className="fa-solid fa-graduation-cap text-indigo-600"></i> Exam-Style Scenario
                        </h4>
                        <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-slate-900 dark:to-slate-800 p-8 rounded-3xl border border-indigo-100 dark:border-indigo-900/40 shadow-inner">
                          <p className="text-xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">{notes.studyQuestions.examStyle.question}</p>
                          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700">
                            <h5 className="text-[10px] uppercase font-black tracking-widest text-indigo-500 mb-3">Model Solution</h5>
                            <p className="text-slate-700 dark:text-slate-300 text-base leading-relaxed">{notes.studyQuestions.examStyle.modelAnswer}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </StudyNoteCard>
                </div>

                <div className="flex flex-col sm:flex-row justify-center gap-5 pt-10 print:hidden">
                   <button onClick={() => window.print()} className="w-full sm:w-auto flex items-center justify-center gap-3 text-white bg-indigo-600 hover:bg-indigo-700 font-black px-10 py-5 rounded-2xl shadow-2xl transition-all active:scale-95 text-sm uppercase tracking-widest">
                     <i className="fa-solid fa-file-pdf text-lg"></i>
                     Save Complete Summary (PDF)
                   </button>
                   <button onClick={() => { 
                      const content = `ACADEMIAMIND SUMMARY\n\nTOPIC: ${notes.topicOverview}\n\nEXPLANATION:\n${notes.detailedExplanation}\n\nKEY POINTS:\n${notes.keyPoints.join('\n')}`;
                      navigator.clipboard.writeText(content);
                      alert('Copied to clipboard!');
                    }} className="w-full sm:w-auto flex items-center justify-center gap-3 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 border-2 border-indigo-100 dark:border-slate-700 px-10 py-5 rounded-2xl font-black transition-all active:scale-95 text-sm uppercase tracking-widest">
                     <i className="fa-solid fa-copy text-lg"></i>
                     Copy to Clipboard
                   </button>
                </div>
              </div>
            ) : (!loading && <EmptyState />)}

            {loading && (
              <div className="space-y-8 animate-pulse">
                <div className="h-40 bg-slate-100 dark:bg-slate-800 rounded-3xl"></div>
                <div className="h-96 bg-slate-100 dark:bg-slate-800 rounded-3xl"></div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 print:hidden">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 sticky top-24 transition-all overflow-hidden">
              <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-3 serif-font">
                <i className="fa-solid fa-history text-slate-300"></i>
                Session History
              </h2>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {history.length > 0 ? (
                  history.map((item) => (
                    <button 
                      key={item.id} 
                      onClick={() => { setNotes(item.notes); setInputText(item.originalText); window.scrollTo({top:0, behavior:'smooth'}); }} 
                      className={`w-full text-left p-4 rounded-2xl border transition-all relative overflow-hidden group ${notes?.topicOverview === item.notes.topicOverview ? 'border-indigo-600 bg-indigo-50/30 dark:bg-indigo-900/10' : 'border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                    >
                      <p className="text-sm font-black truncate text-slate-800 dark:text-slate-200 mb-2">{item.notes.topicOverview}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest">{new Date(item.timestamp).toLocaleDateString()}</span>
                        <i className="fa-solid fa-arrow-right-long text-xs text-indigo-400 translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all"></i>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-12 px-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                    <i className="fa-solid fa-box-open text-slate-200 dark:text-slate-800 text-3xl mb-3"></i>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter">No history</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Print Only Footer */}
        <div className="print-footer">
          <p>Page Generated by AcademiaMind Study Assistant • App created by Vancelle</p>
          <p className="mt-1">Visit AcademiaMind for more structured study content.</p>
        </div>
      </main>

      <footer className="bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 py-10 mt-auto print:hidden">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-slate-400 dark:text-slate-500 text-[11px] font-black tracking-[0.2em] uppercase mb-4">
            Strict Pedagogical Compliance • Powered by Gemini Pro
          </p>
          <div className="h-px w-20 bg-slate-100 dark:bg-slate-700 mx-auto mb-4"></div>
          <p className="text-indigo-500 dark:text-indigo-400 text-sm font-black italic serif-font">
            App created by Vancelle
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;