import { Card, Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import type { Address } from "../../services/profile";

type AddressesProps = {
  addresses: Address[];
  onAddAddress?: () => void;
  onRemoveAddress?: (addressId: number) => void;
};

export default function Addresses({
  addresses,
  onAddAddress,
  onRemoveAddress,
}: AddressesProps) {
  return (
  <div className="addresses-section">
    <div className="addresses-header">
      <div>
        <h2>SHIPPING ADDRESSES</h2>
        <p>Manage addresses for merchandise delivery</p>
      </div>

      <Button className="add-address-btn" onPress={onAddAddress}>
        <Icon icon="mdi:plus" width={20} />
        <span>Add Address</span>
      </Button>
    </div>

    {addresses.length === 0 ? (
      <div className="addresses-empty-state">
        <p>No addresses yet. Add your first one.</p>
      </div>
    ) : (
      <div className="addresses-list">
        {addresses.map((address) => (
          <Card key={address.address_id} className="address-card">
            <div className="address-card-body">
              <div className="address-icon">
                <Icon icon="mdi:map-marker-outline" width={24} />
              </div>

              <div className="address-content">
                <div className="address-top-row">
                  <div className="address-title-group">
                    <h3>{address.label || "ADDRESS"}</h3>
                    {address.is_default && (
                      <span className="default-badge">DEFAULT</span>
                    )}
                  </div>
                </div>

                <p className="address-street">{address.street_line_1}</p>

                {address.street_line_2 && (
                  <p className="address-street-line-2">{address.street_line_2}</p>
                )}

                <p className="address-location">
                  {address.city}, {address.state} {address.postal_code}
                </p>

                <p className="address-country">{address.country}</p>

                <div className="address-actions">
                  <button
                    type="button"
                    className="remove-address-btn"
                    onClick={() => onRemoveAddress?.(address.address_id)}
                    >
                    Remove
                    </button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    )}
  </div>
);
}