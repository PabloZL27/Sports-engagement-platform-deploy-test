import { useEffect, useState } from "react";
import type { AddressPayload } from "../../services/profile";

type AddressModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: AddressPayload) => Promise<void> | void;
};

const initialForm: AddressPayload = {
  label: "",
  street_line_1: "",
  street_line_2: "",
  city: "",
  state: "",
  postal_code: "",
  country: "",
  is_default: false,
};

export default function AddressModal({
  isOpen,
  onClose,
  onSubmit,
}: AddressModalProps) {
  const [formData, setFormData] = useState<AddressPayload>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialForm);
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleChange = (
    field: keyof AddressPayload,
    value: string | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.street_line_1?.trim() ||
      !formData.city?.trim() ||
      !formData.state?.trim() ||
      !formData.postal_code?.trim() ||
      !formData.country?.trim()
    ) {
      setError("Please complete all required fields.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await onSubmit({
        label: formData.label?.trim() || null,
        street_line_1: formData.street_line_1.trim(),
        street_line_2: formData.street_line_2?.trim() || null,
        city: formData.city.trim(),
        state: formData.state.trim(),
        postal_code: formData.postal_code.trim(),
        country: formData.country.trim(),
        is_default: !!formData.is_default,
      });

      onClose();
    } catch (err) {
      console.error(err);
      setError("Could not save address.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="address-modal-overlay" onClick={onClose}>
      <div
        className="address-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="address-modal-header">
          <div>
            <h2>Add Address</h2>
            <p>Add a new shipping address for merchandise delivery</p>
          </div>

          <button
            type="button"
            className="address-modal-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <form className="address-modal-form" onSubmit={handleSubmit}>
          <div className="address-field full-width">
            <label>LABEL</label>
            <input
              type="text"
              placeholder="Home, Work, Meeting Point..."
              value={formData.label ?? ""}
              onChange={(e) => handleChange("label", e.target.value)}
            />
          </div>

          <div className="address-field full-width">
            <label>STREET LINE 1 *</label>
            <input
              type="text"
              placeholder="Street and number"
              value={formData.street_line_1}
              onChange={(e) => handleChange("street_line_1", e.target.value)}
            />
          </div>

          <div className="address-field full-width">
            <label>STREET LINE 2</label>
            <input
              type="text"
              placeholder="Apartment, suite, references..."
              value={formData.street_line_2 ?? ""}
              onChange={(e) => handleChange("street_line_2", e.target.value)}
            />
          </div>

          <div className="address-field">
            <label>CITY *</label>
            <input
              type="text"
              placeholder="City"
              value={formData.city}
              onChange={(e) => handleChange("city", e.target.value)}
            />
          </div>

          <div className="address-field">
            <label>STATE *</label>
            <input
              type="text"
              placeholder="State"
              value={formData.state}
              onChange={(e) => handleChange("state", e.target.value)}
            />
          </div>

          <div className="address-field">
            <label>POSTAL CODE *</label>
            <input
              type="text"
              placeholder="Postal code"
              value={formData.postal_code}
              onChange={(e) => handleChange("postal_code", e.target.value)}
            />
          </div>

          <div className="address-field">
            <label>COUNTRY *</label>
            <input
              type="text"
              placeholder="Country"
              value={formData.country}
              onChange={(e) => handleChange("country", e.target.value)}
            />
          </div>

          <div className="address-checkbox-row full-width">
            <label className="address-checkbox-label">
              <input
                type="checkbox"
                checked={!!formData.is_default}
                onChange={(e) => handleChange("is_default", e.target.checked)}
              />
              <span>Set as default address</span>
            </label>
          </div>

          {error && <p className="address-modal-error">{error}</p>}

          <div className="address-modal-actions">
            <button
              type="button"
              className="address-cancel-btn"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="address-save-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Address"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}