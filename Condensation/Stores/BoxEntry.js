// *** Box entry ***
// Each entry of a box consists of a hash, and an optional store URL.

// Creates a box entry.
// Hash, String? --> BoxEntry
cn.BoxEntry = function(hash, storeUrl) {
	this.storeUrl = storeUrl;
	this.hash = hash;
	this.url = function() { return (storeUrl == null ? '' : storeUrl + '/objects/') + hash.hex(); };
};

// Interprets the text as object URL, and returns a corresponding BoxEntry object if successful, and null otherwise.
// String --> BoxEntry?
cn.boxEntryFromObjectUrl = function(text) {
	if (text == null) return;
	var result = text.match(/^\s*(.*?)(\/+objects|)\/+([0-9a-f]{64})\s*$/i);
	if (result) return new cn.BoxEntry(cn.hashFromHex(result[3]), result[1]);
	var hash = cn.hashFromHex(text);
	if (hash) return new cn.BoxEntry(hash);
	return null;
};
