import { FileText, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * ResultCardTab — shown in user dashboard.
 * Links the student to the /result-card page where they can search
 * and download their printable result card.
 */
const ResultCardTab = () => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-heading font-bold text-foreground">Result Card</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Download or print your official result card
        </p>
      </div>

      <div className="bg-card rounded-2xl shadow-card p-8 text-center border border-border">
        <div className="w-16 h-16 rounded-2xl gradient-hero flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-primary-foreground" />
        </div>
        <h3 className="text-lg font-heading font-semibold text-foreground">
          Your Official Result Card
        </h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
          Search by your exam roll number or name to view and download your
          printable result card with subject-wise marks.
        </p>
        <Link
          to="/result-card"
          className="inline-flex items-center gap-2 mt-6 gradient-hero text-primary-foreground font-semibold px-6 py-3 rounded-xl shadow-card hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-200"
        >
          <FileText className="w-4 h-4" />
          Open Result Card
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Embedded result card page */}
      <div className="bg-card rounded-2xl shadow-card overflow-hidden border border-border">
        <div className="bg-secondary/50 px-4 py-2 border-b border-border flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Result Card Search</span>
        </div>
        <iframe
          src="/result-card"
          title="Result Card"
          className="w-full border-0"
          style={{ height: "700px" }}
        />
      </div>
    </div>
  );
};

export default ResultCardTab;
