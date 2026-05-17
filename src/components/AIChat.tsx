import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, Sparkles, User, Bot, Command } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'VELOTRAX Tactical AI Online. Awaiting mission parameters or telemetry analysis requests.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
        const response = await fetch('/api/insights', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rides: [], customPrompt: input }) // Special handling in server.ts
        });
        const data = await response.json();
        
        if (data.insights && Array.isArray(data.insights)) {
            setMessages(prev => [...prev, { role: 'assistant', content: data.insights.join('\n') }]);
        } else if (data.text) {
             setMessages(prev => [...prev, { role: 'assistant', content: data.text }]);
        }
    } catch (error) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Connection failed. AI offline.' }]);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] space-y-4">
      <Card className="flex-1 border-[#2A2D33] bg-[#0D0F12] rounded-sm flex flex-col overflow-hidden relative">
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#C8FF00 1px, transparent 1px)', backgroundSize: '15px 15px' }}></div>
        
        <CardHeader className="p-3 border-b border-[#2A2D33] bg-[#121417]">
             <CardTitle className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] flex items-center justify-between">
                <span>Tactical_AI_Interface</span>
                <span className="text-gray-600 font-mono">v1.0_GEN_AI</span>
             </CardTitle>
        </CardHeader>
        
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
           <div className="space-y-4">
                {messages.map((m, i) => (
                    <motion.div 
                        key={i} 
                        initial={{ opacity: 0, x: m.role === 'user' ? 10 : -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`max-w-[85%] p-3 rounded-lg text-xs font-mono border ${
                            m.role === 'user' 
                            ? 'bg-primary/10 border-primary/30 text-white' 
                            : 'bg-[#16181D] border-[#2A2D33] text-gray-300'
                        }`}>
                            <div className="flex items-center gap-2 mb-1 opacity-50">
                                {m.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                                <span className="text-[8px] uppercase">{m.role === 'user' ? 'OPERATOR' : 'VELOTRAX_L4'}</span>
                            </div>
                            {m.content}
                        </div>
                    </motion.div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-[#16181D] border border-[#2A2D33] p-3 rounded-lg text-xs font-mono text-primary animate-pulse">
                            Processing_Buffer...
                        </div>
                    </div>
                )}
           </div>
        </ScrollArea>
        
        <div className="p-3 border-t border-[#2A2D33] bg-[#121417]">
            <div className="flex gap-2">
                <Input 
                    value={input} 
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder="ENTER_QUERY..."
                    className="bg-black border-[#2A2D33] font-mono text-xs focus:ring-primary/50"
                />
                <Button onClick={handleSend} disabled={loading} className="bg-primary text-black h-10 w-10 p-0 shadow-lg">
                    <Send className="w-4 h-4" />
                </Button>
            </div>
        </div>
      </Card>
      
      <div className="grid grid-cols-2 gap-2">
          <QuickCmd label="Route Efficiency" onClick={() => setInput("Optimize my recent routes for efficiency")} />
          <QuickCmd label="Fuel Analysis" onClick={() => setInput("Analyze my fuel consumption patterns")} />
          <QuickCmd label="Route Weather" onClick={() => setInput("Check weather status along my planned route")} />
          <QuickCmd label="Rider Health" onClick={() => setInput("Advise on rider fatigue for long trips")} />
      </div>
    </div>
  );
}

function QuickCmd({ label, onClick }: { label: string, onClick: () => void }) {
    return (
        <Button variant="outline" className="border-[#2A2D33] bg-[#121417] text-[9px] font-mono uppercase tracking-tighter h-8 text-gray-500 hover:text-primary transition-colors" onClick={onClick}>
            <Command className="w-3 h-3 mr-1" /> {label}
        </Button>
    )
}
