import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import OverviewTab from "./tabs/OverviewTab";
import TimetableTab from "./tabs/TimetableTab";
import ResultsTab from "./tabs/ResultsTab";
import NoticesTab from "./tabs/NoticesTab";
import NewsTab from "./tabs/NewsTab";
import LibraryTab from "./tabs/LibraryTab";
import GalleryTab from "./tabs/GalleryTab";
import AchievementsTab from "./tabs/AchievementsTab";
import TeachersTab from "./tabs/TeachersTab";
import ProfileTab from "./tabs/ProfileTab";

const tabComponents: Record<string, React.ComponentType<any>> = {
  overview: OverviewTab,
  timetable: TimetableTab,
  results: ResultsTab,
  notices: NoticesTab,
  news: NewsTab,
  library: LibraryTab,
  gallery: GalleryTab,
  achievements: AchievementsTab,
  teachers: TeachersTab,
  profile: ProfileTab,
};

const UserDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");

  const TabComponent = tabComponents[activeTab] || OverviewTab;
  const isOverview = activeTab === "overview";

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {isOverview ? (
        <TabComponent onNavigate={setActiveTab} />
      ) : (
        <TabComponent />
      )}
    </DashboardLayout>
  );
};

export default UserDashboard;
