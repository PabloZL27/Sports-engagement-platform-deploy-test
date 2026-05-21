import { Link } from "@heroui/react";
import CommunityHome from "../home/CommunityHome";
import { FaUser } from "react-icons/fa";
import { useEffect, useState } from "react";
import { Post } from "../../types/community";
import { getPosts } from "../../services/communityService";
import { getInitials } from "../../utils/postUtils";

const CommunitySection = () => {
    const [error, setError] = useState("");
    const [loading, setLoading] = useState<boolean>(true);
    const [posts, setPosts] = useState<Post[]>([]);

    useEffect(() => {
        let isMounted = true;
    
        async function loadPosts() {
          try {
            setLoading(true);
            setError("");
            const data = await getPosts();
            if (isMounted) setPosts(data);
          } catch (err) {
            console.error("Error loading posts:", err);
            if (isMounted) setError("No se pudieron cargar los posts.");
          } finally {
            if (isMounted) setLoading(false);
          }
        }
    
        void loadPosts();
    
        return () => {
          isMounted = false;
        };
      }, []);
    
    return (
        <>
            <section className="home-section">
                <div className="home-section-header">
                    <div className="home-section-heading">
                    <FaUser className="home-section-icon" aria-hidden="true" />
                    <h1 className="home-title">Community</h1>
                    </div>
                    <Link href="/community" className="home-section-link">
                    View more → <span aria-hidden="true"></span>
                    </Link>
                </div>
                </section>
                <section className="home-section">
                  {posts.slice(0, 3).map((post) => (
                    <CommunityHome
                      key={post.post_id ?? post.title}
                      name={post.title}
                      comment={post.content}
                      likes={post.upvotes_count}
                      comments={post.replies_count ?? 0}
                      avatarLetter={getInitials(post.user_name)}
                    />
                  ))}
              </section>
        </>
    );
}


export default CommunitySection;