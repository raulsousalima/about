import { Share2, Download, SlidersHorizontal, Sun, Moon, Bell, ChevronDown } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

export function Header() {
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <span>Organização</span>
              <span>/</span>
              <span>Atividade</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-slate-900">Demo / Cosméticos</h1>
              <span className="text-slate-400 text-sm">(demo)</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Exportar
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Share2 className="w-4 h-4" />
              Compartilhar
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              Filtros
            </Button>
            
            <div className="h-6 w-px bg-slate-200" />
            
            <Badge className="bg-emerald-500 hover:bg-emerald-600 gap-2">
              Mês Passado
              <ChevronDown className="w-3 h-3" />
            </Badge>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="rounded-full">
                <Sun className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Bell className="w-5 h-5" />
              </Button>
              <Avatar className="w-8 h-8">
                <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop" />
                <AvatarFallback>YZ</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
