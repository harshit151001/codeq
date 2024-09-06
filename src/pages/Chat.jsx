import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageSquare, PlusCircle, Send } from 'lucide-react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { v4 as uuid } from "uuid";
import ReactMarkdown from 'react-markdown';

const BASE_URL = 'http://localhost:8000';

const ChatInterface = () => {
  const { repoId, chatId } = useParams();
  const navigate = useNavigate();
  const [repo, setRepo] = useState(null);
  const [chats, setChats] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchRepo();
    fetchChatsHistory();
  }, [repoId, chatId]);

  useEffect(() => {
    if (chatId) {
      fetchChatHistory(chatId);
    }
  }, [chatId]);

  const fetchRepo = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/processed-repos/${repoId}`, {
        withCredentials: true
      });
      setRepo(response.data);
    } catch (error) {
      console.error('Error fetching repository:', error);
    }
  };

  const fetchChatsHistory = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/chat/history`, {
        withCredentials: true
      });
      setChats(response.data);
    } catch (error) {
      console.error('Error fetching chats history:', error);
    }
  };

  const fetchChatHistory = async (id) => {
    try {
      const response = await axios.get(`${BASE_URL}/chat/${id}/history`, {
        withCredentials: true
      });
      setCurrentChat(response.data);
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;
  
    setIsLoading(true);
    const newMessage = { id: uuid(), content: message.trim(), senderType: 'USER' };
    const assistantMessage = { id: uuid(), content: '', senderType: 'ASSISTANT' };
    
    setCurrentChat(prev => ({
      ...prev,
      messages: [...(prev?.messages || []), newMessage, assistantMessage]
    }));
    setMessage('');
  
    try {
      const response = await axios.post(`${BASE_URL}/chat/query`, {
        chatId,
        repoId,
        message: newMessage.content,
        parentId: currentChat?.messages.length > 0 
          ? currentChat.messages[currentChat.messages.length - 1].id 
          : null
      }, {
        withCredentials: true,
        responseType: 'stream'
      });
  
      const reader = response.data.getReader();
      const decoder = new TextDecoder();
  
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        
        setCurrentChat(prev => {
          const updatedMessages = [...prev.messages];
          updatedMessages[updatedMessages.length - 1].content += chunk;
          return { ...prev, messages: updatedMessages };
        });
      }
  
      // After stream ends, fetch updated chat history
      await fetchChatHistory(chatId);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = () => {
    const newChatId = uuid();
    navigate(`/chat/${repoId}/${newChatId}`);
    setCurrentChat(null);
  };

  return (
    <div className="flex h-[calc(100vh-72px)] bg-gray-100 flex-1">
      {/* Sidebar */}
      <Card className="w-64 m-4 overflow-hidden">
        <CardHeader>
          <Button onClick={startNewChat} className="w-full">
            <PlusCircle className="mr-2 h-4 w-4" /> New Chat
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className={`p-3 cursor-pointer transition-colors ${
                  chat.id === chatId ? 'bg-blue-100' : 'hover:bg-gray-200'
                }`}
                onClick={() => navigate(`/chat/${chat.repoId}/${chat.id}`)}
              >
                <MessageSquare className="inline-block mr-2 h-4 w-4" />
                {`${chat.repo.name} - ${chat.messages[0].content}`}
              </div>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Interface */}
      <Card className="flex-1 m-4 flex flex-col">
        <CardHeader className="bg-white shadow">
          <h1 className="text-2xl font-bold">
            Chatting with {repo?.name || 'Repository'}
          </h1>
        </CardHeader>

        <CardContent className="flex-1 p-4 overflow-auto">
          <ScrollArea className="h-full">
            {currentChat?.messages.map((msg) => (
              <div
                key={msg.id}
                className={`mb-4 ${msg.senderType === 'USER' ? 'text-right' : 'text-left'}`}
              >
                <div
                  className={`inline-block p-3 rounded-lg max-w-[70%] ${
                    msg.senderType === 'USER'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  {msg.senderType === "USER" ? (
                    msg.content
                  ) : (
                    <ReactMarkdown>{JSON.parse(msg.content)?.value}</ReactMarkdown>
                  )}
                </div>
              </div>
            ))}
          </ScrollArea>
        </CardContent>

        <CardFooter className="p-4 bg-white border-t">
          <div className="flex w-full">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 mr-2"
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={isLoading}
            />
            <Button onClick={handleSendMessage} disabled={isLoading}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ChatInterface;