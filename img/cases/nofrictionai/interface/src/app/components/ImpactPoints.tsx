import { Search, List, HelpCircle, MessageSquare, Copy, RotateCcw } from "lucide-react";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

const impactData = [
  {
    label: "Elogios ao Aplicativo",
    count: 122,
    percentage: 13.7,
    progress: 95,
    positive: 32.7,
    neutral: 5.3,
    negative: 0.3,
  },
  {
    label: "Elogios ao Produto",
    count: 110,
    percentage: 12.2,
    progress: 88,
    positive: 20.0,
    neutral: 2.6,
    negative: 0,
  },
  {
    label: "Comentários pouquíssimo detalhados",
    count: 81,
    percentage: 9.0,
    progress: 65,
    positive: 13.6,
    neutral: 2.3,
    negative: 2.1,
  },
  {
    label: "Comentários pouco detalhados",
    count: 71,
    percentage: 7.9,
    progress: 57,
    positive: 12.7,
    neutral: 0,
    negative: 1.2,
  },
  {
    label: "Problemas com Acesso e",
    count: 56,
    percentage: 6.2,
    progress: 45,
    positive: 0,
    neutral: 0,
    negative: 0,
  },
];

export function ImpactPoints() {
  return (
    <Card className="p-6 bg-white border-slate-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-slate-900">Pontos de Impacto</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="w-8 h-8">
            <Search className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="w-8 h-8">
            <List className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="w-8 h-8">
            <HelpCircle className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-5">
        {impactData.map((item, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-900">{item.label}</span>
                <span className="text-sm text-slate-400">
                  {item.count} ({item.percentage}%)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="w-7 h-7">
                  <MessageSquare className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="w-7 h-7">
                  <Copy className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="w-7 h-7">
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
                
                <div className="flex items-center gap-1 ml-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                    <span className="text-xs text-emerald-700">✓</span>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center">
                    <span className="text-xs text-amber-700">−</span>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-rose-100 flex items-center justify-center">
                    <span className="text-xs text-rose-700">✗</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
              <div className="flex gap-3 text-xs text-slate-500 min-w-[140px]">
                <span>{item.positive}%</span>
                <span>{item.neutral}%</span>
                <span>{item.negative}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
