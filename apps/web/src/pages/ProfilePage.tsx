import { useEffect, useState } from "react";
import { Auth } from "../context/AuthContext";
import Navbar from "../components/layout/Navbar";
import SidebarMenu from "../components/Profile/SidebarMenu";
import PersonalInfo from "../components/Profile/PersonalInfo";
import Addresses from "../components/Profile/Addresses";
import Badges from "../components/Profile/Badges";
import "../styles/profile.css";
import AddressModal from "../components/Profile/AddressModal";
import { supabase } from "../supabaseClient";
import { Post } from "../types/community";
import UserPosts from "../components/Profile/UserPosts";
import { incrementPostUpvote } from "../services/communityService";

import {
  getMyAddresses,
  createMyAddress,
  updateMyAddress,
  deleteMyAddress,
  updateMyProfile,
  getMyBadges,
  type Address,
  type AddressPayload,
  type UpdateProfilePayload,
  type UserBadge,
} from "../services/profile";
import { getUserPosts } from "../services/communityService";
import { ModalComp } from "../components/general/modal";
import PostDetail from "../components/community/postDetail";
import RepliesList from "../components/community/repliesList";
import NewReply from "../components/community/newReply";


function ProfilePage() {
  const { session } = Auth();
  
  const [activeTab, setActiveTab] = useState<string>("personal");
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [isLoadingBadges, setIsLoadingBadges] = useState(false);
  const [badgesError, setBadgesError] = useState<string | null>(null);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [addressesError, setAddressesError] = useState<string | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [expandedPostId, setExpandedPostId] = useState<number | null>(null);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [upvotedPosts, setUpvotedPosts] = useState<Set<number>>(new Set());
  const [open, setIsOpen] = useState<boolean>(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const fetchProfile = async () => {
    try {
      const res = await fetch("http://localhost:8081/profile/me", {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      const data = await res.json();

      if (data.status === "success") {
        setProfile(data.profile);
      } else {
        console.error(data);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAddresses = async () => {
    try {
      setIsLoadingAddresses(true);
      setAddressesError(null);

      const data = await getMyAddresses();
      setAddresses(data);
    } catch (error) {
      console.error("Error loading addresses:", error);
      setAddressesError("Could not load addresses");
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  const handleRemoveAddress = async (addressId: number) => {
    try {
        const confirmDelete = confirm("Are you sure you want to delete this address?");
        if (!confirmDelete) return;

        console.log("Deleting address with id:", addressId);

        const deletedId = await deleteMyAddress(addressId);
        console.log("Deleted successfully:", deletedId);

        setAddresses((prev) =>
        prev.filter((address) => address.address_id !== deletedId)
        );
    } catch (error) {
        console.error("Error deleting address:", error);
    }
    };

  const handleCreateAddress = async (payload: AddressPayload) => {
    try {
        const newAddress = await createMyAddress(payload);

        if (newAddress.is_default) {
        setAddresses((prev) => [
            newAddress,
            ...prev.map((address) => ({
            ...address,
            is_default: false,
            })),
        ]);
        } else {
        setAddresses((prev) => [...prev, newAddress]);
        }
    } catch (error) {
        console.error("Error creating address:", error);
        throw error;
    }
    };

  const handleSaveProfile = async (formData: {
    first_name: string;
    last_name: string;
    username: string;
    }) => {
    try {
        const payload: UpdateProfilePayload = {
        first_name: formData.first_name?.trim() || null,
        last_name: formData.last_name?.trim() || null,
        username: formData.username?.trim() || null,
        country: profile?.country || null,
        avatar_url: profile?.avatar_url || null,
        };

        const updatedProfile = await updateMyProfile(payload);
        setProfile(updatedProfile);

        console.log("Profile updated successfully");
    } catch (error) {
        console.error("Error updating profile:", error);
        alert("Could not update profile.");
    }
    };

  const handleUpdateAddress = async (
    addressId: number,
    payload: AddressPayload
  ) => {
    try {
      const updatedAddress = await updateMyAddress(addressId, payload);

      setAddresses((prev) =>
        prev.map((address) => {
          if (updatedAddress.is_default) {
            if (address.address_id === updatedAddress.address_id) {
              return updatedAddress;
            }

            return {
              ...address,
              is_default: false,
            };
          }

          return address.address_id === updatedAddress.address_id
            ? updatedAddress
            : address;
        })
      );
    } catch (error) {
      console.error("Error updating address:", error);
    }
  };

  const loadBadges = async () => {
    try {
        setIsLoadingBadges(true);
        setBadgesError(null);

        const data = await getMyBadges();
        setBadges(data);
    } catch (error) {
        console.error("Error loading badges:", error);
        setBadgesError("Could not load badges");
    } finally {
        setIsLoadingBadges(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    const MAX_SIZE = 2 * 1024 * 1024;
    const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/gif"];

    if (!ALLOWED_TYPES.includes(file.type)) {
      alert("Only JPG, PNG or GIF allowed");
      return;
    }

    if (file.size > MAX_SIZE) {
      alert("File must be smaller than 2MB");
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const user = session?.user;
    if (!user) {
      alert("User not authenticated");
      return;
    }

    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/avatar-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, {
        upsert: true,
      });

    if (uploadError) {
      console.error(uploadError);
      alert("Error uploading image");
      return;
    }

    const { data } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const publicUrl = data.publicUrl;

    const updatedProfile = await updateMyProfile({
      avatar_url: publicUrl,
    });

    setProfile(updatedProfile);
  };

  const loadUserPosts = async () => {
    try {
      setLoadingPosts(true);
      const data = await getUserPosts();
      setUserPosts(data);
    } catch(error) {
      console.error("Error loading badges:", error);
    } finally {
      setLoadingPosts(false);
    }
  };


  const handleLikeClick = async (
      postId: number
    ) => {
        // prevent double-like client-side
      if (!session?.user.id) {
        setIsOpen(true);
        return;
      }
      if (upvotedPosts.has(postId)) {
        // already liked by this user on client
        return;
      }
  
      try {
        const updatedUpvotes = await incrementPostUpvote(postId);
  
        setUserPosts((currentPosts) =>
          currentPosts.map((post) =>
            post.post_id === postId
              ? { ...post, upvotes_count: updatedUpvotes }
              : post
          )
        );
  
        // persist client-side that this user has upvoted this post
        setUpvotedPosts((prev) => {
          const next = new Set(prev);
          next.add(postId);
          try {
            const userKey = session?.user?.id ? `upvoted_${session.user.id}` : "upvoted_guest";
            localStorage.setItem(userKey, JSON.stringify(Array.from(next)));
          } catch (e) {
            // ignore
          }
          return next;
        });
      } catch (err) {
        console.error("Error incrementing post upvote:", err);
      }
  };

  const handleTogglePostDetails = async (postId: number) => {
      const isExpanding = expandedPostId !== postId;
      setExpandedPostId(isExpanding ? postId : null);
  
      if (!isExpanding) return;
    };
  

  useEffect(() => {
    if (session) {
      fetchProfile();
      loadAddresses();
      loadBadges();
      loadUserPosts();
    } else {
      setLoading(false);
    }
  }, [session]);

  const openAddModal = () => {
    setIsAddressModalOpen(true);
    };

  const closeAddModal = () => {
    setIsAddressModalOpen(false);
    };

  if (loading) {
    return (
      <div className="profile-page">
        <main className="profile-container">
          <Navbar />
          <div className="profile-page-wrapper">
            <p>Loading profile...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
      <div className="profile-page">
        <main className="profile-container">
          <Navbar />

          <section className="profile-header">
            <h1 className="profile-title">MY PROFILE</h1>
            <p className="profile-subtitle">
              Manage your account, preferences, and fan achievements
            </p>
          </section>

          <section className="profile-layout">
            <SidebarMenu
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />

            <div className="profile-content">
              {activeTab === "personal" && (
                <PersonalInfo
                  profile={profile}
                  onSave={handleSaveProfile}
                  onAvatarUpload={handleAvatarUpload}
                />
              )}

              {activeTab === "addresses" && (
                <Addresses
                  addresses={addresses}
                  onAddAddress={openAddModal}
                  onRemoveAddress={handleRemoveAddress}
                />
                
              )}

              {activeTab === "badges" && <Badges
                  badges={badges}
                  isLoading={isLoadingBadges}
                  error={badgesError}
              />}

              {activeTab === "Posts History" && (
                <UserPosts 
                  posts={userPosts}
                  expandedPostId={expandedPostId}
                  upvotedPosts={upvotedPosts}
                  onTogglePostDetails={handleTogglePostDetails}
                  onLike={handleLikeClick}
                  onOpenDetail={(selectedPost) => {
                    setIsDetailsOpen(true);
                    setSelectedPost(selectedPost);
                  }}
                />     
              )}
            </div>
          </section>
        </main>
        <ModalComp
          isOpen={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          dialogClassName="w-[min(45vw,72rem)] max-w-none"
          children={
            selectedPost && (
              <div className="space-y-6">
                <PostDetail post={selectedPost} />
                <RepliesList post_id={selectedPost.post_id} />
              </div>
            )
          }
        />
        <AddressModal
          isOpen={isAddressModalOpen}
          onClose={closeAddModal}
          onSubmit={handleCreateAddress}
          />
      </div>
    </>
  );
}

export default ProfilePage;