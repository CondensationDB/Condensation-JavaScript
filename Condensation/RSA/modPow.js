// *** Exponentiation ***

// Montgomery exponentiation for small e (HAC 14.94, i.e. HAC 14.79 using Montgomery)
// Returns g ^ e mod m.
// m must be odd, 0 < g < m, and e > 0.
// This is used for RSA public key exponentiation, where e is typically 0x10001.
function modPowSmall(g, e, m) {
	// Convert to Montgomery
	var mp = montInverse(m);
	var gR = create();
	montConversion(gR, g, m);

	// Find the first non-zero bit of e
	var ek = mostSignificantElement(e);
	var eMask = 0x8000000;
	while ((e[ek] & eMask) == 0) eMask >>>= 1;
	//console.log(HEX(ans), HEX(g), HEX(gR), HEX(e), ek, eMask, HEX(m), mp);

	// Exponentiation for the first bit
	var aR = create();
	aR.set(gR, 0);

	// Exponentiation for all other bits
	var tR = create();
	while (true) {
		// Move to the next bit of e
		eMask >>>= 1;
		if (eMask == 0) {
			if (ek == 0) break;
			ek -= 1;
			eMask = 0x8000000;
		}

		// aR * aR * R^-1 => tR
		setZero(tR);
		sqr(tR, aR);
		montReduction(tR, m, mp);
		//if (ek == 0) console.log((e[ek] & eMask) == 0 ? 0 : 1, HEXINT(eMask), HEX(tR));

		if (e[ek] & eMask) {
			// tR * gR * R^-1 => aR if the bit is set
			montMul(aR, tR, gR, m, mp);
		} else {
			// tR => aR (simply by swapping the two) if the bit is not set
			var temp = aR;
			aR = tR;
			tR = temp;
		}
	}

	// Revert back to normal form
	montReduction(aR, m, mp);
	return aR;
}

/*
function testModPowSmall() {
	var m = create();
	var g = create();
	var e = create();
	setRandom(m, 74);
	m[0] |= 1;
	setRandom(g, 74);
	mod(g, m);
	setUint28(e, 7);
	var ans = modPowSmall(g, e, m);
	console.log(HEX(g) + '^' + HEX(e) + ' % ' + HEX(m) + ' - ' + HEX(ans));
}
*/

// Exponentiation (HAC 14.85 using Montgomery)
// Returns g ^ e mod m.
// m must be odd, 0 < g < m, and e > 0.
// This is used for RSA private key exponentiation, where e is typically 1024 or 2048 bits long.
function modPowBig(g, e, m) {
	// Convert to Montgomery
	var mp = montInverse(m);
	var gR = create();
	montConversion(gR, g, m);

	// Precomputation for 6 bits
	var gPrecomputed = new Array();
	gPrecomputed[1] = gR;
	gPrecomputed[2] = create();
	montMul(gPrecomputed[2], gR, gR, m, mp);
	for (var i = 3; i < 64; i += 2) {
		gPrecomputed[i] = create();
		montMul(gPrecomputed[i], gPrecomputed[i - 2], gPrecomputed[2], m, mp);
	}

	// Start with R mod m
	var aR = create();
	montConversionOne(aR, m);

	// Find the first non-zero bit of e
	var ek = mostSignificantElement(e);
	var eMask = 0x8000000;
	while ((e[ek] & eMask) == 0) eMask >>>= 1;

	// Start by selecting that one bit
	var selection = 1;	// = usableSelection * 2 ^ zeroBits
	var usableSelection = 1;
	var usableBits = 1;
	var zeroBits = 0;

	// Process all other bits
	var tR = create();
	while (true) {
		// Move to the next bit of e
		eMask >>>= 1;
		if (eMask == 0) {
			if (ek == 0) break;
			ek -= 1;
			eMask = 0x8000000;
		}

		// Update the selection, and flush it whenever necessary
		if (e[ek] & eMask) {
			// Add a 1 to the selection
			if (selection > 31) flushSelection();
			selection = selection * 2 + 1;
			usableSelection = selection;
			usableBits += zeroBits + 1;
			zeroBits = 0;
		} else if (usableBits == 0) {
			// Apply a 0 bit directly if there is no selection
			sqrAR();
		} else {
			// Add a 0 to the selection
			selection *= 2;
			zeroBits += 1;
		}
	}

	// Flush any started selection
	if (usableBits > 0) flushSelection();

	// Return an object that allows to continue squaring (used by millerRabin())
	return {result: result, sqrAR: sqrAR};

	// Flushes the currently selected bits from e, and resets the selection
	function flushSelection() {
		//console.log('flush', usableBits, HEXINT(usableSelection), zeroBits, ek, HEXINT(eMask), HEX(aR));
		for (; usableBits > 0; usableBits--) sqrAR();
		montMul(tR, aR, gPrecomputed[usableSelection], m, mp);
		swap();
		for (; zeroBits > 0; zeroBits--) sqrAR();

		selection = 0;
		usableSelection = 0;
	}

	// aR * aR * R^-1 => aR
	function sqrAR() {
		setZero(tR);
		sqr(tR, aR);
		montReduction(tR, m, mp);
		swap();
	}

	// tR => aR by swapping the two
	function swap() {
		var temp = aR;
		aR = tR;
		tR = temp;
	}

	// Reduces aR to obtain the final result
	function result() {
		tR.set(aR, 0);
		montReduction(tR, m, mp);
		return tR;
	}
}

/*
function testModPow() {
	var m = create();
	var g = create();
	var e = create();

	var tCount = 0;
	var tSmall = 0;
	var tBig = 0;
	for (var i = 0; i < 1; i++) {
		setRandom(m, 74);
		m[0] |= 1;
		m[73] &= 0xf;
		setRandom(g, 74);
		g[73] &= 0xf;
		mod(g, m);
		setRandom(e, 74);
		e[73] &= 0xf;
		mod(e, m);

		var tStart = new Date();
		var ansSmall = modPowSmall(g, e, m);
		var tLap = new Date();
		var ansBig = modPowBig(g, e, m).result();
		var tDone = new Date();

		tSmall += tLap - tStart;
		tBig += tDone - tLap;
		tCount += 1;

		if (compare(ansSmall, ansBig) != 0) {
			console.log('modPowSmall', HEX(g) + '^' + HEX(e) + ' % ' + HEX(m) + ' - ' + HEX(ansSmall));
			console.log('modPowBig', HEX(g) + '^' + HEX(e) + ' % ' + HEX(m) + ' - ' + HEX(ansBig));
			break;
		}
	}
	console.log('Test modPow done', tCount);
	console.log('Small', tSmall / tCount + ' ms');
	console.log('Big', tBig / tCount + ' ms');
}
*/
