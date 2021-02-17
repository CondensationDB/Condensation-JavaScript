// Returns a byte array with random content. It uses the cryptographic random number generator built into the browser, with a fallback to the regular (low-quality) random number generator.
var fillRandom = self.crypto && self.crypto.getRandomValues ? cryptographicFillRandom : simpleFillRandom;

// Uses the cryptographic random number to generate a random byte array.
function cryptographicFillRandom(typedArray) {
	self.crypto.getRandomValues(typedArray);
}

// Returns a byte array with random content. It uses the random number generator built into the browser.
function simpleFillRandom(typedArray) {
	var bytes = new Uint8Array(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength);
	for (var i = 0; i < bytes.length; i++)
		bytes[i] = Math.floor(Math.random() * 256);
}
