// *** Conversion between hex strings and Uint8Arrays ***

// A list of hexadecimal digits.
var hexDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];

// A list of hex values for 8-byte character codes
var hexValues = [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 255, 255, 255, 255, 255, 255, 255, 10, 11, 12, 13, 14, 15, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 10, 11, 12, 13, 14, 15, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255];

// Converts a Uint8Array to a (lowercase) hex string.
// Uint8Array --> String
cn.hexFromBytes = function(bytes) {
	var hex = '';
	for (var i = 0; i < bytes.length; i++)
		hex += hexDigits[(bytes[i] >> 4) & 0xf] + hexDigits[bytes[i] & 0xf];
	return hex;
};

// Converts a hex string to a Uint8Array. Both uppercase and lowercase digits are accepted.
// String --> Uint8Array?
cn.bytesFromHex = function(hex) {
	if (hex.length % 2 != 0) hex = '0' + hex;
	var byteLength = hex.length / 2;
	var bytes = new Uint8Array(byteLength);

	for (var i = 0; i < byteLength; i++) {
		var c1 = hex.charCodeAt(i * 2);
		if (c1 > 127) return null;
		var h1 = hexValues[c1];
		if (h1 >= 16) return null;
		var c2 = hex.charCodeAt(i * 2 + 1);
		if (c2 > 127) return null;
		var h2 = hexValues[c2];
		if (h2 >= 16) return null;
		bytes[i] = h1 << 4 | h2;
	}

	return bytes;
};
