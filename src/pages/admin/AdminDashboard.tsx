import { useState, lazy, Suspense } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Skeleton } from "@/components/ui/skeleton";

const AdminOverview          = lazy(() => import("./tabs/AdminOverview"));
const AdminPendingRequests   = lazy(() => import("./tabs/AdminPendingRequests"));
const AdminSchoolSettings    = lazy(() => import("./tabs/AdminSchoolSettings"));
const AdminTeachers          = lazy(() => import("./tabs/AdminTeachers"));
const AdminStudents          = lazy(() => import("./tabs/AdminStudents"));
const AdminResults           = lazy(() => import("./tabs/AdminResults"));
const AdminAttendance        = lazy(() => import("./tabs/AdminAttendance"));
const AdminTimetables        = lazy(() => import("./tabs/AdminTimetables"));
const AdminNotices           = lazy(() => import("./tabs/AdminNotices"));
const AdminNews              = lazy(() => import("./tabs/AdminNews"));
const AdminGallery           = lazy(() => import("./tabs/AdminGallery"));
const AdminLibrary           = lazy(() => import("./tabs/AdminLibrary"));
const AdminAchievements      = lazy(() => import("./tabs/AdminAchievements"));
const AdminUsers             = lazy(() => import("./tabs/AdminUsers"));
const AdminVideos            = lazy(() => import("./tabs/AdminVideos"));
const AdminExamRollNumbers   = lazy(() => import("./tabs/AdminExamRollNumbers"));

const tabMap: Record<string, React.LazyExoticComponent<() => JSX.Element>> = {
  overview:          AdminOverview,
  "pending-requests": AdminPendingRequests,
  settings:          AdminSchoolSettings,
  teachers:          AdminTeachers,
  students:          AdminStudents,
  results:           AdminResults,
  attendance:        AdminAttendance,
  timetables:        AdminTimetables,
  notices:           AdminNotices,
  news:              AdminNews,
  gallery:           AdminGallery,
  library:           AdminLibrary,
  achievements:      AdminAchievements,
  "exam-rolls":      AdminExamRollNumbers,
  videos:            AdminVideos,
  users:             AdminUsers,
};

const Fallback = () => (
  <div className="space-y-4">
    <Skeleton className="h-8 w-48" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
    </div>
    <Skeleton className="h-64 rounded-xl" />
  </div>
);

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const ActiveComponent = tabMap[activeTab] || AdminOverview;

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      <Suspense fallback={<Fallback />}>
        <ActiveComponent />
      </Suspense>
    </AdminLayout>
  );
};

export default AdminDashboard;
