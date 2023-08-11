import originalFont from "js-pixel-fonts/data/seven-plus.json";

/** @type {typeof originalFont} */
const font = JSON.parse(JSON.stringify(originalFont));

// center symbols
font.glyphs[","].offset = 5;
font.glyphs[":"].offset = 2;
font.glyphs[";"].offset = 2;
font.glyphs["*"].offset = 2;

// fix the font going off the screen
font.glyphs["q"].offset = 1;
font.glyphs["q"].pixels = [font.glyphs["q"].pixels[0], ...[...font.glyphs["q"].pixels.slice(2, 7)]];
font.glyphs["y"].offset = 0;
font.glyphs["y"].pixels[0] = font.glyphs["y"].pixels[0].map((p) => 0);
font.glyphs["p"].offset = 1;
font.glyphs["p"].pixels = [font.glyphs["p"].pixels[0], ...[...font.glyphs["p"].pixels.slice(2, 7)]];
font.glyphs["g"].offset = 1;
font.glyphs["g"].pixels = [font.glyphs["g"].pixels[0], ...[...font.glyphs["g"].pixels.slice(2, 7)]];
font.glyphs["j"].pixels = [...[...font.glyphs["j"].pixels.slice(0, 2)], ...[...font.glyphs["j"].pixels.slice(4, 9)]];

// make characters more compact
font.glyphs["I"].pixels = font.glyphs["I"].pixels.map((row) => row.slice(1, 4));
font.glyphs["L"].pixels = font.glyphs["L"].pixels.map((row) => row.slice(0, 3));
font.glyphs["E"].pixels = font.glyphs["E"].pixels.map((row) => row.slice(0, 1).concat(row.slice(2, 5)));

/*
 * Modified from https://github.com/hgcummings/pixel-fonts
 * Licensed under the MIT licence, (c) 2018 Harry Cummings
 */

const gap = [[0]];

const areTouching = (first, second) => {
	for (let i = 0; i < first.length; ++i) {
		if (first[i] && first[i][first[i].length - 1] === 1) {
			for (let j = -1; j <= 1; ++j) {
				if (second[i + j] && second[i + j][0] === 1) {
					return true;
				}
			}
		}
	}
};

const renderLine = (text) => {
	const letters = text.split("");
	const characters = [];
	let maxHeight = 0;
	for (let letter of letters) {
		let glyph = font.glyphs[""];
		if (font.glyphs[letter]) {
			glyph = font.glyphs[letter];
		} else {
			log.warn(`Missing letter ${letter}`);
		}
		let newCharacter = [];
		glyph.pixels.forEach((row, index) => {
			newCharacter[index + glyph.offset] = row;
		});
		maxHeight = Math.max(maxHeight, newCharacter.length);
		if (font.isFixedWidth || (characters.length && areTouching(characters[characters.length - 1], newCharacter))) {
			characters.push(gap);
		}
		characters.push(newCharacter);
	}
	return characters.reduce(
		(acc, cur) => {
			const blankRow = Array(cur[cur.length - 1].length).fill(0);
			for (let i = 0; i < maxHeight; ++i) {
				const row = cur[i] || blankRow;
				acc[i].push(...row);
			}
			return acc;
		},
		Array(maxHeight)
			.fill(0)
			.map((_) => [])
	);
};

/** @type {(str) => import("js-pixel-fonts").Pixel[][]} */
export const renderPixels = (text) => {
	const lines = text.split("\n").map((line) => [[0]].concat(renderLine(line)));
	lines[0].shift();
	return [].concat(...lines);
};
