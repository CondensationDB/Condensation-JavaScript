// *** Store resolver ***
// To implement a different (e.g. more restrictive store resolver, simply overwrite "storeFromUrl".

// We use https by default, since most websites using condensation.js will probably use that. To use plain http, initialize Condensation as follows:
//	var cn = new Condensation();
//	cn.storeProtocol = 'http';
cn.storeProtocol = 'https';

// Creates a store given a URL. The function always succeeds in the sense that it always returns a store. The returned store may not work, however.
// The store is always a HTTP(S) store, since these are the only stores we can handle from a webbrowser. Any other protocol is replaced by http: or https:, although store.url returns the original (unmodified) URL.
// String --> cn.HTTPStore
cn.storeFromUrl = function(url) {
	var mappedUrl = cn.storeProtocol + '://' + stripProtocol(url);
	return new cn.HTTPStore(url, mappedUrl);
};

function stripProtocol(url) {
	var slashPos = url.indexOf('/');
	var colonPos = url.indexOf(':');
	if (colonPos >= 0 && (colonPos < slashPos || slashPos < 0)) url = url.substr(colonPos + 1);
	while (url.substr(0, 1) == '/') url = url.substr(1);
	return url;
}
