import { useState } from "react";
import { SignOutButton } from "../components/auth/Signout";
import Dashboard from "../components/admin/Dashboard";
import StoreManagment from "../components/admin/StoreManagement";
import PostManagement from "../components/admin/PostManagement";
import SuggestionBox from "../components/admin/SuggestionBox";
import SidebarMenuAdmin from "../components/admin/SidebarMenuAdmin";
import "../styles/admin.css";
import "../styles/profile.css";
import NavBarAdmin from "../components/admin/NavBarAdmin";

function AdminPage() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  return (
    <div className="home-page">
      <main className="home-container">
        <NavBarAdmin />
        <section className="profile-layout">
          <SidebarMenuAdmin
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />

          <div className="profile-content">
            {activeTab === "dashboard" && <Dashboard />}

            {activeTab === "cReports" && <PostManagement />}

            {activeTab === "storeManagement" && <StoreManagment />}

            {activeTab === "suggestion" && <SuggestionBox />}
          </div>
        </section>
      </main>
    </div>
  );
}

export default AdminPage;