// *** Classic modulo ***

// x % y => x (HAC 14.20, slightly modified)
function mod(x, m) {
	// Determine the normalization shift using the most significant element of y (ym)
	var yk = mostSignificantElement(m);
	var mse = m[yk];
	var shift = 0;
	while ((mse & 0x8000000) == 0) {
		mse <<= 1;
		shift += 1;
	}

	// Normalize yOriginal << shift => y
	var y = create();
	smallShiftLeft(y, m, shift);

	// Normalize x << shift => x
	if (shift > 0) smallShiftLeft(x, x, shift)
	//console.log('shift', shift, HEX(x), HEX(y), HEX(m));

	// Make sure that x[xk + 1] exists (and is 0) in the first iteration
	var xk = mostSignificantElement(x);
	expand(x, xk + 2);

	// Maximum length of the quotient
	//quotient[L] = xk - yk + 1;		// enable quotient here

	// Iteratively subtract the divisor
	var div = y[yk] + 1;
	for (var d = xk - yk; d >= 0; d--) {
		// Approach:
		// Let Y be y * 2 ^ (28 * d).
		// We are trying to iteratively subtract n * Y from x, such that x >= 0 and x < Y.
		// Thanks to the normalization step, y[yk] >= 0x8000000, and div / y[yk] = 1 + 0x8000001/0x8000000. Hence, this converges extremely fast.
		// Without normalization, the convergence could be very bad, i.e. progressing just 1 bit at a time.
		// This is slightly worse than HAC 14.20, but avoids overshooting.

		// Start with a zero quotient
		//quotient[d] = 0;		// enable quotient here

		// We can subtract at least floor(xmsb / div) * Y
		var xmsb = x[yk + d + 1] * 0x10000000 + x[yk + d];
		//console.log('it', d, xmsb, div);
		if (xmsb > div) {
			var n = Math.floor(xmsb / div);
			//console.log('div', d, n, Math.log(n) / Math.log(2));
			subN(x, n, y, d);
			//quotient[d] += n;		// enable quotient here
		}

		// Check if we can subtract Y a few more times
		while (compareShifted(x, y, d) >= 0) {
			//console.log('sub', d);
			subD(x, y, d);
			//quotient[d] += 1;		// enable quotient here
		}

		// For maximum performance, keep xk as small as possible (it can never grow)
		while (xk >= 0 && x[xk] == 0) xk -= 1;
		x[L] = xk + 2;
	}

	// Remove normalization: x >> shift => x
	if (shift > 0) smallShiftRight(x, x, shift);
	trim(x);
	//trim(quotient);		// enable quotient here
}

// Returns x % y
function remainder(x, m) {
	var a = duplicate(x);
	mod(a, m);
	return a;
}

/*
// To run this test, activate the quotient in the mod(...) function, and add "quotient" as third argument.
function testMod() {
	var x = create();
	var y = create();
	var remainder = create();
	var quotient = create();
	var verification = create();
	var tCount = 0;
	var tMod = 0;
	for (var i = 0; i < 10000; i++) {
		setRandom(x, 147);
		setRandom(y, 74);
		//setBytes(x, cn.bytesFromHex('5C272ADF44DDA193F076C607E941'));
		//setBytes(y, cn.bytesFromHex('01949D523CA4EE'));

		// Calculate quotient and remainder
		remainder.set(x, 0);
		setZero(quotient);

		//var xBI = toBigInt(x);
		//var yBI = toBigInt(y);

		var tStart = new Date();
		mod(remainder, y, quotient);
		//mod_(xBI, yBI);
		var tDone = new Date();
		tMod += tDone - tStart;
		tCount += 1;

		// Check if the remainder < y
		if (compare(remainder, y) > 0) {
			console.log('Remainder too big', HEX(quotient) + ' * ' + HEX(y) + ' + ' + HEX(remainder) + ' - ' + HEX(x));
			break;
		}

		// Verify
		verification.set(remainder, 0);
		mul(verification, y, quotient);
		if (compare(verification, x) != 0) {
			console.log('Wrong result', HEX(quotient) + ' * ' + HEX(y) + ' + ' + HEX(remainder) + ' - ' + HEX(x));
			break;
		}
	}
	console.log('Test mod done', tCount, tMod + ' ms', tMod / tCount + ' ms');
}
*/
