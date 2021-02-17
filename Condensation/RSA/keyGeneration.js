// *** Key generation ***

var e = create();
setUint28(e, 0x10001);
var bitCount4 = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];

// Returns the number of 1's in an integer.
function bitCount(n) {
	var count = 0;
	for (; n != 0; n >>>= 4)
		count += bitCount4[n & 0xf];
	return count;
}

// GCD (HAC 14.54)
// x <= y <= GCD(x, y)
// Preconditions: x > 0, y > 0, either x or y or both need to be odd.
function gcd(x, y) {
	removeFactorsOf2(x);
	removeFactorsOf2(y);
	while (true) {
		var cmp = compare(x, y);
		if (cmp == 0) return;

		if (cmp > 0) {
			subD(x, y, 0);
			removeFactorsOf2(x);
			trim(x);
		} else {
			subD(y, x, 0);
			removeFactorsOf2(y);
			trim(y);
		}
	}
}

/*
function testGCD() {
	var x = create();
	var y = create();
	setRandom(x, 2);
	setRandom(y, 2);
	y[0] |= 1;

	var xp = duplicate(x);
	var yp = duplicate(y);
	gcd(xp, yp);

	console.log('gcd(x, y)', HEX(x), HEX(y), HEX(xp), HEX(yp));
}
*/

// Fills x with a random prime, with x - 1 relatively prime to e, and calls the done function when ready.
function randomPrime1024Async(x, done) {
	var findPrime = new FindProbablePrime(x);
	setTimeout(tryNext, 15);

	function tryNext() {
		for (var i = 0; i < 64; i++)
			if (tryOne()) return done();
		setTimeout(tryNext, 15);
	}

	function tryOne() {
		// Check the next number for primality
		if (! findPrime.next()) return false;

		// Check if x mod e != 1
		var xme = duplicate(x);
		mod(xme, e);
		if (isOne(xme)) return false;

		// Check if gcd(x - 1, e) == 1
		var x1 = duplicate(x);
		decrement(x1);
		gcd(x1, duplicate(e));
		return isOne(x1);
	}
}

// Generates a 2048 bit key.
this.generateKeyAsync = function(done) {
	// Prepare
	var p = create();
	var q = create();
	var n = create();
	var n3 = create();
	pickFirstPrime();

	// Picks a first prime
	function pickFirstPrime() {
		randomPrime1024Async(p, pickSecondPrime);
	}

	// Picks a second prime
	function pickSecondPrime() {
		randomPrime1024Async(q, verify);
	}

	// Try to generate a key using these two primes
	function verify() {
		// Make p the bigger of the two primes
		if (compare(p, q) < 0) {
			var temp = p;
			p = q;
			q = temp;
		}

		//console.log('p', HEX(p));
		//console.log('q', HEX(q));

		// Some implementations check if p - q > 2^800 (or a similar value), since pq
		// may be easy to factorize if p ~ q. However, the probability of this is less
		// than 2^-200, and therefore completely negligible.
		// For comparison, note that the Miller-Rabin primality test leaves a 2^-80
		// chance that either p or q are composite.

		// Calculate the modulus n = p * q
		setZero(n);
		mul(n, p, q);

		// If the modulus is too small, use the larger of the two primes, and continue
		//console.log('n', HEX(n))
		if (mostSignificantElement(n) != 73 || (n[73] & 0xffffff8) != 0x8) return pickSecondPrime();

		// Check if the NAF weight is high enough, since low-weight composites may be weak
		// See "The number field sieve for integers of low weight" by Oliver Schirokauer.
		setZero(n3);
		addN(n3, 3, n, 0);
		var nk = mostSignificantElement(n);
		var nafCount = 0;
		for (var i = 0; i <= nk; i++) nafCount += bitCount(n[i] ^ n3[i]);
		if (nk + 1 < n3[L]) nafCount += bitCount(n3[nk + 1]);
		if (nafCount < 512) return pickFirstPrime();

		// We are done
		done(e, p, q, n);
	}
}

/*
function testGenerateKey() {
	var x = create();
	//randomPrime1024Async(x, donePrime);
	rsa.generateKeyAsync(doneKey);

	function donePrime() {
		console.log('prime', HEX(x));
	}

	function doneKey(e, p, q, n) {
		console.log('key', HEX(e), HEX(p), HEX(q), HEX(n));
	}
}
*/
