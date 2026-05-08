document.addEventListener('DOMContentLoaded', function () {
	const colorSchemes = [
		{ color2: '#cbcbcb', color3: '#e5ff03' },
		{ color2: '#e3d3bf', color3: '#f45215' },
		{ color2: '#554dff', color3: '#896c49' },
		{ color2: '#fa81b0', color3: '#024c35' },
		{ color2: '#f6f6f6', color3: '#2afa0b' },
		{ color2: 'whitesmoke', color3: 'whitesmoke' }
	];
	const scheme = colorSchemes[Math.floor(Math.random() * colorSchemes.length)];
	document.documentElement.style.setProperty('--color-2', scheme.color2);
	document.documentElement.style.setProperty('--color-3', scheme.color3);

	const sections = [
		document.querySelector('.left'),
		document.querySelector('.right'),
		document.querySelector('.bottom-left-wrapper'),
		document.querySelector('.rightbottom')
	].filter(Boolean);

	const cells = ['1 / 1', '1 / 2', '2 / 1', '2 / 2'];
	for (let i = cells.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[cells[i], cells[j]] = [cells[j], cells[i]];
	}
	sections.forEach((el, i) => { el.style.gridArea = cells[i]; });
});
