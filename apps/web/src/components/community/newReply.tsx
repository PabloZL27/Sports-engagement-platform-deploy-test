import { Button, Form, Label, TextArea } from "@heroui/react";
import React, { useState } from "react";
import { Auth } from "../../context/AuthContext";
import { createComment } from "../../services/communityService";
import type { Comment } from "../../types/community";

interface NewReplyProps {
	postId: number;
	onSuccess?: (newComments?: Comment[]) => void;
	onCancel?: () => void;
}



const NewReply = ({ postId, onSuccess, onCancel }: NewReplyProps) => {
	const { session } = Auth();
	const [content, setContent] = useState<string>("");
	const [loading, setLoading] = useState<boolean>(false);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		if (!session?.user?.id) {
			console.error("Missing user id in session");
			return;
		}

		const trimmed = content.trim();
		if (!trimmed) return;

		try {
			setLoading(true);
			const newComments = await createComment({
				post_id: postId,
				user_id: session.user.id,
				content: trimmed
			});

			setContent("");
			onSuccess?.(newComments);
		} catch (error) {
			console.error("Error creating reply:", error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Form className="flex w-full max-w-none flex-col gap-4 p-0.5" onSubmit={handleSubmit}>
			<Label className="font-bold text-[#0B2A4A]">Reply</Label>
			<TextArea
				name="content"
				placeholder="Write your reply..."
				value={content}
				className="h-32 w-full"
				onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
			/>

			<div className="flex justify-end gap-3">
				<Button
					type="button"
					className="h-11 rounded-xl bg-white text-[#0B2A4A] px-5 font-semibold border-2 border-[#1E2B44]"
					onPress={onCancel}
					isDisabled={loading}
				>
					Cancel
				</Button>

				<Button
					type="submit"
					className="h-11 rounded-xl bg-[#1E2B44] px-5 font-semibold text-white"
					isDisabled={loading || !content.trim()}
				>
					Reply
				</Button>
			</div>
		</Form>
	);
};

export default NewReply;
