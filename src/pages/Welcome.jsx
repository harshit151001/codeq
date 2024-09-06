import { useAuth } from "../contexts/AuthContext";
import { Navigate } from "react-router-dom";
import codeq from "@/assets/codeq.png";
import { Github } from "lucide-react";

function Welcome() {
  const { user, login } = useAuth();

  if (user) {
    return <Navigate to="/repositories" replace />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-100 to-gray-300 w-full">
      <div className="max-w-4xl mx-auto text-center px-4 animate-fade-in">
        <h1 className="text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-gray-600 to-slate-800 animate-gradient">
          AI Expert on your Technical Infrastructure
        </h1>
        <p className="text-xl mb-8 text-gray-600 animate-slide-up">
          Revolutionize your coding experience with AI-powered insights and collaboration.
        </p>
        <button
          onClick={login}
          className="bg-gradient-to-r mx-auto from-gray-600 to-slate-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition duration-300 ease-in-out flex items-center justify-center hover:scale-105 active:scale-95"
        >
          <Github className="mr-2" size={20} />
          Login with GitHub
        </button>
        <div className="mt-12 animate-fade-in-up">
          <img src={codeq} alt="Codeq" className="rounded-lg shadow-2xl max-w-full h-auto" />
        </div>
      </div>
    </div>
  );
}

export default Welcome;
