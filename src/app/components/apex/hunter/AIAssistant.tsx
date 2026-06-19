import { useState, useRef, useEffect } from 'react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { Message } from '../types';
import { Bot, Send, User, Sparkles } from 'lucide-react';

interface AIAssistantProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
}

export function AIAssistant({ messages, onSendMessage }: AIAssistantProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const quickQuestions = [
    "What's my trophy status?",
    'When will shipping happen?',
    'Show payment details',
    'Contact support team'
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-stone-900 dark:text-white mb-2 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-green-600 dark:text-green-400" />
          AI Assistant
        </h1>
        <p className="text-stone-600 dark:text-stone-400">
          Get instant answers about your trophies, payments, and shipping
        </p>
      </div>

      <Card className="bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col h-[600px]">
        {/* Messages Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-lime-100 dark:from-green-950/50 dark:to-lime-950/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bot className="w-8 h-8 text-green-700 dark:text-green-400" />
                </div>
                <h3 className="text-stone-900 dark:text-white mb-2">
                  Welcome to APEX AI Assistant
                </h3>
                <p className="text-stone-600 dark:text-stone-400 mb-6">
                  I'm here to help with your trophy inquiries
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-md mx-auto">
                  {quickQuestions.map((question, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      onClick={() => onSendMessage(question)}
                      className="text-left justify-start"
                    >
                      {question}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.sender === 'user' ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback
                        className={
                          message.sender === 'ai'
                            ? 'bg-gradient-to-br from-green-600 to-lime-600 text-white'
                            : 'bg-gradient-to-br from-blue-600 to-purple-600 text-white'
                        }
                      >
                        {message.sender === 'ai' ? (
                          <Bot className="w-4 h-4" />
                        ) : (
                          <User className="w-4 h-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>

                    <div
                      className={`flex-1 max-w-[80%] ${
                        message.sender === 'user' ? 'items-end' : 'items-start'
                      } flex flex-col`}
                    >
                      <div
                        className={`rounded-2xl px-4 py-3 ${
                          message.sender === 'ai'
                            ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800'
                            : 'bg-blue-600 text-white'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                      </div>
                      <span className="text-xs text-stone-500 dark:text-stone-500 mt-1 px-2">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your trophies..."
              className="flex-1 bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-700"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim()}
              className="bg-green-700 hover:bg-green-800 text-white"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-500 mt-2">
            AI responses are generated automatically and may not always be accurate
          </p>
        </div>
      </Card>
    </div>
  );
}
