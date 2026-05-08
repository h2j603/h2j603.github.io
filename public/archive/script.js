document.addEventListener('DOMContentLoaded', function() {
	const colorSchemes = [
		{ color2: '#cbcbcb', color3: '#e5ff03' },
		{ color2: '#e3d3bf', color3: '#f45215' },
		{ color2: '#554dff', color3: '#896c49' },
		{ color2: '#fa81b0', color3: '#024c35' },
		{ color2: '#f6f6f6', color3: '#2afa0b' },
		{ color2: 'whitesmoke', color3: 'whitesmoke' }
	];

	const randomScheme = colorSchemes[Math.floor(Math.random() * colorSchemes.length)];

	document.documentElement.style.setProperty('--color-2', randomScheme.color2);
	document.documentElement.style.setProperty('--color-3', randomScheme.color3);
	const container = document.querySelector('.container');
	const sections = [
		document.querySelector('.left'),
		document.querySelector('.right'),
		document.querySelector('.bottom-left-wrapper'),
		document.querySelector('.rightbottom')
	];

	const positions = [
		{ top: '0', left: '0' },
		{ top: '0', left: '50%' },
		{ top: '50%', left: '0' },
		{ top: '50%', left: '50%' }
	];

	// Fisher-Yates shuffle algorithm
	for (let i = positions.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[positions[i], positions[j]] = [positions[j], positions[i]];
	}

	sections.forEach((section, index) => {
		if (section) {
			section.style.top = positions[index].top;
			section.style.left = positions[index].left;
		}
	});
});

