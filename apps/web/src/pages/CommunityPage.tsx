import { useState } from "react";
import Navbar from "../components/layout/Navbar";
import { ModalComp } from "../components/general/modal";
import { NewPostForm } from "../components/community/newPostForm";
import CommunityHeader from "../components/community/header";
import PostComp from "../components/community/posts";
import TopContributors from "../components/community/topContributors";
import PostCategories from "../components/community/postsCategories";
import CommunityBar from "../components/community/communityBar";
import TopContributor from "../components/community/topContributor";
import { Auth } from "../context/AuthContext";
import { SigninWithEmailForm } from "../components/auth/SignInForm";
import { SignupForm } from "../components/auth/SignUpForm";

function CommunityPage() {
  const { session } = Auth();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [authView, setAuthView] = useState<"signup" | "signin">("signin");
  const [pendingCreatePost, setPendingCreatePost] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<"hot" | "new">("hot");
  const [activeCategory, setActiveCategory] = useState<string>("All Topics");
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const handleCreatePostClick = () => {
    if (session) {
      setIsOpen(true);
      return;
    }

    setPendingCreatePost(true);
    setAuthView("signin");
    setIsAuthOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7]">
      <main className="mx-auto w-full max-w-350 p-6">
        <Navbar />
        <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="space-y-8">
            <PostCategories
              activeCategory={activeCategory}
              onSelectCategory={setActiveCategory}
            />
            <TopContributor /> 
            <TopContributors />
          </div>
          
          <div className="space-y-6">
            <CommunityHeader />
            <CommunityBar onCreatePost={handleCreatePostClick} activeFilter={activeFilter} setActiveFilter={setActiveFilter}/>
            <PostComp activeFilter={activeFilter} activeCategory={activeCategory} refreshKey={refreshKey} />
          </div>
        </div>
        <ModalComp 
          isOpen={isOpen}
          onOpenChange={setIsOpen}
          children={<NewPostForm onSwitchOpenModal={setIsOpen} onSuccess={() => { setIsOpen(false); setRefreshKey(k => k + 1); }} />}
        />
        <ModalComp
          isOpen={isAuthOpen}
          onOpenChange={setIsAuthOpen}
          children={
            authView === "signup" ? (
              <SignupForm
                onSuccess={() => {
                  setIsAuthOpen(false);
                  if (pendingCreatePost) {
                    setPendingCreatePost(false);
                    setIsOpen(true);
                  }
                }}
                onSwitchToSignIn={() => setAuthView("signin")}
              />
            ) : (
              <SigninWithEmailForm
                onSuccess={() => {
                  setIsAuthOpen(false);
                  if (pendingCreatePost) {
                    setPendingCreatePost(false);
                    setIsOpen(true);
                  }
                }}
                onSwitchToSignUp={() => setAuthView("signup")}
              />
            )
          }
        />
      </main>
    </div>
  );
}

export default CommunityPage;
