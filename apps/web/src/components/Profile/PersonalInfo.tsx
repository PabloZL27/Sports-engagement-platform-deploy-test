import { useEffect, useRef, useState } from "react";
import { Card, Input, Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { SignOutButton } from "../auth/Signout";

type SaveFeedback = {
  type: "success" | "error";
  message: string;
};

type ProfileData = {
  first_name: string;
  last_name: string;
  username: string;
  avatar_url?: string | null;
};

type PersonalInfoProps = {
  profile: ProfileData | null;
  onSave?: (data: ProfileData) => Promise<void>;
  onAvatarUpload?: (file: File) => Promise<void>;
};

export default function PersonalInfo({
  profile,
  onSave,
  onAvatarUpload,
}: PersonalInfoProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<SaveFeedback | null>(null);

  const [formData, setFormData] = useState<ProfileData>({
    first_name: "",
    last_name: "",
    username: "",
    avatar_url: null,
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        username: profile.username || "",
        avatar_url: profile.avatar_url || null,
      });
    }
  }, [profile]);

  useEffect(() => {
    if (!saveFeedback) return undefined;

    const timeoutId = window.setTimeout(() => {
      setSaveFeedback(null);
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [saveFeedback]);

  const handleSubmit = async () => {
    if (!onSave) return;

    try {
      setIsSaving(true);
      setSaveFeedback(null);
      await onSave(formData);
      setSaveFeedback({
        type: "success",
        message: "Your profile has been updated successfully.",
      });
    } catch {
      setSaveFeedback({
        type: "error",
        message: "Could not update profile. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    await onAvatarUpload?.(file);

    e.target.value = "";
  };

  return (
    <div className="personal-info-section">
      <div className="personal-info-header">
        <h2>PERSONAL INFORMATION</h2>
        <p>Update your personal details and profile</p>
      </div>

      <Card className="personal-info-card">
        <div className="personal-info-card-body">
          <div className="profile-photo-row">
            <div className="photo-wrapper">
              <div className="profile-avatar">
                {formData.avatar_url ? (
                  <img
                    src={formData.avatar_url}
                    alt="Profile"
                    className="profile-avatar-img"
                  />
                ) : (
                  <span className="profile-avatar-fallback">
                    {formData.first_name?.[0] || formData.username?.[0] || "U"}
                  </span>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/gif"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />

              <button
                className="photo-edit-btn"
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                <Icon icon="solar:camera-bold" width={16} />
              </button>
            </div>

            <div className="photo-text">
              <h4>Change Photo</h4>
              <p>JPG, PNG or GIF. Max size 2MB</p>
            </div>
          </div>

          <div className="personal-divider" />

          <div className="personal-info-form">
            <div className="input-group">
              <label className="input-label">FIRST NAME</label>
              <Input
                className="personal-input"
                placeholder="First name"
                type="text"
                value={formData.first_name}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    first_name: e.target.value,
                  }))
                }
              />
            </div>

            <div className="input-group">
              <label className="input-label">LAST NAME</label>
              <Input
                className="personal-input"
                placeholder="Last name"
                type="text"
                value={formData.last_name}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    last_name: e.target.value,
                  }))
                }
              />
            </div>

            <div className="input-group full-width">
              <label className="input-label">USERNAME</label>
              <Input
                className="personal-input"
                placeholder="Username"
                type="text"
                value={formData.username}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    username: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          {saveFeedback && (
            <p
              className={`profile-feedback profile-feedback--${saveFeedback.type}`}
              role="status"
            >
              {saveFeedback.message}
            </p>
          )}

          <div className="personal-info-actions">
            <Button
              className="save-btn"
              onPress={() => void handleSubmit()}
              isDisabled={isSaving}
            >
              <Icon icon="solar:diskette-bold" width={18} />
              <span>{isSaving ? "Saving..." : "Save Changes"}</span>
            </Button>

            <div className="signout-wrapper">
              <SignOutButton requireConfirmation />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}