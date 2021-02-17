// *** RSA 2048 ***
// A big integer is stored as an Uint32Array in little endian order. Only the lowest 28 bits of each element are used.
// All big integers have the same size in memory (151 elements). Only the lower b[L] elements are in use. All other elements are ignored, and may have any value. For efficiency, the code tries to keep b[L] as small as possible, but it is not always a tight bound. The most significant (non-zero) element is returned by mostSignificantElement(b).

// This code can deal with an RSA bit size of 74 * 28 = 2072 or lower.

var rsa = new RSA();

function RSA() {
	INCLUDE general.js
	INCLUDE random.js
	INCLUDE comparison.js
	INCLUDE bitShift.js
	INCLUDE addSub.js
	INCLUDE mul.js
	INCLUDE mod.js
	INCLUDE modInverse.js
	INCLUDE montgomery.js
	INCLUDE modPow.js
	INCLUDE primalityTest.js
	INCLUDE keyGeneration.js
	INCLUDE debug.js

	INCLUDE encoding.js

	INCLUDE bytes.js
	INCLUDE PublicKey.js
	INCLUDE PrivateKey.js
}
