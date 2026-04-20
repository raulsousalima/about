import { HelpCircle, ExternalLink } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";

export function ReclameSection() {
  return (
    <Card className="p-6 bg-gradient-to-br from-rose-500 to-rose-600 border-0 text-white">
      <div className="flex items-center justify-between mb-4">
        <h2>Reclame AQUI</h2>
        <Button variant="ghost" size="icon" className="w-8 h-8 text-white hover:bg-white/20">
          <HelpCircle className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between py-3 border-b border-white/20">
          <span className="text-sm">Reclamações ativas</span>
          <span className="text-xl">12</span>
        </div>
        
        <div className="flex items-center justify-between py-3 border-b border-white/20">
          <span className="text-sm">Taxa de resposta</span>
          <span className="text-xl">87%</span>
        </div>
        
        <div className="flex items-center justify-between py-3">
          <span className="text-sm">Tempo médio</span>
          <span className="text-xl">4.2h</span>
        </div>

        <Button className="w-full bg-white text-rose-600 hover:bg-white/90 gap-2 mt-4">
          Ver detalhes
          <ExternalLink className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
