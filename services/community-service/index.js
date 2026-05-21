const express = require("express");
const { pool } = require("./db");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(express.json());

try {
    if (typeof globalThis.WebSocket === "undefined") {
        // Provide a WebSocket implementation for Node 20 where it's not available
        globalThis.WebSocket = require("ws");
    }
} catch (err) {
    // If ws isn't available for some reason, continue; the error will surface elsewhere
    console.warn("WebSocket shim not installed:", err?.message || err);
}

const PORT = process.env.PORT || 4001;
const PROFILE_SERVICE_URL = process.env.PROFILE_SERVICE_URL || "http://profile-service:4006";
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        status: "error",
        message: "Missing or invalid Authorization header"
      });
    }

    const token = authHeader.split(" ")[1];

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({
        status: "error",
        message: "Invalid token"
      });
    }

    req.user = {
      id: data.user.id,
      email: data.user.email || null
    };

    next();
  } catch (error) {
    return res.status(401).json({
      status: "error",
      message: "Authentication failed"
    });
  }
}

async function getProfilesByUserIds(userIds) {
  if (!Array.isArray(userIds) || userIds.length === 0) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);

  try {
    const response = await fetch(`${PROFILE_SERVICE_URL}/profiles/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profiles_ids: userIds }),
      signal: controller.signal
    });

    if (!response.ok) return [];
    const data = await response.json();
    return data?.profiles || [];
  } catch (error) {
    console.error("community-service batch profile lookup failed:", error.message);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

app.get("/health", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW() AS now");
        res.status(200).json({
            service: "community-service",
            status: "disconnected",
            db: "connected",
            time: result.rows[0].now
        });
    } catch(error) {
        res.status(500).json({
            service: "community-service",
            status: "error",
            db: "disconnected",
            error: error.message
        });
    }
});

app.post("/new_post", async (req, res) => {
    try {
        const {
            user_id,
            category_name, 
            title, 
            content
        } = req.body;

        if (!title || !content || !category_name) {
            return res.status(400).json({
                success: false, 
                message: "Post title, content and category are ALL required"
            });
        }
        
        const result = await pool.query(`
            INSERT INTO posts (
                user_id, 
                category_id, 
                title, 
                content
            )
            values (
                $1, 
                (SELECT category_id FROM categories WHERE name=$2), 
                $3, 
                $4
            )
            RETURNING
                post_id, 
                user_id,
                category_id,
                title,
                content, 
                views_count, 
                upvotes_count,
                created_at
        `, [
            user_id,
            category_name,
            title, 
            content
        ]);

        res.status(201).json({
            success: true,
            result: result.rows[0]
        });

    } catch(error) {
        res.status(500).json({
            success: false, 
            error: error.message
        });
    }
});

app.get("/get_posts", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                p.post_id, 
                p.user_id, 
                c.name as category_name, 
                p.title, 
                p.content, 
                p.views_count, 
                p.upvotes_count,
                COUNT(r.reply_id)::INTEGER as replies_count,
                p.created_at 
            FROM posts p
            JOIN categories c ON c.category_id = p.category_id
            LEFT JOIN replies r ON r.post_id = p.post_id 
            GROUP BY p.post_id, c.category_id, c.name
            ORDER BY p.created_at DESC
        `);

        const posts = result.rows;

        const uniqueUserIds = [...new Set(posts.map((p) => p.user_id).filter((id) => id != null))];
        const profiles = await getProfilesByUserIds(uniqueUserIds);

        const profileMap = new Map(
            profiles.map((profile) => [
                profile.user_id,
                profile.username || profile.first_name || `User ${profile.user_id}`
            ])
        );

        const enriched = posts.map((post) => ({
            ...post,
            user_name: profileMap.get(post.user_id) || `User ${post.user_id}`
        }));

        res.status(200).json({
            success: true,
            result: enriched
        });

    } catch(error) {
        res.status(500).json({
            success: false, 
            error: error.message
        });
    }
});

app.patch("/increment_post_view", async (req, res) => {
    try {
        const { post_id } = req.body;

        if (!post_id) {
            return res.status(400).json({
                success: false,
                message: "post_id is required"
            });
        }

        const result = await pool.query(`
            UPDATE posts
            SET views_count = views_count + 1
            WHERE post_id = $1
            RETURNING post_id, views_count
        `, [post_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Post not found"
            });
        }

        res.status(200).json({
            success: true,
            result: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.patch("/increment_post_upvote", async (req, res) => {
    try {
        const { post_id } = req.body;

        if (!post_id) {
            return res.status(400).json({
                success: false,
                message: "post_id is required"
            });
        }

        const result = await pool.query(`
            UPDATE posts
            SET upvotes_count = upvotes_count + 1
            WHERE post_id = $1
            RETURNING post_id, upvotes_count
        `, [post_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Post not found"
            });
        }

        res.status(200).json({
            success: true,
            result: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.delete("/delete_post", async (req, res) => {
    try{
        const { post_id } = req.body;

        if (!post_id) {
            return res.status(400).json({
                success: false,
                message: "post_id is required"
            });
        }

        const result = await pool.query(`
            DELETE FROM posts
            WHERE post_id = $1
            RETURNING 
                post_id, 
                category_id,
                title, 
                content, 
                views_count, 
                upvotes_count,
                created_at
        `, [post_id]);

        res.status(200).json({
            success: true,
            result: result.rows
        });

    } catch(error) {
        res.status(500).json({
            success: false,
            error: error.message         
        });
    }
});

app.patch("/edit_post", async (req, res) => {
    try {
        const {
            post_id ,
            new_category_name,
            new_title,
            new_content
        } = req.body;

        if (!post_id) {
            return res.status(400).json({
                success: false,
                message: "post_id is required"
            });
        }

        const result = await pool.query(`
            UPDATE posts p
            SET
                title = COALESCE($1, p.title),
                content = COALESCE($2, p.content),
                category_id = COALESCE((SELECT category_id FROM categories WHERE name = $3), p.category_id)
            WHERE p.post_id = $4
            RETURNING
                p.post_id,
                p.category_id,
                p.title,
                p.content,
                p.views_count,
                p.upvotes_count,
                p.created_at
        `, [
            new_title ?? null,
            new_content ?? null,
            new_category_name ?? null,
            post_id
        ]);

        res.status(200).json({
            success: true,
            result: result.rows
        });

    } catch (error) {
        res.status(500).json({
            success: false, 
            error: error.message
        });
    }
});

app.get("/get_post_comments", async (req, res) => {
    try {
        const { post_id } = req.query;
        
        if (!post_id) {
            return res.status(400).json({
                success: false,
                message: "post_id is required"
            });
        }

        const result = await pool.query(`
            SELECT
                reply_id,
                user_id,
                content,
                upvotes_count,
                created_at
            FROM replies r
            WHERE r.post_id = $1
        `, [post_id]);

        const replies = result.rows;
        const uniqueUserIds = [...new Set(replies.map((r) => r.user_id).filter((id) => id != null))];
        const profiles = await getProfilesByUserIds(uniqueUserIds);

        const profileMap = new Map(
            profiles.map((profile) => [
                profile.user_id,
                profile.username || profile.first_name || `User ${profile.user_id}`
            ])
        );

        const enriched = replies.map((reply) => ({
            ...reply,
            user_name: reply.user_id ? profileMap.get(reply.user_id) || "Anonymous" : "Anonymous"
        }));

        res.status(200).json({
            success: true,
            result: enriched,
        });

    } catch(error) {
        res.status(500).json({
            success: false, 
            error: error.message
        });
    }
});

app.post("/create_comment", async (req, res) => {
    try {
        const {
            post_id, 
            user_id, 
            content
        } = req.body;

        const result = await pool.query(`
            INSERT INTO replies (
                post_id, 
                user_id, 
                content
            )
            VALUES ($1, $2, $3) 
            RETURNING
                reply_id, 
                post_id, 
                user_id,
                content, 
                upvotes_count,
                created_at
        `, [
            post_id,
            user_id,
            content
        ]);

        res.status(200).json({
            success: true,
            result: result.rows
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.delete("/delete_reply", async (req, res) => {
    try {
        const {reply_id} = req.body;
        if (!reply_id) {
            return res.status(400).json({
                success: false,
                message: "reply_id is required"
            });
        }

        const result = await pool.query(`
            DELETE FROM replies
            WHERE reply_id = $1
            RETURNING
               reply_id,
               post_id,
             user_id,
               content,
               upvotes_count,
               created_at
        `, [reply_id]);
        
        res.status(200).json({
            success: true,
            result: result.rows
        });

    } catch (error) {
        res.status(500).json({
            success: false, 
            error: error.message
        });
    }
});

app.patch("/edit_comment", async (req, res) => {
    try {
        const {
            reply_id, 
            new_content
        } = req.body;

        if (!reply_id || !new_content) {
            return res.status(400).json({
                success: false,
                message: "reply_id and new_content are required"
            });
        }

        const result = await pool.query(`
            UPDATE replies
            SET content = $1
            WHERE reply_id = $2
            RETURNING
                reply_id,
                post_id,
                content,
                upvotes_count
        `, [new_content, reply_id]);

        res.status(200).json({
            success: true, 
            result: result.rows
        });

    } catch(error) {
        res.status(500).json({
            success: false, 
            error: error.message
        });
    }
});

app.patch("/increment_reply_upvote", async (req, res) => {
    try {
        const { reply_id } = req.body;

        if (!reply_id) {
            return res.status(400).json({
                success: false,
                message: "reply_id is required"
            });
        }

        const result = await pool.query(`
            UPDATE replies
            SET upvotes_count = upvotes_count + 1
            WHERE reply_id = $1
            RETURNING reply_id, upvotes_count
        `, [reply_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Reply not found"
            });
        }

        res.status(200).json({
            success: true,
            result: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get("/user_posts", requireAuth, async (req, res) => { //AQUIIII 
    try{
        const user_id = req.user.id;

        if (!user_id) {
            return res.status(400).json({
                success: false,
                message: "user_id is required"
            });
        }

        const result = await pool.query(`
            SELECT
                p.post_id,
                p.user_id,
                c.name AS category_name,
                p.title,
                p.content,
                p.views_count,
                p.upvotes_count,
                COUNT(r.reply_id)::INTEGER AS replies_count,
                p.created_at
            FROM posts p
            JOIN categories c ON c.category_id = p.category_id
            LEFT JOIN replies r ON r.post_id = p.post_id
            WHERE p.user_id = $1
            GROUP BY p.post_id, c.category_id, c.name
            ORDER BY p.created_at DESC;
        `, [user_id]);

        res.status(200).json({
            success: true, 
            result: result.rows
        });

    } catch(error) {
        res.status(500).json({
            success: false, 
            error: error.message
        });
    }
});

app.get("/top_contributors", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                user_id, 
                count(*) as post_count
            FROM posts
            GROUP BY user_id 
            ORDER BY post_count DESC
            LIMIT 5
        `);

        res.status(200).json({
            success: true,
            result: result.rows
        });

    } catch (error) {
        res.status(500).json({
            success: false, 
            error: error.message
        });
    }
});

app.get("/fan_of_week", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                user_id, 
                COUNT(p.content) as post_count,
                SUM(p.upvotes_count) as upvotes_count
            FROM posts p 
            GROUP BY p.user_id 
            ORDER BY 
                post_count DESC, 
                upvotes_count DESC
            LIMIT 1;
        `);

        res.status(200).json({
            success: true,
            result: result.rows
        });

    } catch(error) {
        res.status(500).json({
            success: false, 
            error: error.message
        });
    }
});

app.get("/stats/posts-per-day", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        DATE(created_at) AS day,
        COUNT(*) AS total_posts
      FROM posts
      WHERE created_at >= NOW() - INTERVAL '14 days'
      GROUP BY day
      ORDER BY day;
    `);

    res.json(
      result.rows.map((r) => ({
        day: r.day,
        total_posts: Number(r.total_posts),
      }))
    );
  } catch (error) {
    console.error("Error en /stats/posts-per-day:", error);
    res.status(500).json({ 
      error: "Error al obtener posts por día",
      details: error.message 
    });
  }
});


app.get("/stats/posts-by-category", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.name AS category_name,
        COUNT(*) AS total_posts
      FROM posts p
      JOIN categories c 
        ON p.category_id = c.category_id
      GROUP BY c.name
      ORDER BY total_posts DESC;
    `);

    res.json(
      result.rows.map((r) => ({
        category: r.category_name,
        total_posts: Number(r.total_posts),
      }))
    );
  } catch (error) {
    console.error("Error en /stats/posts-by-category:", error);
    res.status(500).json({ 
      error: "Error al obtener posts por categoría",
      details: error.message 
    });
  }
});

app.get("/stats/total-posts", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) 
        AS total_posts,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) AS new_today
      FROM posts;
    `);

    const new_today = Number(result.rows[0].new_today);

    res.json({
      total_posts: Number(result.rows[0].total_posts),
      new_today,
      trend: new_today > 0 ? "green" : "gray",
    });
    
  } catch (error) {
    console.error("Error en /stats/total-posts:", error);
    res.status(500).json({
      error: "Error al obtener publicaciones totales",
      details: error.message,
    });
  }
});


app.listen(PORT, () => {
    console.log(`Community service running on port ${PORT}`);
});
