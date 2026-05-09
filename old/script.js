document.addEventListener('DOMContentLoaded', function () {
	const colorSchemes = [
		{ bg: '#cbcbcb',     paper: '#e5ff03' },
		{ bg: '#e3d3bf',     paper: '#f45215' },
		{ bg: '#554dff',     paper: '#896c49' },
		{ bg: '#fa81b0',     paper: '#024c35' },
		{ bg: '#f6f6f6',     paper: '#2afa0b' },
		{ bg: 'whitesmoke',  paper: 'whitesmoke' }
	];
	const scheme = colorSchemes[Math.floor(Math.random() * colorSchemes.length)];
	document.documentElement.style.setProperty('--c-bg',    scheme.bg);
	document.documentElement.style.setProperty('--c-paper', scheme.paper);

	const sections = Array.from(document.querySelectorAll('.container > .quad'));
	const cells = ['1 / 1', '1 / 2', '2 / 1', '2 / 2'];
	for (let i = cells.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[cells[i], cells[j]] = [cells[j], cells[i]];
	}
	sections.forEach((el, i) => {
		if (cells[i]) el.style.gridArea = cells[i];
	});
});
