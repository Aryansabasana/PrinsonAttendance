import { Suspense } from "react";
import { DailyRegisterView } from "@/components/views/DailyRegisterView";

export default function DailyAttendanceRegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <DailyRegisterView company="plynest" />
    </Suspense>
  );
}
