// Increments the CTR counter.
// Uint8Array [byteLength = 16] -->
function incrementCounter(counter) {
	for (var n = 15; n >= 0; n--) {
		counter[n]++;
		if (counter[n] != 0) break;
	}
}

// Asynchronously en- or decrypts a large Uint8Array in-place.
// Uint8Array, Uint8Array [byteLength = 32], Uint8Array [byteLength = 16] --> Done
this.cryptAsynchronously = function(data, key, startCounter) {
	var done = {};
	done.onProgress = cn.ignore;	// onProgress(done, total)
	done.onDone = cn.ignore;		// onDone()

	// Initialize AES block encryption and initialization vector
	var aes = new AES256(key);

	// Prepare encryption
	var counter = new Uint8Array(16);
	if (startCounter) counter.set(startCounter, 0);
	var encryptedCounter = new Uint8Array(16);
	var i = 0;

	setTimeout(encryptNextPart, 4);
	return done;

	// Encrypt part by part
	function encryptNextPart() {
		// Determine how much to encrypt this time
		var target = i + 32000;
		if (target > data.byteLength - 16) target = data.byteLength - 16;

		if (i >= target) {
			// Encrypt the last block
			aes.encryptInplace(counter);
			for (var n = 0; n < data.byteLength - i; n++) data[i + n] ^= counter[n];
			return done.onDone();
		}

		// Encrypt blocks in CTR mode
		for (; i < target; i += 16) {
			for (var n = 0; n < 16; n++) encryptedCounter[n] = counter[n];
			aes.encryptInplace(encryptedCounter);
			for (var n = 0; n < 16; n++) data[i + n] ^= encryptedCounter[n];
			incrementCounter(counter);
		}

		// Progress update
		done.onProgress(i, data.byteLength);

		// Schedule the next blocks
		setTimeout(encryptNextPart, 4);
	};
};

// En- or decrypts a short Uint8Array in-place.
// Uint8Array, Uint8Array [byteLength = 32], Uint8Array [byteLength = 16] --> Uint8Array
this.crypt = function(data, key, startCounter) {
	// Prepare encryption
	var aes = new AES256(key);
	var counter = new Uint8Array(16);
	if (startCounter) counter.set(startCounter, 0);
	var encryptedCounter = new Uint8Array(16);

	// Encrypt blocks in CTR mode
	var i = 0;
	for (; i < data.byteLength - 16; i += 16) {
		for (var n = 0; n < 16; n++) encryptedCounter[n] = counter[n];
		aes.encryptInplace(encryptedCounter);
		for (var n = 0; n < 16; n++) data[i + n] ^= encryptedCounter[n];
		incrementCounter(counter);
	}

	// Encrypt the last block
	aes.encryptInplace(counter);
	for (var n = 0; n < data.byteLength - i; n++) data[i + n] ^= counter[n];
};
