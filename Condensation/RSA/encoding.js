// *** OAEP and PSS encoding ***

var emLength = 256;	// 2048 / 8
var hashLength = 32;
var PSSPadding1 = new Uint8Array(8);  // 8 zeroes
var OAEPZeroLabelHash = new Uint8Array([0xe3, 0xb0, 0xc4, 0x42, 0x98, 0xfc, 0x1c, 0x14, 0x9a, 0xfb, 0xf4, 0xc8, 0x99, 0x6f, 0xb9, 0x24, 0x27, 0xae, 0x41, 0xe4, 0x64, 0x9b, 0x93, 0x4c, 0xa4, 0x95, 0x99, 0x1b, 0x78, 0x52, 0xb8, 0x55]);

this.verifyPSS = verifyPSS;
this.generatePSS = generatePSS;
this.encodeOAEP = encodeOAEP;
this.decodeOAEP = decodeOAEP;

// Uint8Array, Uint8Array [byteLength == 256] --> Boolean
function verifyPSS(digest, em) {
	// Check the last byte
	if (em[emLength - 1] != 0xbc) return false;

	// Unmask the salt: zeros | 0x01 | salt = maskedDB ^ mask
	var dbLength = emLength - hashLength - 1;   // max. 223
	var mask = maskGenerationFunction1(cn.slice(em, emLength - hashLength - 1, hashLength), dbLength);
	for (var i = 0; i < dbLength; i++) em[i] ^= mask[i];

	// The first byte may be incomplete
	em[0] &= 0x7f;

	// Remove leading zeros
	var n = 0;
	while (em[n] == 0 && n < dbLength) n++;

	// The first unmasked byte must be 0x01
	if (em[n] != 0x01) return false;
	n++;

	// The rest is salt (max. 222 bytes)
	var salt = cn.slice(em, n, dbLength - n);

	// Calculate H = SHA256(8 zeros | digest | salt)
	var sha = new cn.SHA256();
	sha.update(PSSPadding1);
	sha.update(digest);
	sha.update(salt);
	var h = sha.finish();

	// Verify H
	for (var i = 0; i < 32; i++)
		if (h[i] != em[dbLength + i]) return false;

	return true;
};

// Uint8Array --> Uint8Array [byteLength == 256]
function generatePSS(digest) {
	// Prepare the salt
	var salt = cn.randomBytes(32);

	// Prepare the message = maskedDB | H | 0xbc
	var em = new Uint8Array(emLength);
	var h = cn.slice(em, emLength - hashLength - 1, hashLength);
	em[emLength - 1] = 0xbc;

	// Calculate H = SHA256(8 zeros | digest | salt)
	var sha = new cn.SHA256();
	sha.update(PSSPadding1);
	sha.update(digest);
	sha.update(salt);
	sha.finishToBytes(h);

	// Write maskedDB = (zeros | 0x01 | salt) ^ mask
	var dbLength = emLength - hashLength - 1;
	var mask = maskGenerationFunction1(h, dbLength);

	// Zeros
	var n = 0;
	for (; n < dbLength - salt.byteLength - 1; n++)
		em[n] = mask[n];

	// 0x01
	em[n] = (0x01 ^ mask[n]) | 0;
	n++;

	// Salt
	for (var i = 0; i < salt.byteLength; i++, n++)
		em[n] = (salt[i] ^ mask[n]) | 0;

	// Set the first bit to 0, because the signature can only be 2048 - 1 bit long
	em[0] &= 0x7f;

	return em;
};

// Uint8Array --> Uint8Array [byteLength == 256]
function encodeOAEP(message) {
	// Create DB = labelHash | zeros | 0x01 | message
	var db = new Uint8Array(emLength - hashLength - 1);
	db.set(OAEPZeroLabelHash, 0);
	db[db.byteLength - message.byteLength - 1] = 0x01;
	db.set(message, db.byteLength - message.byteLength);

	// Create seed
	var seed = cn.randomBytes(hashLength);

	// Prepare the encoded message
	var em = new Uint8Array(emLength);

	// Write maskedDB = DB ^ MGF1(seed)
	var dbMask = maskGenerationFunction1(seed, db.byteLength);
	var n = hashLength + 1;
	for (var i = 0; i < db.byteLength; i++, n++)
		em[n] = (db[i] ^ dbMask[i]);

	// Write maskedSeed = seed ^ MGF1(maskedDB)
	var seedMask = maskGenerationFunction1(cn.slice(em, hashLength + 1, db.byteLength), hashLength);
	n = 1;
	for (var i = 0; i < hashLength; i++, n++)
		em[n] = (seed[i] ^ seedMask[i]) | 0;

	return em;
};

// Uint8Array [byteLength == 256] --> Uint8Array
function decodeOAEP(em) {
	// Extract the seed
	var dbLength = emLength - hashLength - 1;
	var seedMask = maskGenerationFunction1(cn.slice(em, hashLength + 1, dbLength), hashLength);
	var seed = new Uint8Array(hashLength);
	var n = 1;
	for (var i = 0; i < hashLength; i++, n++)
		seed[i] = (em[n] ^ seedMask[i]) | 0;

	// Prepare the DB mask
	var dbMask = maskGenerationFunction1(seed, dbLength);

	// To guard against timing attacks, we just keep a correct flag, and continue processing
	// even if the sequence is clearly wrong. (Note that on some systems, the compiler might
	// optimize this and return directly whenever we set correct = false.)
	var correct = true;

	// Verify the label hash
	var i = 0;
	for (; i < OAEPZeroLabelHash.byteLength; i++, n++)
		if (OAEPZeroLabelHash[i] != (em[n] ^ dbMask[i]) | 0) correct = false;

	// Consume the PS (zeros)
	for (; em[n] == dbMask[i] && n < emLength; n++) i++;

	// Consume the 0x01 byte
	if (n >= emLength || ((em[n] ^ dbMask[i]) | 0) != 0x01) correct = false;
	n++;
	i++;

	// Unmask the message
	var message = new Uint8Array(emLength - n);
	var k = 0;
	for (var k = 0; n < emLength; k++, n++, i++)
		message[k] = (em[n] ^ dbMask[i]) | 0;

	return correct ? message : null;
};

// Uint8Array, int --> Uint8Array
function maskGenerationFunction1(seed, maskLength) {
	// Allocate memory
	var blocks = Math.floor((maskLength - 1) / 32) + 1;
	var mask = new Uint8Array(blocks * 32);

	// Write blocks
	var seedWithCounter = new Uint8Array(seed.byteLength + 4);
	seedWithCounter.set(seed, 0);
	for (var i = 0; i < blocks; i++) {
		seedWithCounter[seed.byteLength + 3] = i;
		var sha = cn.SHA256();
		sha.update(seedWithCounter);
		sha.finishToBytes(cn.slice(mask, i * 32, 32));
	}

	return mask;
}

// Uint8Array --> Uint8Array [byteLength == length]
function padBytesLeft(bytes, length) {
	if (bytes.byteLength == length) return bytes;

	if (bytes.byteLength > length)
		return cn.slice(bytes, bytes.byteLength - length, length);

	var newBytes = new Uint8Array(length);
	newBytes.set(bytes, length - bytes.byteLength);
	return newBytes;
}
