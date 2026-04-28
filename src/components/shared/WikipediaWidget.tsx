import WikipediaSearch from "@/components/shared/WikipediaSearch";
import { BookOpen } from "lucide-react";

const WikipediaWidget = () => (
  <div className="bg-card rounded-2xl border border-border p-5 shadow-card">
    <div className="flex items-center gap-2 mb-4">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
        <BookOpen className="w-4 h-4 text-primary" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-foreground">Quick Research</h3>
        <p className="text-[11px] text-muted-foreground">Powered by Wikipedia</p>
      </div>
    </div>
    <WikipediaSearch compact />
  </div>
);

export default WikipediaWidget;
