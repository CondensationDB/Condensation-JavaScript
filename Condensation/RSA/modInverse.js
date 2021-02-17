// *** Extended GCD and modulo inverse ***

// Returns the sign.
function sign(x) { return x[L] > 0 && x[x[L] - 1] & 0x8000000 ? 0xfffffff : 0; }

// Expands a signed integer to n elements.
function expandS(x, n) {
	if (n > L) throw new Error('expandS: n=' + n + ' too big');
	var filler = sign(x);
	while (x[L] < n) {
		x[x[L]] = filler;
		x[L] += 1;
	}
}

// Trims the length of a signed integer to avoid trailing zeros.
function trimS(x) {
	var filler = sign(x);
	while (x[L] > 1 && x[x[L] - 1] == filler && ((x[x[L] - 1] ^ x[x[L] - 2]) & 0x8000000) == 0) x[L] -= 1;
}

// x += y
// x is considered a signed integer, and y an unsigned integer.
function addSU(x, y) {
	expandS(x, Math.max(x[L], y[L]) + 1);
	//var t = HEXS(x) + ' + ' + HEX(y);
	var c = 0;
	var i = 0;
	for (; i < y[L]; i++) {
		c = (c + x[i] + y[i]) | 0;
		x[i] = c & 0xfffffff;
		c >>= 28;
	}
	for (; i < x[L] && c != 0; i++) {
		c = (c + x[i]) | 0;
		x[i] = c & 0xfffffff;
		c >>= 28;
	}
	trimS(x);
	//console.log(t + ' - ' + HEXS(x));
}

// x -= y
// Both x and y are considered a signed integers.
function subSS(x, y) {
	expandS(x, Math.max(x[L], y[L]) + 1);
	//var t = HEXS(x) + ' - ' + HEXS(y);
	var c = 0;
	var i = 0;
	for (; i < y[L]; i++) {
		c = (c + x[i] - y[i]) | 0;
		x[i] = c & 0xfffffff;
		c >>= 28;
	}
	var filler = sign(y);
	for (; i < x[L]; i++) {
		c = (c + x[i] - filler) | 0;
		x[i] = c & 0xfffffff;
		c >>= 28;
	}
	trimS(x);
	//console.log(t + ' - ' + HEXS(x));
}

// x >>= 1
// x is considered a signed integer.
function halveS(x) {
	//var t = HEXS(x) + '/2';
	var i = 0;
	for (; i < x[L] - 1; i++)
		x[i] = (x[i] >> 1 | x[i + 1] << 27) & 0xfffffff;
	x[i] >>= 1;
	if (x[i] & 0x4000000) x[i] |= 0x8000000;
	trimS(x);
	//console.log(t + ' - ' + HEXS(x));
}

// Extended GCD (HAC 14.61, but with -b)
// Given x and y, calculates a, b and gcd, such that ax - by = gcd.
// Preconditions: x > 0, y > 0, either x or y or both need to be odd
// Postconditions: a and b are signed integers, gcd is an unsigned integer
function egcd(x, y, a, b, gcd) {
	// u and v are unsigned integers
	var u = gcd;
	var v = create();

	// A, B, C and D are signed integers
	var A = a;
	var B = b;
	var C = create();
	var D = create();

	// Initial values
	u.set(x, 0);
	v.set(y, 0);

	// Initial solution
	// A * x - B * y = u ==> A = 1 and B = 0
	// C * x - D * y = v ==> C = 0 and D = -1
	setUint28(A, 1);
	setUint28(D, 0xfffffff);

	// Modify the solution until u == v
	while (true) {
		while (isEven(u)) {
			smallShiftRight(u, u, 1);
			if (isEven(A) && isEven(B)) {
				halveS(A);
				halveS(B);
			} else {
				addSU(A, y);
				halveS(A);
				addSU(B, x);
				halveS(B);
			}
		}

		while (isEven(v)) {
			smallShiftRight(v, v, 1);
			if (isEven(C) && isEven(D)) {
				halveS(C);
				halveS(D);
			} else {
				addSU(C, y);
				halveS(C);
				addSU(D, x);
				halveS(D);
			}
		}

		trim(u);
		trim(v);
		var cmp = compare(u, v);
		if (cmp == 0) return;

		if (cmp > 0) {
			subD(u, v, 0);
			trim(u);
			subSS(A, C);
			subSS(B, D);
		} else {
			subD(v, u, 0);
			trim(v);
			subSS(C, A);
			subSS(D, B);
		}
	}
}

/*
function testEGCD() {
	var x = create();
	var y = create();
	setRandom(x, 5);
	setRandom(y, 5);

	var gcd = create();
	var a = create();
	var b = create();
	egcd(x, y, a, b, gcd);

	console.log('egcd ax-by=v', HEXS(a) + '*' + HEX(x) + ' - ' + HEXS(b) + '*' + HEX(y) + ' - ' + HEX(gcd));
}

// This is a EGCD algorithm for small integers, used to test and understand the algorithm itself.
function testEGCDWithSmallInts() {
	var x = 2;
	var y = 3;

	var u = x;
	var v = y;

	var A = 1;
	var B = 0;
	var C = 0;
	var D = -1;

	function isEven(n) { return (n & 1) == 0; }

	while (u != 0) {
		while (isEven(u)) {
			u >>= 1;
			if (isEven(A) && isEven(B)) {
				A >>= 1;
				B >>= 1;
			} else {
				A += y;
				A >>= 1;
				B += x;
				B >>= 1;
			}
		}

		while (isEven(v)) {
			v >>= 1;
			if (isEven(C) && isEven(D)) {
				C >>= 1;
				D >>= 1;
			} else {
				C += y;
				C >>= 1;
				D += x;
				D >>= 1;
			}
		}

		if (u >= v) {
			u -= v;
			A -= C;
			B -= D;
		} else {
			v -= u;
			C -= A;
			D -= B;
		}

		console.log(u, v, A, B, C, D);
	}

	var a = C;
	var b = D;
	var gcd = v;

	console.log('ax-by=gcd', a + '*' + x + ' - ' + b + '*' + y + ' - ' + gcd);
}
*/

// a <= x^-1 mod m
// Preconditions: x > 0, m > 0, m odd
function modInverse(a, x, m) {
	// Apply the extended GCD
	var b = create();
	var gcd = create();
	egcd(x, m, a, b, gcd);

	// If gcd != 1, the inverse does not exist
	if (! isOne(gcd)) return false;

	// Move a into [0, m[, and make it an unsigned integer
	while (sign(a) != 0) addSU(a, m);
	trim(a);
	return true;
}

// Returns x^-1 % m, or null if the inverse does not exist
// Preconditions: x > 0, m > 0, m odd
function moduloInverse(x, m) {
	var a = create(x);
	if (! modInverse(a, x, m)) return null;
	return a;
}

/*
function testModInverse() {
	var a = create();
	var x = create();
	var m = create();
	var v = create();

	for (var i = 0; i < 1; i++) {
		setRandom(x, 5);
		setRandom(m, 5);
		m[0] |= 1;

		var exists = modInverse(a, x, m);
		if (! exists) continue;

		// Verification
		setZero(v);
		mul(v, a, x);
		mod(v, m);

		if (! isOne(v)) {
			console.log('egcd ax=1 mod m', HEXS(a) + '*' + HEX(x) + ' = ' + HEX(v) + ' mod ' + HEX(m));
			break;
		}
	}
	console.log('Test modInverse done');
}
*/
