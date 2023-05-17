const Rox = require('rox-browser');

const flags = {
  // The classic sample flags. Optionally, switch this flags to your own:
  enableTutorial: new Rox.Flag(),
  titleColors: new Rox.RoxString('White', ['White', 'Blue', 'Green', 'Yellow']),
};

async function initFeatureManagement() {
	Rox.register(flags);
	// Insert your own environment key here:
	await Rox.setup('612f5d0a30c0b442ab612c3c');

	document.write('<p>')
	document.write('flags.enableTutorial.isEnabled()=', flags.enableTutorial.isEnabled());
	document.write('</p>')
	document.write('<p>')
	document.write('flags.titleColors.getValue()=', flags.titleColors.getValue());
	document.write('</p>')
}

initFeatureManagement();
