export interface TweetAuthor{
    userName: string;
    name: string;
    profilePicture: string;
    isVerified?: boolean;
    followers?: number;
}

export interface Tweet {
    id: string;
    text: string;
    url: string;
    createdAt: string;
    likeCount: number;
    retweetCount: number;
    replyCount: number;
    author: TweetAuthor;
}