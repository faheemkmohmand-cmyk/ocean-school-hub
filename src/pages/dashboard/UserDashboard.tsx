import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import OverviewTab from "./tabs/OverviewTab";
import TimetableTab from "./tabs/TimetableTab";
import ResultsTab from "./tabs/ResultsTab";
import NoticesTab from "./tabs/NoticesTab";
import NewsTab from "./tabs/NewsTab";
import LibraryTab from "./tabs/LibraryTab";
import GalleryTab from "./tabs/GalleryTab";
import VideosTab from "./tabs/VideosTab";
import AchievementsTab from "./tabs/AchievementsTab";
import TeachersTab from "./tabs/TeachersTab";
import ProfileTab from "./tabs/ProfileTab";
import RollNumbersTab from "./tabs/RollNumbersTab";
import ResultCardTab from "./tabs/ResultCardTab";
import TestsTab from "./tabs/TestsTab";
import MessagesTab from "./tabs/MessagesTab";
import AIAssistantTab from "./tabs/AIAssistantTab";
import DiscussionTab from "./tabs/DiscussionTab";

const tabComponents: Record<string, React.ComponentType<any>> = {
  overview:      OverviewTab,
  timetable:     TimetableTab,
  results:       ResultsTab,
  "exam-rolls":  RollNumbersTab,
  "result-card": ResultCardTab,
  notices:       NoticesTab,
  news:          NewsTab,
  library:       LibraryTab,
  gallery:       GalleryTab,
  videos:        VideosTab,
  achievements:  AchievementsTab,
  tests:         TestsTab,
  teachers:      TeachersTab,
  profile:       ProfileTab,
  "ai-assistant": AIAssistantTab,
  messages:      MessagesTab,
  discussion:    DiscussionTab,
};

const UserDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const TabComponent = tabComponents[activeTab] || OverviewTab;

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      <TabComponent onNavigate={setActiveTab} />
    </DashboardLayout>
  );
};

export default UserDashboard;
};

const UserDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const TabComponent = tabComponents[activeTab] || OverviewTab;

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      <TabComponent onNavigate={setActiveTab} />
    </DashboardLayout>
  );
};

export default UserDashboard;
