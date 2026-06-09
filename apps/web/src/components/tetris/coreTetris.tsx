// @ts-nocheck
import React, { useCallback, useEffect, useState } from "react";

import StartPage from "./startPage";
import Game from "./game";
import { Auth } from "../../context/AuthContext";
import {
	getTetrisLeaderboard,
	saveTetrisSession,
} from "../../services/tetrisService";

const Tetris = ({
	onLeaderboardChange,
	onLeaderboardLoadingChange,
	onStatusMessageChange,
}) => {
	const { session } = Auth();
	const [runing, setRuning] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	const loadLeaderboard = useCallback(async () => {
		onLeaderboardLoadingChange?.(true);
		onStatusMessageChange?.(null);

		try {
			const leaderboard = await getTetrisLeaderboard();
			onLeaderboardChange?.(leaderboard);
		} catch (error) {
			console.error("Error loading Tetris leaderboard:", error);
			onStatusMessageChange?.(
				error instanceof Error
					? error.message
					: "A database error occurred while loading Tetris.",
			);
		} finally {
			onLeaderboardLoadingChange?.(false);
		}
	}, [onLeaderboardChange, onLeaderboardLoadingChange, onStatusMessageChange]);

	useEffect(() => {
		loadLeaderboard();
	}, [loadLeaderboard]);

	const handleGameOver = useCallback(async (payload) => {
		const accessToken = session?.access_token;

		if (!accessToken) {
			onStatusMessageChange?.("Sign in to save your Titans Cubic scores.");
			return;
		}

		setIsSaving(true);
		onStatusMessageChange?.("Saving Titans Cubic score...");

		try {
			const response = await saveTetrisSession(payload, accessToken);
			onLeaderboardChange?.(response.leaderboard);
			onStatusMessageChange?.("Titans Cubic score saved.");
		} catch (error) {
			console.error("Error saving Tetris session:", error);
			onStatusMessageChange?.(
				error instanceof Error
					? error.message
					: "A database error occurred while saving your Tetris score.",
			);
		} finally {
			setIsSaving(false);
		}
	}, [onLeaderboardChange, onStatusMessageChange, session?.access_token]);

	return runing ? (
		<Game stopClick={() => setRuning(false)} onGameOver={handleGameOver} />
	) : (
		<StartPage startClick={() => {
			if (!isSaving) setRuning(true);
		}} />
	);
};

export default Tetris;
