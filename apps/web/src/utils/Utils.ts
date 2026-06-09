export function PrintPlayerInMap(player, map) {
	if (!player) return map;

	const nextMap = map.map(row => row.map(pixel => ({ ...pixel })));
	const isTitansPiece = Boolean(player.bloco.specialTitans);
	const logoCell = player.bloco.logoCell || [];

	player.bloco.bloco.forEach((row, rowIndex) => {
		row.forEach((pixel, columnIndex) => {
			if (!pixel) return;
			const y = player.pos[0] + rowIndex;
			const x = player.pos[1] + columnIndex;
			if (nextMap[y] && nextMap[y][x]) {
				const isLogoCell =
					isTitansPiece &&
					logoCell.length === 2 &&
					rowIndex === logoCell[0] &&
					columnIndex === logoCell[1];
				nextMap[y][x] = {
					fill: 1,
					color: player.bloco.color || "#e54b4b",
					specialTitans: isTitansPiece,
					logo: isLogoCell,
					logoSrc: isLogoCell ? player.bloco.logoSrc || "/team-logos/TEN.svg" : undefined,
				};
			}
		});
	});

	return nextMap;
}
