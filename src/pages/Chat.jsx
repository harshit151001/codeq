import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageSquare, PlusCircle, Send, User, Bot, Search } from 'lucide-react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { v4 as uuid } from "uuid";
import ReactMarkdown from 'react-markdown';
import { produce } from 'immer';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

const BASE_URL = 'http://localhost:8000';

const ChatInterface = () => {
  const { repoId, chatId } = useParams();
  const navigate = useNavigate();
  const [repo, setRepo] = useState(null);
  const [chats, setChats] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [repoFilter, setRepoFilter] = useState('');
  const messagesEndRef = useRef(null);

  const fetchRepo = useCallback(async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/processed-repos/${repoId}`, {
        withCredentials: true
      });
      setRepo(response.data);
    } catch (error) {
      console.error('Error fetching repository:', error);
    }
  }, [repoId]);

  const fetchChatsHistory = useCallback(async () => {
    try {
      const response = await axios.get(`${BASE_URL}/chat/history`, {
        withCredentials: true
      });
      setChats(response.data);
    } catch (error) {
      console.error('Error fetching chats history:', error);
    }
  }, []);

  const fetchChatHistory = useCallback(async (id) => {
    try {
      const response = await axios.get(`${BASE_URL}/chat/${id}/history`, {
        withCredentials: true
      });
      setCurrentChat(response.data);
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  }, []);

  useEffect(() => {
    fetchRepo();
    fetchChatsHistory();
  }, [fetchRepo, fetchChatsHistory]);

  useEffect(() => {
    if (chatId && chats.some(chat => chat.id === chatId)) {
      fetchChatHistory(chatId);
    } else {
      setCurrentChat({ messages: [] });
    }
  }, [chatId, fetchChatHistory, chats]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentChat]);

  const handleSendMessage = useCallback(async () => {

    console.log("message", message);
    if (!message.trim() || isLoading) return;
  
    setIsLoading(true);
    const newMessage = { 
      id: uuid(), 
      content: message.trim(), 
      senderType: 'USER', 
      parentId: currentChat?.messages?.reduce((lastId, msg) => {
        if (msg.parentId === lastId) return msg.id;
        return lastId;
      }, null)
    };
    const assistantMessage = { id: uuid(), content: '', senderType: 'ASSISTANT', parentId: newMessage.id };
    
    setCurrentChat(produce(draft => {
      if (!draft) {
        draft = { messages: [] };
      }
      draft.messages.push(newMessage, assistantMessage);
    }));

    setMessage('');
  
    try {
      const response = await fetch(`${BASE_URL}/chat/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId,
          repoId,
          message: newMessage.content,
          parentId: newMessage.parentId
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim().startsWith("data:")) {
            try {
              const data = JSON.parse(line.trim().slice(5));
              setCurrentChat(produce(draft => {
                const lastAssistantMessage = draft?.messages?.find(msg => msg.id === assistantMessage.id);
                if (lastAssistantMessage) {
                  if (data.status === "in_progress") {
                    lastAssistantMessage.content += data.delta[0].text.value;
                  } else if (data.status === "updated_history") {
                    lastAssistantMessage.id = data.id;
                  }
                }
              }));
            } catch (error) {
              console.error('Error parsing JSON:', error, 'Line:', line);
            }
          }
        }
      }

      // Process any remaining data in the buffer
      if (buffer.trim()) {
        try {
          const data = JSON.parse(buffer.trim().slice(5));
          setCurrentChat(produce(draft => {
            const lastAssistantMessage = draft?.messages?.find(msg => msg.id === assistantMessage.id);
            if (lastAssistantMessage) {
              if (data.status === "in_progress") {
                lastAssistantMessage.content += data.delta[0].text.value;
              } else if (data.status === "updated_history") {
                lastAssistantMessage.id = data.id;
              }
            }
          }));
        } catch (error) {
          console.error('Error parsing JSON from remaining buffer:', error);
        }
      }

    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  }, [message]);

  const startNewChat = useCallback(() => {
    const newChatId = uuid();
    navigate(`/chat/${repoId}/${newChatId}`);
    setCurrentChat({
      messages: []
    });
    
  }, [navigate, repoId]);

  const renderMessageTree = useCallback((messages, parentId = null) => {
    return messages
      .filter(msg => msg.parentId === parentId)
      .map(msg => (
        <div key={msg.id} className="mb-8 relative">
          <div className="flex items-start">
            {msg.senderType === 'USER' ? (
              <div className="w-8 h-8 rounded-full self-center bg-slate-500 flex-shrink-0 mr-3 flex items-center justify-center sticky top-2">
                <User className="text-white w-5 h-5" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0 mr-3 flex items-center justify-center sticky top-2">
                <Bot className="text-gray-600 w-5 h-5" />
              </div>
            )}
            <div
              className={`flex-grow p-3 rounded-lg ${
                msg.senderType === 'USER'
                  ? 'text-gray-900'
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              {msg.senderType === "USER" ? (
                msg.content
              ) : msg.content === "" ? (
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                </div>
              ) : (
                renderMessage(msg.content)
              )}
            </div>
          </div> 
          <div className="mt-4">
            {renderMessageTree(messages, msg.id)}
          </div>
        </div>
      ));
  }, []);

  return (
    <div className="flex h-[calc(100vh-72px)] bg-gray-100 flex-1">
      {/* Sidebar */}
      <Card className="w-64 overflow-hidden rounded-none">
        <CardHeader className="p-4 pb-0">
          <Button onClick={startNewChat} className="w-full mb-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-normal text-sm py-2 px-3 rounded-md transition-colors duration-200 flex items-center justify-start">
            <PlusCircle className="mr-2 h-4 w-4" />
            <span>New Chat</span>
          </Button>
          <div className="relative !mb-4">
            <Input
              placeholder="Search"
              className="w-full pl-10 focus:ring-0 focus:border-gray-700 focus-visible:ring-0"
              onChange={(e) => setRepoFilter(e.target.value)}
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          </div>
          <Separator className="!mt-0" />
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-210px)]">
            {chats
              .filter(chat => chat.repo.name.toLowerCase().includes(repoFilter.toLowerCase()))
              .map((chat) => (
                <div
                  key={chat.id}
                  className={`p-3 flex items-center cursor-pointer transition-colors ${
                    chat.id === chatId ? 'bg-gray-300' : 'hover:bg-gray-200'
                  }`}
                  onClick={() => navigate(`/chat/${chat.repoId}/${chat.id}`)}
                >
                  <MessageSquare className="flex-shrink-0 mr-2 h-4 w-4" />
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-medium text-sm truncate">{chat.repo.name}</span>
                    <span className="text-xs text-gray-500 truncate max-w-48 inline-block">
                      {chat.messages.find(msg => msg.senderType === 'USER' && msg.parentId === null)?.content}
                    </span>
                  </div>
                </div>
              ))
            }
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Interface */}
      <Card className="flex-1 flex flex-col relative overflow-hidden rounded-none border-l-0">
        <CardHeader className="bg-white bg-opacity-30 backdrop-filter backdrop-blur-md border-none shadow-none sticky top-0 z-10 py-2">
          <h1 className="text-xl font-medium text-center">
            Chatting with {repo?.name || 'Repository'}
          </h1>
        </CardHeader>

        <CardContent className="flex-1 px-4 pb-0 overflow-auto">
          <ScrollArea className="h-full">
            {currentChat?.messages && renderMessageTree(currentChat.messages)}
            <div ref={messagesEndRef} />
          </ScrollArea>
        </CardContent>

        <CardFooter className="p-4 bg-white border-t sticky bottom-0 z-10">
          <div className="flex w-full">
            <Input
              value={message}
              onChange={(e) => {setMessage(e.target.value); console.log("message", message)}}
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

export default React.memo(ChatInterface);

const markdownComponents = {
  h1: ({ node, ...props }) => <h1 className="text-xl font-bold my-4" {...props} />,
  h2: ({ node, ...props }) => <h2 className="text-lg font-semibold my-3" {...props} />,
  h3: ({ node, ...props }) => <h3 className="text-base font-bold my-2" {...props} />,
  p: ({ node, ...props }) => <p className="my-2" {...props} />,
  ul: ({ node, ...props }) => <ul className="list-disc list-inside my-2" {...props} />,
  ol: ({ node, ...props }) => <ol className="list-decimal list-outside pl-6 my-2" {...props} />,
  li: ({ node, ...props }) => <li className="my-1" {...props} />,
  code: ({ node, inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    return !inline && match ? (
      <SyntaxHighlighter
        style={oneLight}
        language={match[1]}
        PreTag="div"
        className="bg-white dark:bg-gray-100 rounded p-2 my-2 overflow-x-auto"
        {...props}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    ) : (
      <code className="bg-gray-100 rounded p-1 my-1 overflow-x-auto font-mono text-sm" {...props}>
        {children}
      </code>
    );
  },
  blockquote: ({ node, ...props }) => (
    <blockquote className="border-l-4 border-gray-300 pl-4 italic my-2" {...props} />
  ),
};

function renderMessage(content) {
  const renderMarkdown = (text) => (
    <div className="markdown-content">
      <ReactMarkdown components={markdownComponents}>
        {text}
      </ReactMarkdown>
    </div>
  );

  try {
    const parsedContent = JSON.parse(content);
    const afterAnnotationsRemoved = removeAnnotations(parsedContent.value);
    return renderMarkdown(afterAnnotationsRemoved);
  } catch (error) {
    return renderMarkdown(content);
  }
}

function removeAnnotations(content) {
  return content.replace(/【[\d:]+†source】/g, '');
}
