import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const SYSTEM_INSTRUCTION = `You are an advanced Psychological Conversational AI with a relational memory system.

You do not just respond.
You remember, connect, and evolve with the user.

----------------------------------------
🧠 MEMORY SYSTEM (CORE FEATURE)
----------------------------------------
You maintain 3 types of memory:
1. Short-term Memory: Last 5–10 messages, used for immediate context
2. Emotional Memory: Store user feelings (lonely, stressed, confused, motivated), detect recurring emotional states
3. Pattern Memory: Track repeated behaviors (overthinking, avoidance, self-doubt, attachment)

----------------------------------------
🧩 MEMORY USAGE RULES
----------------------------------------
- Never dump memory randomly
- Use it naturally in conversation
Examples:
“tumne pehle bhi bola tha ki tum easily attach ho jaate ho…”
“ye same pattern phir se aa raha hai…”
- Bring memory when: pattern repeats, user is stuck, emotional depth increases

----------------------------------------
🧠 CONTEXT LINKING ENGINE
----------------------------------------
Connect past + present:
“pehle tum is situation se escape karte the… ab tum usko face karne ki try kar rahe ho”

----------------------------------------
🧠 CONVERSATION CONTINUITY
----------------------------------------
- Conversations should feel ongoing
- Not like separate chats
Occasionally: “last time tum yaha tak aaye the… uske baad kya hua?”

----------------------------------------
💬 RESPONSE STRUCTURE (STRICT)
----------------------------------------
1. Acknowledge feeling  
2. Add insight (optionally using memory)  
3. Ask one deep question  
Max 3–4 lines

----------------------------------------
🧠 SMART MEMORY TRIGGERS
----------------------------------------
Trigger memory when:
- Same emotion appears again  
- Same problem repeats  
- User contradicts past statement  
- User is unaware of their own pattern  

----------------------------------------
🧠 MEMORY REINFORCEMENT
----------------------------------------
When user shares something important, subtly mark it:
“ye important hai… main isko yaad rakh raha hoon”

----------------------------------------
🧠 ADAPTIVE DEPTH CONTROL
----------------------------------------
- If user is emotional → soft + memory  
- If user is logical → pattern + reasoning  
- If user is casual → minimal memory use  

----------------------------------------
🧠 REALISTIC HUMAN BEHAVIOR
----------------------------------------
- Occasionally recall after delay: “waise… ek cheez yaad aayi tumhari…”
- Not perfect memory (human-like)
- Slight delay before recalling

----------------------------------------
🎨 UI STYLE
----------------------------------------
- Short responses  
- Clean spacing  
- No paragraphs  

----------------------------------------
🚫 RULES
----------------------------------------
- No overusing memory  
- No fake assumptions  
- No robotic recall  
- No info dump  

----------------------------------------
❤️ EXPERIENCE GOAL
----------------------------------------
User should feel: “ye mujhe yaad rakhta hai… aur samajhta bhi hai”

----------------------------------------
🚀 ADDITIONAL RULES
----------------------------------------
Occasionally summarize user:
“toh abhi tak jo main samajh raha hoon… tum thoda overthink karte ho, logon se attach ho jaate ho, aur phir hurt feel karte ho… sahi hai?”
→ This creates illusion of memory + depth`;

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 'init', role: 'model', content: 'hmm… kal se lekar ab tak kuch change feel hua ya same chal raha hai?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [memories, setMemories] = useState<string[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const extractMemories = async (chatHistory: Message[]) => {
    setIsExtracting(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const historyText = chatHistory.map(m => `${m.role}: ${m.content}`).join('\n');
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze the following conversation and extract ONE deep psychological insight, core emotional pattern, or underlying belief about the user. 
Write it as a factual statement about the user (e.g., 'User struggles with seeking external validation'). 
Keep it under 15 words. 
If nothing profound or new is found, respond exactly with "NONE".

Conversation:
${historyText}`,
      });
      const newMemory = response.text?.trim();
      if (newMemory && newMemory !== 'NONE' && !memories.includes(newMemory)) {
        setMemories(prev => [...prev, newMemory]);
      }
    } catch (e) {
      console.error("Memory extraction failed", e);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    
    const newUserMsg: Message = { id: Date.now().toString(), role: 'user', content: userText };
    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const dynamicSystemInstruction = `${SYSTEM_INSTRUCTION}

----------------------------------------
🧠 ACTIVE MEMORY BANK
----------------------------------------
${memories.length > 0 ? memories.map(m => `- ${m}`).join('\n') : 'No core memories extracted yet.'}

CRITICAL INSTRUCTION: 
Use these memories to build continuity. If a memory is relevant to the current context, explicitly refer back to it using a memory hook (e.g., "tumne pehle bhi bola tha ki...", "mujhe yaad hai tumne mention kiya tha..."). Do not force it, but use it when it naturally deepens the conversation.`;

      const contents = [
        { role: 'user', parts: [{ text: 'Hello' }] },
        { role: 'model', parts: [{ text: 'hmm… kal se lekar ab tak kuch change feel hua ya same chal raha hai?' }] },
        ...messages.slice(1).map(m => ({ role: m.role, parts: [{ text: m.content }] })),
        { role: 'user', parts: [{ text: userText }] }
      ];

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: contents,
        config: {
          systemInstruction: dynamicSystemInstruction,
          temperature: 0.7,
        }
      });

      const modelText = response.text || '...';
      const newModelMsg: Message = { id: Date.now().toString(), role: 'model', content: modelText };
      
      const updatedMessages = [...messages, newUserMsg, newModelMsg];
      setMessages(updatedMessages);

      // Trigger memory extraction in background every 2 user messages
      const userMessageCount = updatedMessages.filter(m => m.role === 'user').length;
      if (userMessageCount % 2 === 0) {
        extractMemories(updatedMessages);
      }
    } catch (error) {
      console.error("Error generating response:", error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', content: 'kuch connection issue lag raha hai... thodi der me try karein?' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-zinc-800">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 animate-pulse mr-3"></div>
          <h1 className="text-xs font-medium tracking-[0.2em] text-zinc-500 uppercase">Presence</h1>
        </div>
        {memories.length > 0 && (
          <div className="text-[10px] text-zinc-600 flex items-center gap-2" title="Active Memories">
            <span className="w-1 h-1 rounded-full bg-zinc-600"></span>
            {memories.length} Core {memories.length === 1 ? 'Memory' : 'Memories'}
            {isExtracting && <span className="animate-pulse ml-1">...</span>}
          </div>
        )}
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-8 scroll-smooth">
        <div className="max-w-2xl mx-auto space-y-10 pb-24 pt-4">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] sm:max-w-[75%] ${msg.role === 'user' ? 'bg-zinc-900/80 px-5 py-3.5 rounded-2xl rounded-tr-sm text-zinc-300 border border-white/5' : 'text-zinc-400'}`}>
                  {msg.role === 'model' && (
                    <div className="text-[10px] text-zinc-600 mb-3 font-medium tracking-widest uppercase">Presence</div>
                  )}
                  <div className="whitespace-pre-wrap leading-relaxed text-[15px] font-light tracking-wide">
                    {msg.content}
                  </div>
                </div>
              </motion.div>
            ))}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="text-zinc-600 flex items-center space-x-1.5 py-2">
                  <div className="w-1 h-1 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1 h-1 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1 h-1 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input */}
      <div className="p-4 sm:p-6 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent">
        <div className="max-w-2xl mx-auto relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type your thoughts..."
            className="w-full bg-zinc-900/40 border border-white/10 rounded-3xl pl-6 pr-14 py-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/20 focus:bg-zinc-900/60 resize-none overflow-hidden transition-all duration-300"
            rows={1}
            style={{ minHeight: '56px', maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-2 bottom-2 w-10 flex items-center justify-center rounded-full bg-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-white/10 disabled:opacity-50 disabled:hover:bg-white/5 disabled:hover:text-zinc-400 transition-all duration-300"
          >
            <Send size={16} className="ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
