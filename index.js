const Rox = require('rox-browser');

const flags = {
  enableTutorial: new Rox.Flag(),
  titleColors: new Rox.RoxString('White', ['White', 'Blue', 'Green', 'Yellow']),
  titleSize: new Rox.RoxNumber(12, [12, 14, 18, 24])
};

async function initFeatureManagement() {
	Rox.register(flags);
	console.log('Calling setup');
	await Rox.setup('612f5d0a30c0b442ab612c3c');
	console.log('Done setup');
	console.log('flags.enableTutorial.isEnabled()=', flags.enableTutorial.isEnabled());
	console.log('flags.titleColors.getValue()=', flags.titleColors.getValue());

	document.write('<p>')
	document.write('flags.enableTutorial.isEnabled()=', flags.enableTutorial.isEnabled());
	document.write('</p>')
	document.write('<p>')
	document.write('flags.titleColors.getValue()=', flags.titleColors.getValue());
	document.write('</p>')
}

initFeatureManagement();
