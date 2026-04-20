import { Search, List, HelpCircle } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";

const tagsData = [
  { label: "app erro", count: 21, progress: 84, color: "from-rose-500 to-rose-400" },
  { label: "app trava", count: 20, progress: 80, color: "from-amber-500 to-amber-400" },
  { label: "app lento", count: 17, progress: 68, color: "from-emerald-500 to-emerald-400" },
  { label: "suporte ausente", count: 16, progress: 64, color: "from-emerald-500 to-emerald-400" },
  { label: "compra bloqueada", count: 14, progress: 56, color: "from-emerald-500 to-emerald-400" },
  { label: "busca difícil", count: 13, progress: 52, color: "from-slate-400 to-slate-300" },
];

export function TagsSection() {
  return (
    <Card className="p-6 bg-white border-slate-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-slate-900">Tags</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Qtd. Clusterix</span>
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

      <div className="space-y-4">
        {tagsData.map((tag, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-900">{tag.label}</span>
              <span className="text-sm text-slate-900">{tag.count}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${tag.color} rounded-full`}
                style={{ width: `${tag.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
