// *** SHA256 ***

// SHA256 constants [4.2.2]
var SHA256K = [
	0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
	0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
	0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
	0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
	0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
	0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
	0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
	0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];

// Calculates the SHA256 sum of the bytes and writes the result to the resultDataView.
// --> new
cn.SHA256 = function() {
	var sha = this;

	// Initial hash value [5.3.1]
	var h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];

	// Helper functions
	function ROTR(x, n) { return (x >>> n) | (x << (32 - n)); }
	function prepareS0(x) { return ROTR(x, 7) ^ ROTR(x, 18) ^ (x >>> 3);  }
	function prepareS1(x) { return ROTR(x, 17) ^ ROTR(x, 19) ^ (x >>> 10); }
	function roundS0(x) { return ROTR(x, 2) ^ ROTR(x, 13) ^ ROTR(x, 22); }
	function roundS1(x) { return ROTR(x, 6) ^ ROTR(x, 11) ^ ROTR(x, 25); }
	function ch(x, y, z)  { return (x & y) ^ (~x & z); }
	function maj(x, y, z) { return (x & y) ^ (x & z) ^ (y & z); }

	// Hash computation [6.1.2]
	function addChunk(dv) {
		// Prepare message schedule
		var w = new Array(64);
		for (var i = 0; i < 16; i++) w[i] = dv.getUint32(i * 4) | 0;
		for (var i = 16; i < 64; i++)
			w[i] = (prepareS1(w[i - 2]) + w[i - 7] + prepareS0(w[i - 15]) + w[i - 16]) | 0;

		// Initialise working variables
		var s = new Array(8);
		for (var i = 0; i < 8; i++)
			s[i] = h[i];

		// Main loop
		for (var i = 0; i < 64; i++) {
			var t1 = s[7] + roundS1(s[4]) + ch(s[4], s[5], s[6]) + SHA256K[i] + w[i];
			var t2 = roundS0(s[0]) + maj(s[0], s[1], s[2]);
			s[7] = s[6];
			s[6] = s[5];
			s[5] = s[4];
			s[4] = (s[3] + t1) | 0;
			s[3] = s[2];
			s[2] = s[1];
			s[1] = s[0];
			s[0] = (t1 + t2) | 0;
		}

		// New intermediate hash value
		for (var i = 0; i < 8; i++)
			h[i] = (h[i] + s[i]) | 0;
	}

	// State
	var byteLength = 0;
	var unprocessedBytes = new Uint8Array(128);
	var unprocessedLength = 0;

	sha.update = function(bytes) {
		byteLength += bytes.byteLength;

		// Fill the unprocessed buffer
		var r = 0;
		if (unprocessedLength > 0) {
			for (; unprocessedLength < 64 && r < bytes.byteLength; unprocessedLength++, r++)
				unprocessedBytes[unprocessedLength] = bytes[r];
			if (unprocessedLength < 64) return;
			addChunk(new DataView(unprocessedBytes.buffer, unprocessedBytes.byteOffset, 64));
			unprocessedLength = 0;
		}

		// Process complete blocks
		for (; r < bytes.byteLength - 63; r += 64)
			addChunk(new DataView(bytes.buffer, bytes.byteOffset + r, 64));

		// Put the rest into the incomplete buffer
		for (; r < bytes.byteLength; r++, unprocessedLength++)
			unprocessedBytes[unprocessedLength] = bytes[r];
	};

	sha.finishToBytes = function(result) {
		// Add the tail to the unprocessed bytes
		var tail = unprocessedLength < 56 ? 64 : 128;
		unprocessedBytes[unprocessedLength] = 0x80;
		unprocessedLength += 1;
		for (; unprocessedLength < tail - 5; unprocessedLength++) unprocessedBytes[unprocessedLength] = 0;

		unprocessedBytes[tail - 5] = (byteLength & 0xe0000000) >> 29;
		unprocessedBytes[tail - 4] = (byteLength & 0x1fe00000) >> 21;
		unprocessedBytes[tail - 3] = (byteLength & 0x001fe000) >> 13;
		unprocessedBytes[tail - 2] = (byteLength & 0x00001fe0) >> 5;
		unprocessedBytes[tail - 1] = (byteLength & 0x0000001f) << 3;

		// Add the last one or two chunks
		addChunk(new DataView(unprocessedBytes.buffer, 0, 64));
		if (tail == 128) addChunk(new DataView(unprocessedBytes.buffer, 64, 64));

		// Convert the result to 32 bytes
		var dv = new DataView(result.buffer, result.byteOffset, result.byteLength);
		for (var i = 0; i < 8; i++)
			dv.setUint32(i * 4, h[i]);
	};

	sha.finish = function() {
		var result = new Uint8Array(32);
		sha.finishToBytes(result);
		return result;
	};
};
