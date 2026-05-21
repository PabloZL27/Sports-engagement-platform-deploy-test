import { Routes, Route, useLocation } from "react-router-dom";
import MatchesPage from "./pages/MatchesPage";
import MatchRoomPage from "./pages/MatchRoomPage";
import StorePage from "./pages/StorePage";
import PaySuccess from "./pages/paySuccess";
import OffSeasonPage from "./pages/OffSeasonPage";
import TeamPage from "./pages/TeamPage";
import HistoryPage from "./pages/HistoryPage";
import VoiceAgent from "./components/VoiceAgent/VoiceAgent";
import PrivateRoute from "./components/auth/privateRoute";
import NewsPage from "./pages/NewsPage";
import ProfilePage from "./pages/ProfilePage";
import HomePage from "./pages/HomePage";
import CommunityPage from "./pages/CommunityPage";
import AdminPage from "./pages/AdminPage";
import AdminRoute from "./components/admin/AdminRoute";
import UserRoute from "./components/user/UserRoute";
import { CartProvider } from "./context/CartContext";
import ProductDetailPage from "./pages/ProductDetailPage";
import AddedToCartToast from "./components/store/AddedToCartToast";
import FeedbackDrawer from "./components/feedback/FeedbackDrawer";
import { Auth } from "./context/AuthContext";

function App() {
  const { session } = Auth();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  return (
    <CartProvider>
      <AddedToCartToast />
      <>
        <Routes>
          <Route
            path="/"
            element={
              <UserRoute>
                <HomePage />
              </UserRoute>
            }
          />
          <Route
            path="/matches"
            element={
              <UserRoute>
                <MatchesPage />
              </UserRoute>
            }
          />
          <Route
            path="/matches/:id"
            element={
              <UserRoute>
                <MatchRoomPage />
              </UserRoute>
            }
          />
          <Route
            path="/team"
            element={
              <UserRoute>
                <PrivateRoute>
                  <TeamPage />
                </PrivateRoute>
              </UserRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <UserRoute>
                <PrivateRoute>
                  <ProfilePage />
                </PrivateRoute>
              </UserRoute>
            }
          />
          <Route
            path="/community"
            element={
              <UserRoute>
                <CommunityPage />
              </UserRoute>
            }
          />
          <Route
            path="/history"
            element={
              <UserRoute>
                <HistoryPage />
              </UserRoute>
            }
          />
          <Route
            path="/store"
            element={
              <UserRoute>
                <StorePage />
              </UserRoute>
            }
          />
          <Route
            path="/store/product/:id"
            element={
              <UserRoute>
                <ProductDetailPage />
              </UserRoute>
            }
          />
          <Route
            path="/paySuccess"
            element={
              <UserRoute>
                <PaySuccess />
              </UserRoute>
            }
          />
          <Route
            path="/offseason"
            element={
              <UserRoute>
                <OffSeasonPage />
              </UserRoute>
            }
          />
          <Route
            path="/voice-agent"
            element={
              <UserRoute>
                <VoiceAgent />
              </UserRoute>
            }
          />
          <Route
            path="/news"
            element={
              <UserRoute>
                <NewsPage />
              </UserRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            }
          />
        </Routes>
        {session && !isAdminRoute ? <FeedbackDrawer /> : null}
      </>
    </CartProvider>
  );
}

export default App;
