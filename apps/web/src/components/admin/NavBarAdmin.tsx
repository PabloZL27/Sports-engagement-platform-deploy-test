import { SignOutButton } from "../auth/Signout";
import "../../styles/admin.css";

function NavBarAdmin() {
  return (
    <nav className="admin-navbar">
      <div className="admin-navbar-left">
        <div className="admin-brand-group">
          <img
            src="/team-logos/TitanCrew.svg"
            alt="Titans Crew"
            width={72}
            height={72}
            className="admin-logo-mark"
          />
          <h2 className="admin-brand">TITANS CREW</h2>
        </div>
      </div>

      <div className="admin-navbar-actions">
        <SignOutButton />
      </div>
    </nav>
  );
}

export default NavBarAdmin;
