import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { AssessmentState } from '../types';
import { CATEGORIES } from '../constants';
import { Send, Bot, User, AlertTriangle, Loader2, Eraser } from 'lucide-react';

interface ChatAssistantProps {
  state: AssessmentState;
}

interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export const ChatAssistant: React.FC<ChatAssistantProps> = ({ state }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      text: "Hello. I am your Legal Ethics Assistant. I have access to the violations you've tracked so far. I can help you understand specific rules, suggest what evidence to gather, or help organize your thoughts. How can I assist you today?",
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize Chat Session
  useEffect(() => {
    // Check for API Key presence
    if (!process.env.API_KEY) {
        setMessages(prev => [
            ...prev,
            {
                role: 'model',
                text: "⚠️ Configuration Error: API_KEY is missing. AI features are unavailable.",
                timestamp: Date.now()
            }
        ]);
        return;
    }

    const initChat = async () => {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Build context from current state
      const observedViolations = CATEGORIES.flatMap(cat => 
        cat.items
          .filter(item => state[item.id]?.isObserved)
          .map(item => `- ${item.text} (Date: ${state[item.id].date || 'Unknown'})`)
      ).join('\n');

      const systemInstruction = `You are a specialized Legal Ethics Assistant for a Family Law assessment tool. 
      
      CONTEXT:
      The user is tracking potential ethical violations by an attorney.
      Currently, the user has observed the following violations:
      ${observedViolations.length > 0 ? observedViolations : "No violations recorded yet."}

      GUIDELINES:
      1. Provide objective, educational information about legal ethics and family law procedure.
      2. Suggest specific types of evidence that might be useful for the observed violations (e.g., emails, court transcripts, billing records).
      3. Maintain a professional, empathetic, and neutral tone.
      4. Be concise and structured in your responses.
      5. IMPORTANT: You are an AI, not a lawyer. DO NOT provide legal advice, predict court outcomes, or tell the user what to do legally. Always include a disclaimer if the user asks for legal advice.
      `;

      const chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        },
      });

      setChatSession(chat);
    };

    initChat();
  }, []); // Re-init if state changes significantly? For now, run once on mount.

  const handleSend = async () => {
    if (!input.trim() || !chatSession) return;

    const userMsg: Message = { role: 'user', text: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const result = await chatSession.sendMessageStream({ message: userMsg.text });
      
      let fullResponse = "";
      // Create a placeholder message for the model
      const modelMsgId = Date.now();
      setMessages(prev => [...prev, { role: 'model', text: '', timestamp: modelMsgId }]);

      for await (const chunk of result) {
        const c = chunk as GenerateContentResponse;
        if (c.text) {
          fullResponse += c.text;
          setMessages(prev => prev.map(msg => 
            msg.timestamp === modelMsgId ? { ...msg, text: fullResponse } : msg
          ));
        }
      }
    } catch (error) {
      console.error("Chat Error", error);
      setMessages(prev => [...prev, { role: 'model', text: "I'm sorry, I encountered an error connecting to the service. Please try again.", timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
     setMessages([messages[0]]); // Keep welcome message
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 animate-fadeIn overflow-hidden">
      {/* Chat Header */}
      <div className="bg-slate-50 p-4 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-800 flex items-center">
            <Bot className="w-5 h-5 mr-2 text-indigo-600" />
            Legal Ethics Assistant
          </h2>
          <p className="text-xs text-gray-500">Context-aware guidance for your assessment</p>
        </div>
        <button 
            onClick={clearChat}
            className="text-gray-400 hover:text-red-500 transition-colors p-2"
            title="Clear Conversation"
        >
            <Eraser className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        <div className="bg-amber-50 border border-amber-100 p-3 rounded-md flex items-start text-xs text-amber-800 mb-4 mx-auto max-w-2xl">
          <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
          <p>
            <strong>Disclaimer:</strong> This AI assistant is for informational and educational purposes only. 
            It is not a substitute for professional legal counsel. Do not rely on this tool for legal strategy.
          </p>
        </div>

        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[85%] md:max-w-[75%] rounded-lg p-3 shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-br-none' 
                  : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
              }`}
            >
              <div className="flex items-center mb-1 opacity-70 text-[10px] uppercase font-bold tracking-wider">
                {msg.role === 'user' ? <User className="w-3 h-3 mr-1" /> : <Bot className="w-3 h-3 mr-1" />}
                {msg.role === 'user' ? 'You' : 'Assistant'}
              </div>
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {msg.text}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex items-end space-x-2 relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about specific violations, evidence, or ethics rules..."
            className="w-full p-3 pr-12 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none max-h-32 min-h-[50px] text-sm"
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 bottom-2 p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-2 text-center">
            AI can make mistakes. Please verify important information.
        </p>
      </div>
    </div>
  );
};
