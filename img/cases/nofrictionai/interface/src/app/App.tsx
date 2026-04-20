import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { StatsCards } from "./components/StatsCards";
import { ImpactPoints } from "./components/ImpactPoints";
import { TagsSection } from "./components/TagsSection";
import { CSATSection } from "./components/CSATSection";
import { ReclameSection } from "./components/ReclameSection";

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 min-h-screen">
          <Header />
          
          <div className="p-8 space-y-6">
            <StatsCards />
            
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 space-y-6">
                <ImpactPoints />
                <TagsSection />
              </div>
              
              <div className="space-y-6">
                <CSATSection />
                <ReclameSection />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
