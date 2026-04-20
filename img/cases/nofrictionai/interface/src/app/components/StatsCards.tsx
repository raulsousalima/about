import { Star, TrendingUp, Sparkles, HelpCircle } from "lucide-react";
import { Card } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

const reviewers = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
];

export function StatsCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {/* Average Rating */}
      <Card className="p-6 bg-white border-slate-200 hover:shadow-lg transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-slate-600 text-sm">Avaliação Média</h3>
          <HelpCircle className="w-4 h-4 text-slate-400" />
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-4xl text-slate-900">3.6</span>
        </div>
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-4 h-4 ${
                star <= 3
                  ? "fill-amber-400 text-amber-400"
                  : star === 4
                  ? "fill-amber-400/40 text-amber-400/40"
                  : "fill-slate-200 text-slate-200"
              }`}
            />
          ))}
        </div>
      </Card>

      {/* Total Reviews */}
      <Card className="p-6 bg-white border-slate-200 hover:shadow-lg transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-slate-600 text-sm">Total de Reviews</h3>
          <HelpCircle className="w-4 h-4 text-slate-400" />
        </div>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-4xl text-slate-900">899</span>
          <span className="text-slate-400">de 6431</span>
        </div>
        <div className="flex -space-x-2">
          {reviewers.map((src, i) => (
            <Avatar key={i} className="w-7 h-7 border-2 border-white">
              <AvatarImage src={src} />
              <AvatarFallback>U{i}</AvatarFallback>
            </Avatar>
          ))}
          <div className="w-7 h-7 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-xs text-white">
            +3
          </div>
        </div>
      </Card>

      {/* New Opportunities */}
      <Card className="p-6 bg-white border-slate-200 hover:shadow-lg transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-slate-600 text-sm">Novas Oportunidades</h3>
          <HelpCircle className="w-4 h-4 text-slate-400" />
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-4xl text-slate-900">28</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-emerald-600">
          <Sparkles className="w-4 h-4" />
          <span>para aumentar a sua nota</span>
        </div>
      </Card>

      {/* Sentiment Analysis */}
      <Card className="p-6 bg-white border-slate-200 hover:shadow-lg transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-slate-600 text-sm">Análise de Sentimentos</h3>
          <HelpCircle className="w-4 h-4 text-slate-400" />
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-1">
              <span className="text-emerald-600">😊</span>
            </div>
            <span className="text-2xl text-slate-900">59%</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-1">
              <span className="text-amber-600">😐</span>
            </div>
            <span className="text-2xl text-slate-900">4%</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-1">
              <span className="text-rose-600">😞</span>
            </div>
            <span className="text-2xl text-slate-900">37%</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
