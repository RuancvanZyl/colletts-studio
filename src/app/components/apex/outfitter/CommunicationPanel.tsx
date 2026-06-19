import { useState } from 'react';
import { mockOutfitterChats } from '../mockOutfitterData';
import { OutfitterChat } from '../types';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Badge } from '../../ui/badge';
import { Search, Send, Paperclip, Plus, MessageSquarePlus, FileText } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export function CommunicationPanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChat, setSelectedChat] = useState<OutfitterChat | null>(null);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const filteredChats = mockOutfitterChats.filter(chat => {
    const matchesSearch = chat.participantName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab =
      activeTab === 'all' ||
      chat.participantType === activeTab;
    return matchesSearch && matchesTab;
  });

  const handleSendMessage = () => {
    if (message.trim()) {
      toast.success('Message sent!');
      setMessage('');
    }
  };

  const handleAIAction = (action: string) => {
    toast.success(`AI Action: ${action}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-slate-900 dark:text-slate-100 mb-2">Messages</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Communicate with hunters, taxidermy, and admin
          </p>
        </div>
        <Button className="gap-2">
          <MessageSquarePlus className="w-5 h-5" />
          Start New Chat
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat List */}
        <Card className="lg:col-span-1 p-4">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-700 dark:text-green-500" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="hunter">Hunters</TabsTrigger>
              <TabsTrigger value="taxidermy">Tax</TabsTrigger>
              <TabsTrigger value="admin">Admin</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Chat List */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {filteredChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedChat?.id === chat.id
                    ? 'bg-green-50 dark:bg-green-950/30 border border-green-300 dark:border-green-800'
                    : 'hover:bg-stone-50 dark:hover:bg-stone-800'
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <h4 className="text-slate-900 dark:text-slate-100">{chat.participantName}</h4>
                  {chat.unread > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {chat.unread}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1 capitalize">
                  {chat.participantType}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                  {chat.lastMessage}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  {new Date(chat.lastMessageTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* Chat Window */}
        <Card className="lg:col-span-2 p-6">
          {selectedChat ? (
            <div className="flex flex-col h-[600px]">
              {/* Chat Header */}
              <div className="pb-4 border-b border-stone-200 dark:border-stone-700 mb-4">
                <h3 className="text-slate-900 dark:text-slate-100 mb-1">
                  {selectedChat.participantName}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 capitalize">
                  {selectedChat.participantType}
                </p>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                <div className="flex justify-start">
                  <div className="bg-stone-100 dark:bg-stone-800 rounded-lg p-3 max-w-[70%]">
                    <p className="text-sm text-slate-900 dark:text-slate-100">
                      {selectedChat.lastMessage}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {new Date(selectedChat.lastMessageTime).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="bg-green-600 text-white rounded-lg p-3 max-w-[70%]">
                    <p className="text-sm">Thank you! I'll follow up soon.</p>
                    <p className="text-xs opacity-75 mt-1">10:45 AM</p>
                  </div>
                </div>
              </div>

              {/* AI Suggestions */}
              <div className="mb-3 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAIAction('Create hunt from chat')}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Create Hunt
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAIAction('Share licence')}
                >
                  <FileText className="w-3 h-3 mr-1" />
                  Share Licence
                </Button>
              </div>

              {/* Message Input */}
              <div className="flex gap-2">
                <Button variant="outline" size="icon">
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Input
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1"
                />
                <Button onClick={handleSendMessage}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-[600px] flex items-center justify-center">
              <div className="text-center">
                <MessageSquarePlus className="w-12 h-12 mx-auto mb-3 text-stone-400" />
                <p className="text-slate-600 dark:text-slate-400">
                  Select a conversation to start messaging
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
