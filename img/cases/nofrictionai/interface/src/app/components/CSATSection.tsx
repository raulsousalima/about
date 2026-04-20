import { HelpCircle } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";

export function CSATSection() {
  return (
    <Card className="p-6 bg-white border-slate-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-slate-900">CSAT</h2>
        <Button variant="ghost" size="icon" className="w-8 h-8">
          <HelpCircle className="w-4 h-4" />
        </Button>
      </div>

      <div className="text-center">
        <div className="text-xs text-slate-400 mb-4">Qtd. Clusterix</div>
        
        <div className="relative inline-flex items-center justify-center w-48 h-48 mb-4">
          {/* Background circle */}
          <svg className="w-48 h-48 -rotate-90">
            <circle
              cx="96"
              cy="96"
              r="80"
              stroke="currentColor"
              strokeWidth="16"
              fill="none"
              className="text-slate-100"
            />
            {/* Progress circle */}
            <circle
              cx="96"
              cy="96"
              r="80"
              stroke="url(#gradient)"
              strokeWidth="16"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 80}`}
              strokeDashoffset={`${2 * Math.PI * 80 * (1 - 0.59)}`}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#60a5fa" />
              </linearGradient>
            </defs>
          </svg>
          
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl text-slate-900">59%</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
