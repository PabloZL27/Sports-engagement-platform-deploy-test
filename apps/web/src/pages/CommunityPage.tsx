import { useState } from "react";
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

  const categoryProps = {
    activeCategory,
    onSelectCategory: setActiveCategory,
  };

  const barProps = {
    onCreatePost: handleCreatePostClick,
    activeFilter,
    setActiveFilter,
  };

  const postsProps = {
    activeFilter,
    activeCategory,
    refreshKey,
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F4F5F7]">
      <main className="page-main max-w-full overflow-x-hidden lg:mx-auto lg:w-full lg:max-w-[1400px] lg:px-6 lg:pb-6">
        {/* Mobile: single column */}
        <div className="mx-auto w-full min-w-0 max-w-4xl space-y-5 sm:space-y-6 lg:hidden">
          <CommunityHeader />
          <PostCategories {...categoryProps} />
          <CommunityBar {...barProps} />
          <PostComp {...postsProps} />
          <div className="space-y-5 pb-6 pt-2 sm:space-y-6">
            <TopContributor />
            <TopContributors />
          </div>
        </div>

        {/* Desktop: sidebar + main content */}
        <div className="hidden items-start gap-6 lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="space-y-8">
            <PostCategories {...categoryProps} />
            <TopContributor />
            <TopContributors />
          </div>

          <div className="min-w-0 space-y-6">
            <CommunityHeader />
            <CommunityBar {...barProps} />
            <PostComp {...postsProps} />
          </div>
        </div>

        <ModalComp
          isOpen={isOpen}
          onOpenChange={setIsOpen}
          children={
            <NewPostForm
              onSwitchOpenModal={setIsOpen}
              onSuccess={() => {
                setIsOpen(false);
                setRefreshKey((k) => k + 1);
              }}
            />
          }
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
