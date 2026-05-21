import { Button, FieldError, Form, Input, Label, TextArea, TextField, Select } from "@heroui/react";
import React, { useState } from "react"
import { Auth } from "../../context/AuthContext";
import { createPost } from "../../services/communityService";

interface NewPostFormProps {
    onSuccess: () => void;
    onSwitchOpenModal: (isOpen: boolean) => void;
}

const categories = [
  "All Topics",
  "Game Day",
  "Team Talk",
  "Cards",
  "Draft",
  "Tailgate & Events",
];

export const NewPostForm = (props: NewPostFormProps) => {
    const { session } = Auth();
    const {onSwitchOpenModal, onSuccess} = props;
    const [category, setCategory] = useState<string>("");
    const [title, setTitle] = useState<string>("");
    const [postContent, setPostContent] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);

    const handleNewPost = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            setLoading(true);
            if (!session?.user?.id) {
                console.error("Missing user id in session");
                return;
            }
            await createPost({
                user_id: session.user.id,
                category_name:category,
                title:title, 
                content:postContent
            });
            onSuccess();
        } catch(error) {
            console.error(error);
            setLoading(false);
        } finally {
            setLoading(false);
            onSwitchOpenModal(false);
        }
    }

    return(
        <>
            <div className="mb-6 flex flex-row gap-10">
                <div>
                    <h1 className="text-[28px] font-bold leading-tight text-[#0B2A4A]">Create New Post</h1>{/* CHECAR SOLORES DE LA PALETA */}
                </div>
            </div>
            <Form className="flex w-full max-w-md flex-col gap-4 p-2" onSubmit={handleNewPost}>
                <div className="flex flex-col gap-2">
                    <Label className="font-bold text-[#0B2A4A]">Category</Label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="h-10 rounded-xl border border-gray-300 px-3 py-2 text-sm"
                    >
                        <option value="">Select a category</option>
                        {categories.map((cat) => (
                            <option key={cat} value={cat}>
                                {cat}
                            </option>
                        ))}
                    </select>
                </div>
                <TextField
                    name="title"
                    type="title"
                    onChange={setTitle}
                    >
                    <Label className="font-bold text-[#0B2A4A]">Title</Label>
                    <Input placeholder="What's on your mind?" />
                    <FieldError />
                </TextField>
                <Label className="font-bold text-[#0B2A4A]">Content</Label>
                <TextArea
                    name="content"
                    placeholder="Share your thoughts with the community..."
                    value={postContent}
                    className="h-32 w-full"
                    onChange={(e) => setPostContent(e.target.value)}
                />
                <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-6">
                    <Button
                        type="button"
                        className="h-11 rounded-xl bg-white text-[#0B2A4A] px-5 font-semibold border-2 border-[#1E2B44]"
                        onPress={() => onSwitchOpenModal(false)}
                    >
                        Cancel
                    </Button>

                    <Button
                        type="submit"
                        className="h-11 rounded-xl bg-[#1E2B44] px-5 font-semibold text-white"
                    >
                        Post
                    </Button>
                </div>
            </Form>
        </>
    );
}