const Rox = require('rox-browser');

const flags = {
	defaultTest: new Rox.RoxString('from-code', ['value-1', 'value-2', 'value-3'])
};

const configurationFetchedHandler = fetcherResults => {
  console.log('FETCHED CONFIG! result: ', fetcherResults);

  console.log('New result is: ', flags.defaultTest.getValue());
  console.log('DONE');
};

async function initFeatureManagement() {
	Rox.register(flags);
	Rox.setCustomBooleanProperty("my-stickiness", function(){
   //return '1'; // => value-3
		return '3'; // => value-1
	});
	console.log('defaultTest value @1: ', flags.defaultTest.getValue());
	console.log('Calling setup');
	await Rox.setup('612f5d0a30c0b442ab612c3c', {
		configurationFetchedHandler,
		//debugLevel: 'verbose',
		//configuration: {disableNetworkFetch: true}
	});
	console.log('Done setup');
	console.log('defaultTest value @2: ', flags.defaultTest.getValue());

	document.write('<p>');
	document.write('Default test: ', flags.defaultTest.getValue());
	document.write('</p>');
}

initFeatureManagement();
