import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Endpoint: GET /tweets?hashtag=TitansCrews&limit=10
app.get('/', async(req,res)=>{
    try{
        const hashtag = (req.query.hashtag || '').replace('#','').trim() || 'TitansCrew';
        const limit = Math.min(parseInt(req.query.limit,10) || 10,100);

        const apiKey = process.env.GETXAPI_KEY;
        if (!apiKey) {
            return res.status(500).json({
                error: 'GETXAPI_KEY no configurado',
            });
        }

        const q = `#${hashtag}`;
        const url = new URL('https://api.getxapi.com/twitter/tweet/advanced_search');
        url.searchParams.set('q', q);
        url.searchParams.set('product', 'Latest');

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || `Error ${response.status} de GetXAPI`);
        }

        const data = await response.json();

        const rawTweets = data.tweets ?? data.data ?? [];
        const tweets = rawTweets.slice(0, limit).map((tweet) => {
            const user = tweet.author ?? tweet.user ?? {};

            return {
                id: String(tweet.id ?? tweet.id_str ?? Math.random()),
                text: tweet.text ?? tweet.full_text ?? '',
                url: tweet.url ?? tweet.twitterUrl ?? '',
                createdAt: tweet.createdAt ?? tweet.created_at ?? '',
                likeCount: tweet.likeCount ?? tweet.favorite_count ?? 0,
                retweetCount: tweet.retweetCount ?? tweet.retweet_count ?? 0,
                replyCount: tweet.replyCount ?? tweet.reply_count ?? 0,
                author: {
                    userName: user.userName ?? user.screen_name ?? user.username ?? 'unknown',
                    name: user.name ?? 'Unknown',
                    profilePicture: user.profilePicture ?? user.profile_image_url_https ?? '',
                    isVerified: user.isVerified ?? user.verified ?? false,
                    followers: user.followers ?? user.followers_count ?? 0,
                },
            };
        });

        res.json({tweets});
    } catch (error) {
        console.error('Error fetching tweets:', error);
        res.status(500).json({
            error: error.message || 'Error al obtener los tweets',
        });
    }
});

const PORT = process.env.PORT || 4007;
app.listen(PORT, () => {
    console.log(`Tweets service running on port ${PORT}`);
    if (!process.env.GETXAPI_KEY){
        console.warn('GETXAPI_KEY no definida');
    }
});