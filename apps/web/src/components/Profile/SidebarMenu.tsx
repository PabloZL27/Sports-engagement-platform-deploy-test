import { Card } from "@heroui/react";
import "../../styles/profile.css";

type SidebarMenuProps = {
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
};

function SidebarMenu({ activeTab, setActiveTab }: SidebarMenuProps) {
  return (
    <Card className="profile-sidebar-card">
      <button
        className={`profile-sidebar-item ${activeTab === "personal" ? "active" : ""}`}
        onClick={() => setActiveTab("personal")}
      >
        Personal Info
      </button>

      <button
        className={`profile-sidebar-item ${activeTab === "addresses" ? "active" : ""}`}
        onClick={() => setActiveTab("addresses")}
      >
        Addresses
      </button>

      <button
        className={`profile-sidebar-item ${activeTab === "badges" ? "active" : ""}`}
        onClick={() => setActiveTab("badges")}
      >
        Badges
      </button>

      <button
        className={`profile-sidebar-item ${activeTab === "Posts History" ? "active" : ""}`}
        onClick={() => setActiveTab("Posts History")}
      >
        Posts History
      </button>
    </Card>
  );
}

export default SidebarMenu;