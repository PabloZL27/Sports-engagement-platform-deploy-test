import { Card } from "@heroui/react";
import "../../styles/profile.css";

type SidebarMenuProps = {
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
};

function SidebarMenuAdmin({ activeTab, setActiveTab }: SidebarMenuProps) {
  return (
    <Card className="profile-sidebar-card admin-sidebar-card">
      <button
        className={`profile-sidebar-item ${activeTab === "dashboard" ? "active" : ""}`}
        onClick={() => setActiveTab("dashboard")}
      >
        Dashboard
      </button>

      <button
        className={`profile-sidebar-item ${activeTab === "cReports" ? "active" : ""}`}
        onClick={() => setActiveTab("cReports")}
      >
        Community Reports
      </button>

      <button
        className={`profile-sidebar-item ${activeTab === "storeManagement" ? "active" : ""}`}
        onClick={() => setActiveTab("storeManagement")}
      >
        Store Management
      </button>
      <button
        className={`profile-sidebar-item ${activeTab === "suggestion" ? "active" : ""}`}
        onClick={() => setActiveTab("suggestion")}
      >
        Suggestion Box
      </button>
    </Card>
  );
}

export default SidebarMenuAdmin;