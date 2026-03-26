import { Link } from "react-router-dom";
import { GraduationCap, MapPin, Phone, Mail } from "lucide-react";

const Footer = () => {
  return (
    <footer className="gradient-hero text-primary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <span className="font-heading font-bold text-lg block">GHS Babi Khel</span>
                <span className="text-sm opacity-80">Excellence in Education</span>
              </div>
            </div>
            <p className="text-sm opacity-80 leading-relaxed">
              Government High School Babi Khel is committed to providing quality education
              and nurturing the future leaders of Pakistan.
            </p>
          </div>

          <div>
            <h4 className="font-heading font-semibold mb-4">Quick Links</h4>
            <div className="grid grid-cols-2 gap-2">
              {["About", "Teachers", "Notices", "News", "Results", "Gallery", "Library"].map((link) => (
                <Link
                  key={link}
                  to={`/${link.toLowerCase()}`}
                  className="text-sm opacity-80 hover:opacity-100 transition-opacity"
                >
                  {link}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-heading font-semibold mb-4">Contact</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0 opacity-80" />
                <span className="opacity-80">Babi Khel, District Mohmand, KPK, Pakistan</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 shrink-0 opacity-80" />
                <span className="opacity-80">EMIS Code: 60673</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 shrink-0 opacity-80" />
                <span className="opacity-80">ghsbabkhel@edu.pk</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/20 mt-8 pt-6 text-center text-sm opacity-70">
          © {new Date().getFullYear()} GHS Babi Khel. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
