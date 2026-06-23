import { useState } from 'react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { MessageCircle, Send, X, Minimize2, Maximize2, User, Bot, AlertCircle } from 'lucide-react';
import { usePortalTheme } from '../PortalThemeProvider';
import { toast } from 'sonner@2.0.3';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

export function UniversalAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm your Apex Trophy Solutions AI assistant. How can I help you today?",
      timestamp: new Date(),
      suggestions: [
        'Track my trophies',
        'Create a new hunt',
        'Check document status',
        'View analytics',
      ],
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const { portalType, theme } = usePortalTheme();

  const getPortalSpecificHelp = () => {
    switch (portalType) {
      case 'hunter':
        return [
          'Where is my trophy?',
          'How do I select a mount type?',
          'View my hunt history',
          'Check payment status',
        ];
      case 'outfitter':
        return [
          'Create a new hunt',
          'Upload my licence',
          'View hunter list',
          'Export annual report',
        ];
      case 'admin':
      case 'taxidermy':
        return [
          'What trophies are in storage?',
          'Scan new intake',
          'Update trophy status',
          'View department analytics',
        ];
      default:
        return [];
    }
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: getAIResponse(inputValue),
        timestamp: new Date(),
        suggestions: getPortalSpecificHelp().slice(0, 2),
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 500);
  };

  const getAIResponse = (query: string): string => {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('trophy') || lowerQuery.includes('where')) {
      return 'I can help you track your trophies! Your items are currently being processed. Would you like me to show you the detailed timeline?';
    }
    if (lowerQuery.includes('hunt') || lowerQuery.includes('create')) {
      return 'I can help you create a new hunt. You\'ll need to provide the hunt location, dates, and link to a hunter. Shall I guide you through the process?';
    }
    if (lowerQuery.includes('licence') || lowerQuery.includes('document')) {
      return 'I can assist with document uploads. Please make sure your documents are in PDF format and not expired. Would you like to upload now?';
    }
    if (lowerQuery.includes('status') || lowerQuery.includes('update')) {
      return 'I can show you the current status of your items. All active hunts and trophies are being tracked in real-time. Would you like a summary?';
    }
    if (lowerQuery.includes('help') || lowerQuery.includes('support')) {
      toast.info('Connecting you to admin support...');
      return 'I\'m connecting you to our support team who can provide more specialized assistance. They\'ll be with you shortly.';
    }

    return 'I understand you\'re asking about "' + query + '". Let me help you with that. Could you provide more details so I can assist you better?';
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    handleSendMessage();
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-2xl bg-gradient-to-r ${theme.gradient} hover:${theme.gradientHover} text-white z-50 animate-pulse hover:animate-none`}
        size="icon"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>
    );
  }

  return (
    <Card
      className={`fixed bottom-6 right-6 w-96 shadow-2xl z-50 overflow-hidden transition-all ${
        isMinimized ? 'h-16' : 'h-[600px]'
      } border-2 ${theme.borderLight}`}
    >
      {/* Header */}
      <div className={`bg-gradient-to-r ${theme.gradient} p-4 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-white" />
          <div>
            <h4 className="text-white">AI Assistant</h4>
            <p className="text-xs text-white/80">{theme.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-white hover:bg-white/20"
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="text-white hover:bg-white/20"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      {!isMinimized && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 h-[calc(100%-180px)] bg-stone-50 dark:bg-stone-900">
            {messages.map((message) => (
              <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role === 'assistant' && (
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${theme.gradient} flex items-center justify-center flex-shrink-0`}>
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className={`max-w-[75%] ${message.role === 'user' ? 'order-first' : ''}`}>
                  <div
                    className={`rounded-lg p-3 ${
                      message.role === 'user'
                        ? `bg-gradient-to-r ${theme.gradient} text-white`
                        : 'bg-white dark:bg-stone-800 text-slate-900 dark:text-slate-100 border border-stone-200 dark:border-stone-700'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 px-1">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {message.suggestions.map((suggestion, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="text-xs"
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-stone-600 to-stone-700 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="p-3 bg-stone-100 dark:bg-stone-800 border-t border-stone-200 dark:border-stone-700">
            <div className="flex flex-wrap gap-2 mb-2">
              {getPortalSpecificHelp().slice(0, 2).map((help, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="cursor-pointer hover:bg-stone-300 dark:hover:bg-stone-600 text-xs"
                  onClick={() => setInputValue(help)}
                >
                  {help}
                </Badge>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="p-4 border-t border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900">
            <div className="flex gap-2">
              <Input
                placeholder="Ask me anything..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
                className={`bg-gradient-to-r ${theme.gradient} hover:${theme.gradientHover} text-white`}
                size="icon"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
