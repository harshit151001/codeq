import { useState, useEffect } from "react";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate, Navigate } from "react-router-dom";
import { v4 as uuid } from "uuid";
import { useAuth } from "@/contexts/AuthContext";

function ProcessedRepos() {
  const [processedRepos, setProcessedRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const { user } = useAuth();

  useEffect(() => {
    fetchProcessedRepos();
  }, []);

  const fetchProcessedRepos = async () => {
    try {
      const response = await axios.get(
        "http://localhost:8000/api/processed-repos",
        { withCredentials: true }
      );
      setProcessedRepos(response.data);
      setLoading(false);
    } catch (err) {
      setError("Failed to fetch processed repositories");
      setLoading(false);
    }
  };

  if (!user) {
    return <Navigate to="/" replace />;
  }
  if (loading) return <Loader2 className="w-8 h-8 animate-spin mx-auto mt-8" />;
  if (error) return <div className="text-center text-red-500">{error}</div>;

  return (
    <div className="p-4">
      <h2 className="text-3xl font-bold mb-6">Processed Repositories</h2>
      {processedRepos.length === 0 ? (
        <p className="text-center text-gray-500">No processed repositories yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {processedRepos.map((repo) => (
            <Card 
              key={repo.id} 
              className={`transition-all duration-300 h-full hover:shadow-md`}
            >
              <CardHeader>
                <CardTitle className="text-xl">{repo.name}</CardTitle>
                <CardDescription className="text-sm text-gray-600">Owner: {repo.owner}</CardDescription>
                <CardDescription className="text-sm text-gray-600">
                  Processed at: {new Date(repo.createdAt).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-end">
                <Button
                  onClick={() => navigate(`/chat/${repo.id}/${uuid()}`)}
                  variant="outline"
                  size="sm"
                >
                  Chat
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProcessedRepos;
