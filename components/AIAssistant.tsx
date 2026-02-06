
import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Terminal, Copy, Check } from 'lucide-react';
import { geminiService } from '../services/geminiService';

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string; type?: 'code' | 'text' }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
        const response = await geminiService.generatePowerShell(userMsg);
        setMessages(prev => [...prev, { 
            role: 'ai', 
            content: response,
            type: response.includes('Set-AD') || response.includes('Get-AD') ? 'code' : 'text'
        }]);
    } catch (error) {
        setMessages(prev => [...prev, { role: 'ai', content: "Something went wrong. Please check your API key." }]);
    } finally {
        setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30" onClick={onClose} />}
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 right-0 w-96 glass border-l border-slate-800 transform transition-transform duration-300 z-40 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-400 font-bold">
              <Sparkles className="w-5 h-5" />
              <span>Hyperion AI Agent</span>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4" ref={scrollRef}>
            {messages.length === 0 && (
                <div className="text-center py-10">
                    <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <Terminal className="w-6 h-6 text-blue-500" />
                    </div>
                    <h4 className="font-semibold">How can I help you today?</h4>
                    <p className="text-sm text-slate-500 mt-2 px-10">Try: "Generate a script to unlock all users in the Sales OU" or "List users with password never expires."</p>
                </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                  msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-300'
                }`}>
                  {msg.type === 'code' ? (
                    <div className="space-y-2">
                        <pre className="font-mono text-xs whitespace-pre-wrap break-all">{msg.content}</pre>
                        <button 
                            onClick={() => copyToClipboard(msg.content)}
                            className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-white"
                        >
                            <Copy className="w-3 h-3" /> Copy script
                        </button>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
                <div className="flex gap-2 p-4">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-200" />
                </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-800">
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type your PowerShell request..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-4 pr-12 text-sm outline-none focus:border-blue-500 transition-colors"
              />
              <button 
                onClick={handleSend}
                className="absolute right-2 top-2 p-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-white"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-slate-600 mt-2 text-center uppercase tracking-widest font-bold">Powered by Gemini Pro Intelligence</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default AIAssistant;
