import { Avatar, Card } from "@heroui/react";
import { FiHeart, FiMessageCircle, FiShare2 } from "react-icons/fi";
import "../../styles/home.css";

interface CommunityHomeProps {
  name?: string;
  comment?: string;
  likes?: number;
  comments?: number;
  avatarLetter?: string;
}

function CommunityHome({
  name = "TitanFan2024",
  comment = "Can't wait for the next game! Who else is predicting a win?",
  likes = 234,
  comments = 45,
  avatarLetter = "T",
}: CommunityHomeProps) {
  return (
    <section className="community-home-wrapper" aria-label="Community preview">
      <Card className="community-home-card">
        <Card.Content className="community-home-content">
          <div className="community-home-avatar-wrapper" style={{ position: 'relative' }}>
            <Avatar className="community-home-avatar" />
            <span className="community-home-avatar-initials" aria-hidden="true" style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700}}>{avatarLetter}</span>
          </div>

          <div className="community-home-copy">
            <h3 className="community-home-name">{name}</h3>
            <p className="community-home-comment">{comment}</p>

            <div className="community-home-actions" aria-label="Post actions">
              <div className="community-home-action">
                <FiHeart className="community-home-action-icon" aria-hidden="true" />
                <span>{likes}</span>
              </div>

              <div className="community-home-action">
                <FiMessageCircle className="community-home-action-icon" aria-hidden="true" />
                <span>{comments}</span>
              </div>

              <div className="community-home-action community-home-action-share">
                <FiShare2 className="community-home-action-icon" aria-hidden="true" />
              </div>
            </div>
          </div>
        </Card.Content>
      </Card>
    </section>
  );
}

export default CommunityHome;
