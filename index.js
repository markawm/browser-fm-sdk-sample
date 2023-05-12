const Rox = require('rox-browser');

const flags = {
	//defaultTest: new Rox.RoxString('from-code', ['value-1', 'value-2', 'value-3'])
	showCard: new Rox.RoxString(
		'{"justify": "left", "cssStyle": "", "showCard": "false", "showCardName": "true"}',
		['{"justify": "left", "cssStyle": "", "showCard": "false", "showCardName": "true"}', '{"justify": "left", "cssStyle": "", "showCard": "true", "showCardName": "false"}'])
};

const configurationFetchedHandler = fetcherResults => {
  console.log('FETCHED CONFIG! result: ', fetcherResults);

	console.log('==============================================================================================================');
  console.log('showCard after fetching: ', flags.showCard.getValue());
  console.log('==============================================================================================================');
};

async function initFeatureManagement() {
	Rox.register(flags);
	Rox.setCustomBooleanProperty("syf-widget-token", function(){
		return 'abcdefg'; // => resolves to the true/false variant.
		//return '43534534'; // => resolves to the false/true variant.
	});
	Rox.setCustomStringProperty("partnerId", function(){
  	return 'PI53421676';	// Results in one of the values from targetting.
  	//return 'zzz';				// Results in default value-from-code (because flag rule not matched).
	});
	console.log('showCard value @1: ', flags.showCard.getValue());
	console.log('Calling setup');
	const myEnvId = '612f5d0a30c0b442ab612c3c';		// Mine
	// TODO: insert your key here:
	const synchronyEnvId = '<TODO>';	// Synchrony
	await Rox.setup(synchronyEnvId, {
		configurationFetchedHandler,
		//debugLevel: 'verbose',
		configuration: {disableNetworkFetch: true}
	});
	console.log('Done setup');
	console.log('showCard value @2: ', flags.showCard.getValue());

	document.write('<p>');
	document.write('showCard: ', flags.showCard.getValue());
	document.write('</p>');
}

initFeatureManagement();
