import WikipediaSearch from "@/components/shared/WikipediaSearch";

const WikipediaTab = () => (
  <div className="space-y-4">
    <div className="flex items-center gap-2 mb-1">
      <h2 className="text-xl font-heading font-bold text-foreground">Wikipedia Research Tool</h2>
    </div>
    <p className="text-xs text-muted-foreground -mt-2 mb-4">
      Search any topic instantly — save favorites, use voice search, explore related articles.
    </p>
    <WikipediaSearch />
  </div>
);

export default WikipediaTab;
