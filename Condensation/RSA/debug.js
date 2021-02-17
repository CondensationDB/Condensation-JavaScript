/*
// *** Tests ***

this.test = function() {
	//testEGCDWithSmallInts();
	//testAddSub();
	//testSub();
	//testMul();
	//testSqr();
	//testMod();
	//testEGCD();
	//testModInverse();
	//testMontInverse();
	//testMontConversion();
	//testMontReduction();
	//testMontMul();
	//testModPowSmall();
	//testModPow();
	//testProbablePrime();
	//testFindProbablePrime();
	//testGCD();
	testGenerateKey();
};
*/

// *** Conversion to uppercase hex representation ***
// This is useful to verify calculations using the command line "bc" calculator.
// Type "ibase=16" and "obase=10" to set the hex input and output for all numbers.
// These functions are not needed in a production environment.

// Converts x to a hex sequence.
function toHex(x) {
	var hex = '';
	for (var i = x[L] - 1; i >= 0; i--) {
		if (x[i] > 0xfffffff) throw new Error('element too big: ' + x[i], x);
		hex += hexDigits[(x[i] >>> 24) & 0xf];
		hex += hexDigits[(x[i] >>> 20) & 0xf];
		hex += hexDigits[(x[i] >>> 16) & 0xf];
		hex += hexDigits[(x[i] >>> 12) & 0xf];
		hex += hexDigits[(x[i] >>> 8) & 0xf];
		hex += hexDigits[(x[i] >>> 4) & 0xf];
		hex += hexDigits[x[i] & 0xf];
	}

	return hex;
}

// Returns a hex representation of for the unsigned big integer x.
function HEX(x) {
	var hex = toHex(x);
	var i = 0;
	while (i < hex.length - 1 && hex.charAt(i) == '0') i++;
	return hex.substring(i).toUpperCase();
}

// a <= -x
// This is used by HEXS and not necessary in a production environment.
function negateS(a, x) {
	expand(a, x[L] + 1);

	for (var i = 0; i < x[L]; i++) a[i] = x[i] ^ 0xfffffff;

	var c = 1;
	for (var i = 0; i < a[L]; i++) {
		c = (c + a[i]) | 0;
		a[i] = c & 0xfffffff;
		c >>>= 28;
	}
	trimS(a);
}

// Returns a hex representation for the signed big integer x.
function HEXS(x) {
	if (sign(x) == 0) return HEX(x);
	var negX = create();
	negateS(negX, x);
	return '-' + HEX(negX);
};

// Returns a hex representation of a simple integer.
function HEXINT(x) {
	var hex = '';
	hex += hexDigits[(x >>> 28) & 0xf];
	hex += hexDigits[(x >>> 24) & 0xf];
	hex += hexDigits[(x >>> 20) & 0xf];
	hex += hexDigits[(x >>> 16) & 0xf];
	hex += hexDigits[(x >>> 12) & 0xf];
	hex += hexDigits[(x >>> 8) & 0xf];
	hex += hexDigits[(x >>> 4) & 0xf];
	hex += hexDigits[x & 0xf];
	var i = 0;
	while (i < hex.length - 1 && hex.charAt(i) == '0') i++;
	return hex.substring(i).toUpperCase();
}

/*
// *** Conversion to the BigInt.js format ***

// Converts a BigInteger to a BigInt for BigInt.js.
function toBigInt(x) {
	var xBI = int2bigInt(0, x.length * 28, 0);
	for (var i = x[L] - 1; i >= 0; i--) {
		leftShift_(xBI, 8);
		leftShift_(xBI, 8);
		leftShift_(xBI, 12);
		addInt_(xBI, x[i]);
	}
	return xBI;
}

// Converts a BigInt back to a BigInteger. Note that this destroys the BigInt.
// This is used by the test* functions, and not necessary in a production environment.
function fromBigInt(xBI) {
	var x = create();
	x[L] = L;
	for (var i = 0; i < L; i++) {
		var b0 = xBI[0] & 0xff;
		rightShift_(xBI, 8);
		var b1 = xBI[0] & 0xff;
		rightShift_(xBI, 8);
		var b2 = xBI[0] & 0xfff;
		rightShift_(xBI, 12);
		x[i] = b2 << 16 | b1 << 8 | b0;
	}
	trim(x);
	return x;
}

function bytes2BigInt(bytes) {
	var x = int2bigInt(0, bytes.length * 8, 0);
	for (var i = 0; i < bytes.length; i++) {
		leftShift_(x, 8);
		addInt_(x, bytes[i]);
	}

	return x;
}

function bigInt2Bytes(x) {
	var s = bitSize(x);
	var bytes = new Uint8Array(Math.floor((s - 1) / 8) + 1);
	for (var i = bytes.byteLength - 1; i >= 0; i--) {
		bytes[i] = x[0] & 0xff;
		rightShift_(x, 8);
	}

	return bytes;
}

function bigInt2Bytes256(x) {
	var bytes = new Uint8Array(256);
	for (var i = bytes.byteLength - 1; i >= 0; i--) {
		bytes[i] = x[0] & 0xff;
		rightShift_(x, 8);
	}

	return bytes;
}

this.bigInt2Bytes = bigInt2Bytes;
this.bytes2BigInt = bytes2BigInt;
*/
