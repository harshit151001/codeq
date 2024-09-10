import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Welcome from "./pages/Welcome";
import Repositories from "./pages/Repositories";
import ProcessedRepos from "./pages/ProcessedRepos";
import { AuthProvider } from "./contexts/AuthContext";
import ChatInterface from "./pages/Chat";

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route
            path="*"
            element={      
              <div className="container mx-auto px-4 py-8 flex-1">
                <Routes>
                  <Route path="/repositories" element={<Repositories />} />
                  <Route path="/processed" element={<ProcessedRepos />} />               
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>            
            }
          />
          <Route path="/chat/:repoId/:chatId" element={<ChatInterface />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;
