// src/pages/dashboard/tabs/ExtraTab.tsx
// "Extra" hub — ISS Live Tracker + NASA Space Picture of the Day
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Satellite, Telescope } from "lucide-react";
import ISSTracker from "./ISSTracker";
import NASASpacePic from "./NASASpacePic";

const ExtraTab = () => (
  <div className="space-y-4">
    <div>
      <h2 className="text-xl font-heading font-bold text-foreground flex items-center gap-2">
        ✨ Extra
      </h2>
      <p className="text-sm text-muted-foreground mt-0.5">
        Space science · Live ISS tracker · NASA astronomy photos
      </p>
    </div>

    <Tabs defaultValue="iss" className="w-full">
      <TabsList className="flex w-full overflow-x-auto gap-1 h-auto p-1 justify-start">
        <TabsTrigger value="iss" className="gap-1.5 text-xs sm:text-sm shrink-0 px-3 py-2">
          <Satellite className="w-3.5 h-3.5" />
          <span>ISS Tracker</span>
        </TabsTrigger>
        <TabsTrigger value="nasa" className="gap-1.5 text-xs sm:text-sm shrink-0 px-3 py-2">
          <Telescope className="w-3.5 h-3.5" />
          <span>Space Picture</span>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="iss" className="mt-4">
        <ISSTracker />
      </TabsContent>
      <TabsContent value="nasa" className="mt-4">
        <NASASpacePic />
      </TabsContent>
    </Tabs>
  </div>
);

export default ExtraTab;
