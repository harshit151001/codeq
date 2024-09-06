import { useState, useEffect } from "react";
import axios from "axios";
import { Loader2, CheckCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";


function Repositories() {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processedRepos, setProcessedRepos] = useState({});
  const [searchTerm, setSearchTerm] = useState("");

  const { user } = useAuth();

  useEffect(() => {
    fetchRepositories();
  }, []);

  const fetchRepositories = async () => {
    try {
      const response = await axios.get("http://localhost:8000/api/repos", {
        withCredentials: true,
      });
      setRepos(response.data);
      setLoading(false);
    } catch (err) {
      setError("Failed to fetch repositories");
      setLoading(false);
    }
  };

  const processRepo = async (owner, repo) => {
    try {
      await axios.get(`http://localhost:8000/api/repos/${owner}/${repo}`, {
        withCredentials: true,
      });
      setProcessedRepos(prev => ({ ...prev, [`${owner}/${repo}`]: true }));
    } catch (err) {
      console.error("Error processing repository:", err);
    }
  };

  const filteredRepos = repos.filter(repo => 
    repo.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (loading) return <Loader2 className="w-8 h-8 animate-spin mx-auto mt-8" />;
  if (error) return <div className="text-red-500 text-center mt-8">{error}</div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center">
      <h2 className="text-3xl font-bold mb-6">Your Repositories</h2>
      <input
        type="text"
        placeholder="Search repositories..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-4 p-2 border border-gray-300 rounded"
      />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRepos.map((repo) => (
          <Card 
            key={repo.id} 
            className={`transition-all duration-300 h-full ${
              processedRepos[`${repo.owner.login}/${repo.name}`] 
                ? "border-green-500 shadow-lg" 
                : "hover:shadow-md"
            }`}
          >
            <CardHeader>
              <CardTitle className="text-xl">{repo.name}</CardTitle>
              <CardDescription className="text-sm text-gray-600 overflow-hidden text-ellipsis whitespace-nowrap">
                {repo.description || "No description provided"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-between items-center">
              <span className="text-sm text-gray-500">
                {repo.language || "Unknown language"}
              </span>
              {processedRepos[`${repo.owner.login}/${repo.name}`] ? (
                <div className="flex items-center text-green-500">
                  <CheckCircle className="w-5 h-5 mr-1" />
                  <span className="text-sm">Processed</span>
                </div>
              ) : (
                <Button
                  onClick={() => processRepo(repo.owner.login, repo.name)}
                  variant="outline"
                  size="sm"
                >
                  Process
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default Repositories;