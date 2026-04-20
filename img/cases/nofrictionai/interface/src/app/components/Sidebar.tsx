import { LayoutDashboard, Package, FileText, KanbanSquare, MessageSquare, Network, Folder, Book, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

const menuItems = [
  { icon: LayoutDashboard, label: "Visão Geral", active: true },
  { icon: Package, label: "Produto" },
  { icon: FileText, label: "Detalhes" },
  { icon: KanbanSquare, label: "Kanban" },
  { icon: MessageSquare, label: "Comentários" },
  { icon: Network, label: "Clusters" },
  { icon: Folder, label: "Fontes" },
];

export function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6">
        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
          <span className="text-white font-bold text-xl">N</span>
        </div>
      </div>

      {/* User Profile */}
      <div className="px-4 pb-6">
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
          <Avatar className="w-10 h-10">
            <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop" />
            <AvatarFallback>YZ</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate">Yuzo</p>
            <p className="text-xs text-slate-500 truncate">yuzo.demo@qok...</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.label}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              item.active
                ? "bg-emerald-50 text-emerald-700"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-sm">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Bottom Menu */}
      <div className="p-4 space-y-1 border-t border-slate-200">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-50 transition-all">
          <Book className="w-5 h-5" />
          <span className="text-sm">Documentação API</span>
        </button>
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-50 transition-all">
          <Settings className="w-5 h-5" />
          <span className="text-sm">Configurações</span>
        </button>
      </div>
    </aside>
  );
}
