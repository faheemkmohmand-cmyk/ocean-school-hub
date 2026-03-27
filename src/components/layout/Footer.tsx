import { Link } from "react-router-dom";
import { GraduationCap, MapPin, Phone, Mail, ExternalLink } from "lucide-react";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";

const footerLinks = {
  quickLinks: [
    { to: "/about", label: "About Us" },
    { to: "/teachers", label: "Our Teachers" },
    { to: "/notices", label: "Notices" },
    { to: "/news", label: "Latest News" },
    { to: "/results", label: "Results" },
  ],
  classes: [
    { label: "Class 6" },
    { label: "Class 7" },
    { label: "Class 8" },
    { label: "Class 9" },
    { label: "Class 10" },
  ],
  resources: [
    { to: "/library", label: "Digital Library" },
    { to: "/gallery", label: "Photo Gallery" },
    { to: "/results", label: "Exam Results" },
    { to: "/library", label: "Past Papers" },
    { to: "/library", label: "Study Notes" },
  ],
};

const Footer = () => {
  const { data: settings } = useSchoolSettings();

  return (
    <footer className="bg-[#042C53] text-white">
      <div className="container mx-auto px-4 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-6">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              {settings?.logo_url ? (
                <img src={settings.logo_url} alt="Logo" className="w-10 h-10 rounded-xl object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6" />
                </div>
              )}
              <div>
                <span className="font-heading font-bold text-lg block">
                  {settings?.school_name || "GHS Babi Khel"}
                </span>
                <span className="text-sm text-white/60">
                  {settings?.tagline || "Excellence in Education"}
                </span>
              </div>
            </div>
            <p className="text-sm text-white/60 leading-relaxed max-w-xs mb-6">
              {settings?.description ||
                "Government High School Babi Khel is committed to providing quality education and nurturing the future leaders of Pakistan."}
            </p>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary-light" />
                <span className="text-white/70">{settings?.address || "Babi Khel, District Mohmand, KPK"}</span>
              </div>
              {settings?.phone && (
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 shrink-0 text-primary-light" />
                  <span className="text-white/70">{settings.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 shrink-0 text-primary-light" />
                <span className="text-white/70">{settings?.email || "ghsbabkhel@edu.pk"}</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-heading font-semibold text-sm uppercase tracking-wider mb-4 text-white/90">
              Quick Links
            </h4>
            <ul className="space-y-2.5">
              {footerLinks.quickLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-white/60 hover:text-white transition-colors flex items-center gap-1 group"
                  >
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Classes */}
          <div>
            <h4 className="font-heading font-semibold text-sm uppercase tracking-wider mb-4 text-white/90">
              Classes
            </h4>
            <ul className="space-y-2.5">
              {footerLinks.classes.map((c) => (
                <li key={c.label}>
                  <span className="text-sm text-white/60">{c.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-heading font-semibold text-sm uppercase tracking-wider mb-4 text-white/90">
              Resources
            </h4>
            <ul className="space-y-2.5">
              {footerLinks.resources.map((link, i) => (
                <li key={i}>
                  <Link
                    to={link.to}
                    className="text-sm text-white/60 hover:text-white transition-colors flex items-center gap-1 group"
                  >
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-white/50">
            © {new Date().getFullYear()} {settings?.school_name || "GHS Babi Khel"}. All rights reserved.
          </p>
          <p className="text-sm text-white/40">
            EMIS Code: {settings?.emis_code || "60673"}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
