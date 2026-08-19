import { useState, useEffect } from "react";
import { Download } from "lucide-react";

const CATEGORIES = [
  "Bugs & Glitches",
  "Performance & Stability",
  "Monetization & Ads",
  "Gameplay & Balance",
  "Progression & Rewards",
  "Matchmaking & Servers",
  "Customer Support",
  "UI & UX",
  "Other"
];

export default function ReviewExplorer({ games }: { games: any }) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const fetchReviews = () => {
    setLoading(true);
    const searchParams = new URLSearchParams();
    if (query) searchParams.append("query", query);
    if (category !== "All") searchParams.append("category", category);

    fetch(`/api/reviews?${searchParams.toString()}`)
      .then(res => res.json())
      .then(data => {
        setReviews(data.reviews || []);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchReviews();
  }, [category]); // Auto search on category change

  const handleSearch = (e: any) => {
    e.preventDefault();
    fetchReviews();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6 flex-shrink-0">
        <h2 className="text-2xl font-bold text-white mb-2">Real-Time Review Explorer</h2>
        <p className="text-sm text-slate-400 mb-6">Search, filter, and export the raw review database.</p>
        
        <form onSubmit={handleSearch} className="flex space-x-4">
          <input 
            type="text" 
            placeholder="Search text / keyword"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-[#1e293b] border border-[#28334e] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-48 bg-[#1e293b] border border-[#28334e] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
            Search
          </button>
        </form>
      </div>

      <div className="bg-[#101524] border border-[#28334e] rounded-xl overflow-hidden flex-1 flex flex-col min-h-[400px]">
        <div className="flex justify-between items-center p-4 border-b border-[#28334e]">
          <span className="text-sm text-slate-300 font-medium">Showing {reviews.length} reviews:</span>
          <button className="flex items-center text-sm text-indigo-400 hover:text-indigo-300 font-medium">
            <Download size={16} className="mr-2" /> Export CSV
          </button>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No reviews found matching filters.</div>
        ) : (
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#161d31] border-b border-[#28334e] text-slate-300 sticky top-0">
                <tr>
                  <th className="px-4 py-3 font-semibold">Game</th>
                  <th className="px-4 py-3 font-semibold">Stars</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Sentiment</th>
                  <th className="px-4 py-3 font-semibold">Review Text</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r, i) => (
                  <tr key={i} className="border-b border-[#1e293b] last:border-0 hover:bg-[#131828] transition-colors">
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{games[r.game]?.name || r.game}</td>
                    <td className="px-4 py-3 text-amber-400 font-bold whitespace-nowrap">{r.rating} ★</td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{r.review_date?.substring(0, 10)}</td>
                    <td className="px-4 py-3 text-indigo-300 whitespace-nowrap">{r.primary_category || "-"}</td>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{r.sentiment || "-"}</td>
                    <td className="px-4 py-3 text-slate-300 min-w-[300px]">{r.review_text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
