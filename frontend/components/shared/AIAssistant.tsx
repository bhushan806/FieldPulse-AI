'use client';

import React, { useState, useRef } from 'react';
import { MessageSquare, X, Send, Sparkles, Paperclip, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/store/authStore';

export function AIAssistant() {
  const { user } = useAuthStore();
  const projectId = user?.project_ids?.[0] || '';
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([
    { role: 'ai', content: 'Hi! I am the FieldPulse AI Assistant. How can I help you today? You can also upload images, audio, or video for analysis.' }
  ]);
  const [input, setInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');

    try {
      const response = await apiClient.post('/api/ai/chat', {
        message: userMsg,
        project_id: projectId
      });
      
      setMessages(prev => [
        ...prev,
        { role: 'ai', content: response.data.reply }
      ]);
    } catch (error) {
      setMessages(prev => [
        ...prev,
        { role: 'ai', content: "Sorry, I couldn't connect to the AI engine right now." }
      ]);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMessages(prev => [...prev, { role: 'user', content: `Uploaded file: ${file.name}` }]);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('project_id', projectId);

      // Using raw axios/fetch or configuring apiClient to handle FormData
      // Our apiClient handles FormData natively by omitting Content-Type
      const response = await apiClient.post('/api/ai/analyze-media', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setMessages(prev => [
        ...prev,
        { role: 'ai', content: response.data.analysis }
      ]);
    } catch (error) {
      setMessages(prev => [
        ...prev,
        { role: 'ai', content: "Failed to analyze the media file. Please try again." }
      ]);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-4 bg-brand-600 text-white rounded-full shadow-lg hover:bg-brand-700 transition-all z-50 flex items-center justify-center ${isOpen ? 'scale-0' : 'scale-100 hover:scale-110'}`}
      >
        <Sparkles className="w-6 h-6" />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 md:w-96 bg-surface border border-border rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-brand-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <h3 className="font-bold">FieldPulse AI</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto max-h-96 space-y-4 bg-bg-app">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${msg.role === 'user' ? 'bg-brand-600 text-white rounded-br-sm' : 'bg-surface border border-border text-text-primary rounded-bl-sm whitespace-pre-wrap'}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isUploading && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl p-3 text-sm bg-surface border border-border text-text-primary rounded-bl-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                  Analyzing media...
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-3 border-t border-border bg-surface flex items-center gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="p-2 text-text-muted hover:text-brand-600 transition-colors disabled:opacity-50"
              title="Upload media for analysis"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the AI Assistant..."
              disabled={isUploading}
              className="flex-1 bg-bg-muted border border-border rounded-xl px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isUploading}
              className="p-2 bg-brand-600 text-white rounded-xl disabled:opacity-50 hover:bg-brand-700 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
