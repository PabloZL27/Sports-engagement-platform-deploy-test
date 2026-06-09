// @ts-nocheck
import React, { useMemo, useState, useEffect, useRef } from "react";
import styled, { keyframes } from "styled-components";

import useContainerDimensions from "../../hooks/tetris/useContainerDimensions";
import StatusRow from "./statusRow";
import LoseGame from "./loseGame";

import Color from "color";

const TITANS_LOGO_SRC = "/team-logos/TEN.png";

const confettiFall = keyframes`
	0% {
		opacity: 0;
		transform: translate3d(0, 0, 0) rotate(0deg);
	}

	12% {
		opacity: 1;
	}

	100% {
		opacity: 0;
		transform: translate3d(var(--dx), var(--dy), 0) rotate(var(--dr));
	}
`;

const Game = styled.div`
	position: relative;
	width: 100%;
	display: flex;
	flex-direction: ${props => (props.portrait ? "column" : "row")};
	justify-content: center;
	align-items: center;
	background-color: #0f3d78;
	padding: 12px;
	box-sizing: border-box;
`;

const StageShell = styled.div`
	position: relative;
	width: 100%;
	min-height: clamp(320px, 52vh, 640px);
	overflow: hidden;
`;

const ContainerNext = styled.div`
	${props =>
		!props.portrait && `height: ${props.pixelSize * 18 + (18 / 3) * 1}px;`}
	${props => props.portrait && `width: ${props.pixelSize * 10 + (10 / 3) * 1}px;`}
	margin-right: ${props => (props.portrait ? 0 : props.pixelSize / 3)}px;
	margin-bottom: ${props => (props.portrait ? props.pixelSize / 3 : 0)}px;
	display: flex;
	flex-direction: ${props => (props.portrait ? "row" : "column")};
	justify-content: ${props => (props.portrait ? "space-between" : "flex-start")};
	align-items: center;
`;

const Next = styled.div`
	width: ${props => props.pixelSize * 3}px;
	height: ${props => props.pixelSize * 3}px;
	background-color: ${props => (props.theme3d ? "#444" : "black")};
	transition: background-color 0.5;
	overflow: hidden;
	display: flex;
	flex-direction: column;
	justify-content: center;
	box-shadow: 0 8px 20px rgba(0, 0, 0, 0.50);
	align-items: center;
	margin-bottom: ${props => (props.portrait ? 0 : props.pixelSize / 3)}px;
	margin-right: ${props => (!props.portrait ? 0 : props.pixelSize / 3)}px;
`;

const StyledStage = styled.div`
	position: relative;
	background-color: ${props => (props.theme3d ? "#444" : "black")};
	transition: background-color 0.5s;
	overflow: hidden;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	box-shadow: 0 8px 20px rgba(0, 0, 0, 0.50);
`;

const Center = styled.div`
	width: 100%;
	height: 100%;
	display: flex;
	justify-content: center;
	align-items: center;
`;

const Row = styled.div`
	display: flex;
	flex-direction: row;
	justify-content: center;
	height: ${props => (props.stage ? props.pixelSize : props.pixelSize / 1.6)}px;
`;

const Pixel = React.memo(styled.div`
	width: ${props => (props.stage ? props.pixelSize : props.pixelSize / 1.6)}px;
	height: ${props => (props.stage ? props.pixelSize : props.pixelSize / 1.6)}px;
	background-color: ${props => (props.fill === 1 ? props.color : "inherited")};
	background-image: ${props => (props.logo ? `url("${props.logo}")` : "none")};
	background-repeat: no-repeat;
	background-position: center;
	background-size: ${props => (props.logo ? "78%" : "auto")};
	position: relative;
	overflow: hidden;
	z-index: ${props => props.zIndex};

	${props =>
		props.paused &&
		`
		transition: all 1s;
	`};

	${props =>
		props.fill &&
		props.theme3d &&
		`;
		box-shadow: ${props.pixelSize / 4.16}px ${props.pixelSize /
			4.16}px ${props.pixelSize / 5.55}px #222${
			props.topBloco
				? `, 0 ${-props.pixelSize / 4.16}px 0 ${Color(props.color).lighten(0.2)}`
				: ""
		} 
	`};

	${props =>
		!props.theme3d &&
		`
		border-left: 1px solid ${
			props.stage || props.fill || props.hint ? "#222" : "black"
		};
		border-top: 1px solid ${
			props.stage || props.fill || props.hint ? "#222" : "black"
		};	
	`};

	${props =>
		props.hint &&
		`
		border: 1px solid ${Color(props.playerColor).alpha(0.5)};
		background-color: rgba(255,255,255,0.1);
	`};
`);

const LogoMark = styled.img`
	position: absolute;
	inset: 14%;
	width: 72%;
	height: 72%;
	object-fit: contain;
	pointer-events: none;
	z-index: 2;
	filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.25));
`;

const ConfettiLayer = styled.div`
	position: absolute;
	inset: 0;
	pointer-events: none;
	overflow: hidden;
	z-index: 85;
`;

const ConfettiPiece = styled.span`
	position: absolute;
	left: ${props => props.left}%;
	top: ${props => props.top}%;
	width: ${props => props.size}px;
	height: ${props => props.height}px;
	background-color: ${props => props.color};
	border-radius: ${props => (props.rounded ? "999px" : "2px")};
	opacity: 0;
	box-shadow: 0 0 6px rgba(255, 255, 255, 0.1);
	will-change: transform, opacity;
	animation: ${confettiFall} ${props => props.duration}ms ease-out ${props => props.delay}ms forwards;
	--dx: ${props => props.dx}px;
	--dy: ${props => props.dy}px;
	--dr: ${props => props.dr}deg;
`;

const ContainerSwitch = styled.div`
	${props =>
		props.portrait &&
		`
		height: 100%;
		width: 100%;
		display: flex;
		align-items: flex-end;
		flex-direction: column;
		justify-content: flex-end;
	`};
`;

const ThemeSwitchButton = styled.button`
	width: ${props => props.pixelSize * 2}px;
	height: ${props => props.pixelSize / 1.2}px;
	border: 0;
	border-radius: ${props => props.pixelSize / 1.2}px;
	background-color: ${props => (props.checked ? "#444" : "#000")};
	display: flex;
	align-items: center;
	justify-content: ${props => (props.checked ? "flex-end" : "flex-start")};
	padding: 0;
	cursor: pointer;
	transition: background-color 0.5s;
	box-sizing: border-box;
`;

const ThemeSwitchThumb = styled.span`
	width: ${props => props.pixelSize / 1.2}px;
	height: ${props => props.pixelSize / 1.2}px;
	border-radius: 50%;
	background-color: white;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
`;

const ContainerStatus = styled.div`
	width: ${props => props.pixelSize * 8}px;
	${props =>
		!props.portrait && `height: ${props.pixelSize * 18 + (18 / 3) * 1}px;`}
	${props => props.portrait && `width: ${props.pixelSize * 10 + (10 / 3) * 1}px;`}
	margin-left: ${props => (props.portrait ? 0 : props.pixelSize / 3)}px;
	margin-top: ${props => (props.portrait ? props.pixelSize / 3 : 0)}px;
	display: flex;
	flex-direction: ${props => (props.portrait ? "row" : "column")};
	align-items: center;
	justify-content: ${props => (props.portrait ? "space-between" : "flex-start")};
	font-size: ${props => props.pixelSize}px;
`;

const getRenderizacaoBloco = bloco => {
	let trimRowBloco = [];
	let sumColumn = {};
	bloco.forEach((row, y) => {
		let rowSum = 0;
		row.forEach(pixel => (rowSum = rowSum + pixel));
		if (rowSum > 0) trimRowBloco.push(row);
		row.forEach((pixel, x) => {
			sumColumn[x] = (sumColumn[x] ? sumColumn[x] : 0) + pixel;
		});
	});
	let trimBloco = [];
	trimRowBloco.forEach((row, y) => {
		let newRow = [];
		row.forEach((pixel, x) => {
			if (sumColumn[x] > 0) newRow.push(pixel);
		});
		trimBloco.push(newRow);
	});
	return trimBloco;
};

const isTitansLogoCell = (block, rowIndex, columnIndex) =>
	Boolean(
		block?.specialTitans &&
		block?.logoCell &&
		rowIndex === block.logoCell[0] &&
		columnIndex === block.logoCell[1]
	);

const LANDSCAPE_COLS = 22;
const LANDSCAPE_ROWS = 19;
const PORTRAIT_COLS = 12;
const PORTRAIT_ROWS = 26;
const MIN_PIXEL_SIZE = 12;
const MAX_PIXEL_SIZE = 32;

function computePixelSize(containerWidth: number, containerHeight: number) {
	if (containerWidth <= 0 || containerHeight <= 0) {
		return MIN_PIXEL_SIZE;
	}

	const isPortrait = containerHeight > containerWidth;
	const cols = isPortrait ? PORTRAIT_COLS : LANDSCAPE_COLS;
	const rows = isPortrait ? PORTRAIT_ROWS : LANDSCAPE_ROWS;
	const byWidth = containerWidth / cols;
	const byHeight = containerHeight / rows;
	const nextPixelSize = Math.floor(Math.min(byWidth, byHeight));

	return Math.max(MIN_PIXEL_SIZE, Math.min(MAX_PIXEL_SIZE, nextPixelSize));
}

const Stage = ({ lose, restartClick, map, player, hint, status, paused, confettiBurst, ...others }) => {
	const [pixelSize, setPixelSize] = useState(30);
	const [portrait, setPortrait] = useState(false);
	const [nextRender, setNextRender] = useState();
	const shellRef = useRef(null);
	const stageRef = useRef(null);
	const { width: containerWidth, height: containerHeight } =
		useContainerDimensions(shellRef);
	const theme3d = status ? Math.floor((status.level - 1) / 2) % 2 === 1 : false;

	const confettiPieces = useMemo(() => {
		if (!confettiBurst) return [];

		const palette = ["#7fdcff", "#b8f0ff", "#fdf6a4", "#ffffff", "#4bb7ff", "#d7f7ff"];
		return [...new Array(24)].map((_, index) => ({
			id: `${confettiBurst.id}-${index}`,
			left: 26 + Math.random() * 48,
			top: 10 + Math.random() * 18,
			size: 5 + Math.random() * 5,
			height: 3 + Math.random() * 5,
			color: palette[index % palette.length],
			rounded: index % 4 === 0,
			duration: 1200 + Math.random() * 500,
			delay: Math.random() * 140,
			dx: (Math.random() - 0.5) * 280,
			dy: 120 + Math.random() * 120,
			dr: (Math.random() - 0.5) * 360,
		}));
	}, [confettiBurst]);

	useEffect(() => {
		if (!containerWidth || !containerHeight) return;

		setPortrait(containerHeight > containerWidth);
		setPixelSize(computePixelSize(containerWidth, containerHeight));
	}, [containerWidth, containerHeight]);

	useEffect(() => {
		if (!player.next) return;
		setNextRender(getRenderizacaoBloco(player.next.bloco));
	}, [player.next]);

	useEffect(() => {
		if (!lose) {
			stageRef.current.focus();
		}
	}, [lose]);

	return (
		<StageShell ref={shellRef}>
			{confettiPieces.length > 0 && (
				<ConfettiLayer aria-hidden="true">
					{confettiPieces.map(piece => (
						<ConfettiPiece
							key={piece.id}
							left={piece.left}
							top={piece.top}
							size={piece.size}
							height={piece.height}
							color={piece.color}
							rounded={piece.rounded}
							duration={piece.duration}
							delay={piece.delay}
							dx={piece.dx}
							dy={piece.dy}
							dr={piece.dr}
						/>
					))}
				</ConfettiLayer>
			)}
			<Game portrait={portrait}>
				{nextRender && (
					<ContainerNext portrait={portrait} pixelSize={pixelSize}>
						<Next portrait={portrait} theme3d={theme3d} pixelSize={pixelSize}>
							{nextRender.map((row, y) => (
								<Row pixelSize={pixelSize} key={`row-${y}`}>
									{row.map((pixel, x) => {
										let topBloco = pixel && (!nextRender[y - 1] || !nextRender[y - 1][x]);
										const showTitansLogo = isTitansLogoCell(player.next, y, x);
										return (
											<Pixel
												paused={paused}
												theme3d={theme3d}
												topBloco={topBloco}
												zIndex={y}
												pixelSize={pixelSize}
												key={`pixel-${x}`}
												fill={pixel}
												color={player.next.color}
												logo={showTitansLogo ? TITANS_LOGO_SRC : undefined}
											>
												{showTitansLogo && <LogoMark src={TITANS_LOGO_SRC} alt="" aria-hidden="true" />}
											</Pixel>
										);
									})}
								</Row>
							))}
						</Next>
					</ContainerNext>
				)}
				{map && (
					<StyledStage ref={stageRef} {...others} theme3d={theme3d} pixelSize={pixelSize}>
						{map.map((row, y) => (
							<Row stage="true" pixelSize={pixelSize} key={`row-${y}`}>
								{row.map((pixel, x) => {
									let playerFill =
										player.bloco.bloco[y - player.pos[0]] &&
										player.bloco.bloco[y - player.pos[0]][x - player.pos[1]];
									const showTitansLogo = isTitansLogoCell(
										player.bloco,
										y - player.pos[0],
										x - player.pos[1]
									);
									let playerHint =
										hint.bloco.bloco[y - hint.pos[0]] &&
										hint.bloco.bloco[y - hint.pos[0]][x - hint.pos[1]];
									let topBloco =
										(playerFill || pixel.fill) &&
										(!player.bloco.bloco[y - player.pos[0] - 1] ||
											!player.bloco.bloco[y - player.pos[0] - 1][x - player.pos[1]]) &&
										(!map[y - 1] || !map[y - 1][x].fill);
									let zIndex = !playerFill && !pixel.fill && playerHint ? 99 : y;
									return (
										<Pixel
											paused={paused}
											theme3d={theme3d}
											hint={!pixel.fill && !playerFill && playerHint}
											pixelSize={pixelSize}
											stage="true"
											key={`pixel-${x}`}
											fill={pixel.fill || playerFill}
											color={playerFill ? player.bloco.color : pixel.color}
											playerColor={player.bloco.color}
											topBloco={topBloco}
											zIndex={zIndex}
											logo={pixel.logo ? (pixel.logoSrc || TITANS_LOGO_SRC) : undefined}
										>
											{pixel.logo && <LogoMark src={pixel.logoSrc || TITANS_LOGO_SRC} alt="" aria-hidden="true" />}
										</Pixel>
									);
								})}
							</Row>
						))}
					</StyledStage>
				)}
				{status && (
					<ContainerStatus portrait={portrait} pixelSize={pixelSize}>
						<StatusRow
							backgroundColor={theme3d ? "#444" : "black"}
							portrait={portrait}
							borderSize={pixelSize / 10}
							margin={pixelSize / 3}
							padding={pixelSize / 2}
							title="SCORE"
							value={status.score}
						/>
						<StatusRow
							backgroundColor={theme3d ? "#444" : "black"}
							portrait={portrait}
							borderSize={pixelSize / 10}
							margin={pixelSize / 3}
							padding={pixelSize / 2}
							title="LEVEL"
							value={status.level}
						/>
						<StatusRow
							backgroundColor={theme3d ? "#444" : "black"}
							portrait={portrait}
							borderSize={pixelSize / 10}
							margin={pixelSize / 3}
							padding={pixelSize / 2}
							title="LINES"
							value={status.lines}
						/>
					</ContainerStatus>
				)}
			</Game>
			{lose && (
				<LoseGame
					portrait={portrait}
					restartClick={restartClick}
					status={status}
					pixelSize={pixelSize}
					theme3d={theme3d}
				/>
			)}
		</StageShell>
	);
};

export default Stage;