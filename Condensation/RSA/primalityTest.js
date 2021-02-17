// *** Primality test ***

// Decomposes x = 2^s * r.
// Returns s, and modifies x in-place, so that it holds r when returning.
function removeFactorsOf2(x) {
	// Look for the smallest non-zero element
	var d = 0;
	while (d < x[L] && x[d] == 0) d += 1;
	if (d > 0) {
		x[L] = x[L] - d;
		for (var i = 0; i < x[L]; i++) x[i] = x[i + d];
	}

	// Check if x == 0
	if (x[L] == 0) return 0;

	// Look for the smallest non-zero bit
	var s = 0;
	var x0 = x[0];
	if ((x0 & 0x3fff) == 0) { s += 14; x0 >>>= 14; }
	if ((x0 & 0x7f) == 0) { s += 7; x0 >>>= 7; }
	if ((x0 & 0xf) == 0) { s += 4; x0 >>>= 4; }
	if ((x0 & 0x3) == 0) { s += 2; x0 >>>= 2; }
	if ((x0 & 0x1) == 0) s += 1;
	if (s > 0) smallShiftRight(x, x, s);
	trim(x);
	return s + 28 * d;
}

// Miller-Rabin primality test (HAC 4.24)
function millerRabin(x) {
	// Calculate x - 1
	var x1 = decremented(x);

	// Decomposition of x - 1 == 2^s * r such that r is odd
	var r = duplicate(x1);
	var s = removeFactorsOf2(r);

	// Repeat twice, so that the probability that x is composite is approx. 2^-80
	var repeat = 2;
	var xk = mostSignificantElement(x);
	var a = create();
	for (var i = 0; i < repeat; i++) {
		// Pick a random a > 1
		setRandom(a, xk - 1);
		while (isZero(a) || isOne(a)) setRandom(a, xk - 1);
		//setUint28(a, i == 0 ? 5783 : 5791);

		// Check if a^r mod x == 1 or a^r mod x == -1
		var yR = modPowBig(a, r, x);
		var y = yR.result();
		//console.log('i a y', i, HEX(a), HEX(y));
		if (isOne(y) || compare(y, x1) == 0) continue;

		// Check if a^(r * 2^j) mod x == -1
		var j = 1;
		for (; j < s; j++) {
			yR.sqrAR();
			var y = yR.result();
			//console.log('j y', j, HEX(y.tR));
			if (isOne(y)) return false;
			if (compare(y, x1) == 0) break;
		}
		if (j == s) return false;
	}

	return true;
}

// Returns x % y, where y is a 25-bit integer, and m = 2^28 % y.
function modInt(x, y, m) {
	// Approach:
	// c * 2^28 % y == c * (q * y + m) % y == c * m % y
	// While x[i] is a 28-bit integer, y, and m are 25-bit integers.
	// Hence c * m + x[i] is a-51 bit integer, and fits into the 52-bit significand of the JavaScript double.
	var c = 0;
	for (var i = mostSignificantElement(x); i >= 0; i--)
		c = (c * m + x[i]) % y;
	return c;
}

// Finds a 1024 bit prime number.
// After creation, subsequently call findProbablePrime.next() until it returns true. x then holds the found prime number.
// Do not use the same object to generate multiple prime numbers, as they will be heavily correlated.
function FindProbablePrime(x) {
	var start = create();
	var sieve = new Array(4096);
	var n = 4094;

	function restart() {
		// Start at a random location
		setRandom(start, 37);
		start[0] |= 1;
		start[36] &= 0xffff;
		start[36] |= 0x8000;

		// Reset the sieve
		for (var i = 0; i < 4096; i++) sieve[n] = false;
		n = 0;
	}

	function mark(s, interval) {
		for (; s < 4096; s += interval) sieve[s] = true;
		return false;
	}

	this.next = function() {
		n += 2;
		if (n >= 4096) restart();

		if (sieve[n]) return false;
		setUint28(x, n);
		addN(x, 1, start, 0);

		// Check for small divisors, and mark multiples in the sieve
		var m = modInt(x, 4849845, 1693981);
		if (m % 3 == 0) return mark(n, 3);
		if (m % 5 == 0) return mark(n, 5);
		if (m % 7 == 0) return mark(n, 7);
		if (m % 11 == 0) return mark(n, 11);
		if (m % 13 == 0) return mark(n, 13);
		if (m % 17 == 0) return mark(n, 17);
		if (m % 19 == 0) return mark(n, 19);

		var m = modInt(x, 31367009, 17499384);
		if (m % 23 == 0) return mark(n, 23);
		if (m % 29 == 0) return mark(n, 25);
		if (m % 31 == 0) return mark(n, 31);
		if (m % 37 == 0) return mark(n, 37);
		if (m % 41 == 0) return mark(n, 41);

		var m = modInt(x, 6319667, 3009442);
		if (m % 43 == 0) return mark(n, 43);
		if (m % 47 == 0) return mark(n, 47);
		if (m % 53 == 0) return mark(n, 53);
		if (m % 59 == 0) return mark(n, 59);

		var m = modInt(x, 21182921, 14240404);
		if (m % 61 == 0) return mark(n, 61);
		if (m % 67 == 0) return mark(n, 67);
		if (m % 71 == 0) return mark(n, 71);
		if (m % 73 == 0) return mark(n, 73);

		var m = modInt(x, 583573, 575449);
		if (m % 79 == 0) return mark(n, 79);
		if (m % 83 == 0) return mark(n, 83);
		if (m % 89 == 0) return mark(n, 89);

		var m = modInt(x, 1009091, 17250);
		if (m % 97 == 0) return mark(n, 97);
		if (m % 101 == 0) return mark(n, 101);
		if (m % 103 == 0) return mark(n, 103);

		var m = modInt(x, 1317919, 897899);
		if (m % 107 == 0) return mark(n, 107);
		if (m % 109 == 0) return mark(n, 109);
		if (m % 113 == 0) return mark(n, 113);

		// Check for more divisors (generated using create-prime-list), but don't mark them in the sieve any more
		var m = modInt(x, 2279269, 1760983); if (m % 127 == 0 || m % 131 == 0 || m % 137 == 0) return false;
		var m = modInt(x, 3127361, 2609771); if (m % 139 == 0 || m % 149 == 0 || m % 151 == 0) return false;
		var m = modInt(x, 4273697, 3466242); if (m % 157 == 0 || m % 163 == 0 || m % 167 == 0) return false;
		var m = modInt(x, 5605027, 4999187); if (m % 173 == 0 || m % 179 == 0 || m % 181 == 0) return false;
		var m = modInt(x, 7262011, 7003060); if (m % 191 == 0 || m % 193 == 0 || m % 197 == 0) return false;
		var m = modInt(x, 9363547, 6256140); if (m % 199 == 0 || m % 211 == 0 || m % 223 == 0) return false;
		var m = modInt(x, 12112039, 1970598); if (m % 227 == 0 || m % 229 == 0 || m % 233 == 0) return false;
		var m = modInt(x, 14457349, 8203174); if (m % 239 == 0 || m % 241 == 0 || m % 251 == 0) return false;
		var m = modInt(x, 18181979, 13887750); if (m % 257 == 0 || m % 263 == 0 || m % 269 == 0) return false;
		var m = modInt(x, 21093827, 15309532); if (m % 271 == 0 || m % 277 == 0 || m % 281 == 0) return false;
		var m = modInt(x, 25456133, 13874126); if (m % 283 == 0 || m % 293 == 0 || m % 307 == 0) return false;
		var m = modInt(x, 30857731, 21573608); if (m % 311 == 0 || m % 313 == 0 || m % 317 == 0) return false;
		var m = modInt(x, 111547, 53374); if (m % 331 == 0 || m % 337 == 0) return false;
		var m = modInt(x, 121103, 71208); if (m % 347 == 0 || m % 349 == 0) return false;
		var m = modInt(x, 126727, 27670); if (m % 353 == 0 || m % 359 == 0) return false;
		var m = modInt(x, 136891, 129096); if (m % 367 == 0 || m % 373 == 0) return false;
		var m = modInt(x, 145157, 40163); if (m % 379 == 0 || m % 383 == 0) return false;
		var m = modInt(x, 154433, 30902); if (m % 389 == 0 || m % 397 == 0) return false;
		var m = modInt(x, 164009, 116732); if (m % 401 == 0 || m % 409 == 0) return false;
		var m = modInt(x, 176399, 132577); if (m % 419 == 0 || m % 421 == 0) return false;
		var m = modInt(x, 186623, 71582); if (m % 431 == 0 || m % 433 == 0) return false;
		var m = modInt(x, 194477, 57196); if (m % 439 == 0 || m % 443 == 0) return false;
		var m = modInt(x, 205193, 43012); if (m % 449 == 0 || m % 457 == 0) return false;
		var m = modInt(x, 213443, 137605); if (m % 461 == 0 || m % 463 == 0) return false;
		var m = modInt(x, 223693, 3856); if (m % 467 == 0 || m % 479 == 0) return false;
		var m = modInt(x, 239117, 146182); if (m % 487 == 0 || m % 491 == 0) return false;
		var m = modInt(x, 250997, 119663); if (m % 499 == 0 || m % 503 == 0) return false;
		var m = modInt(x, 265189, 64188); if (m % 509 == 0 || m % 521 == 0) return false;
		var m = modInt(x, 282943, 205492); if (m % 523 == 0 || m % 541 == 0) return false;
		var m = modInt(x, 304679, 13257); if (m % 547 == 0 || m % 557 == 0) return false;
		var m = modInt(x, 320347, 305017); if (m % 563 == 0 || m % 569 == 0) return false;
		var m = modInt(x, 329467, 249318); if (m % 571 == 0 || m % 577 == 0) return false;
		var m = modInt(x, 348091, 57295); if (m % 587 == 0 || m % 593 == 0) return false;
		var m = modInt(x, 359999, 236201); if (m % 599 == 0 || m % 601 == 0) return false;
		var m = modInt(x, 372091, 157845); if (m % 607 == 0 || m % 613 == 0) return false;
		var m = modInt(x, 381923, 325510); if (m % 617 == 0 || m % 619 == 0) return false;
		var m = modInt(x, 404471, 271183); if (m % 631 == 0 || m % 641 == 0) return false;
		var m = modInt(x, 416021, 101911); if (m % 643 == 0 || m % 647 == 0) return false;
		var m = modInt(x, 430327, 341735); if (m % 653 == 0 || m % 659 == 0) return false;
		var m = modInt(x, 444853, 189097); if (m % 661 == 0 || m % 673 == 0) return false;
		var m = modInt(x, 462391, 248676); if (m % 677 == 0 || m % 683 == 0) return false;
		var m = modInt(x, 484391, 82842); if (m % 691 == 0 || m % 701 == 0) return false;
		var m = modInt(x, 509771, 295910); if (m % 709 == 0 || m % 719 == 0) return false;
		var m = modInt(x, 532891, 391283); if (m % 727 == 0 || m % 733 == 0) return false;
		var m = modInt(x, 549077, 485880); if (m % 739 == 0 || m % 743 == 0) return false;
		var m = modInt(x, 568507, 100152); if (m % 751 == 0 || m % 757 == 0) return false;
		var m = modInt(x, 585209, 409734); if (m % 761 == 0 || m % 769 == 0) return false;
		var m = modInt(x, 608351, 152665); if (m % 773 == 0 || m % 787 == 0) return false;
		var m = modInt(x, 644773, 209888); if (m % 797 == 0 || m % 809 == 0) return false;
		var m = modInt(x, 665831, 105563); if (m % 811 == 0 || m % 821 == 0) return false;
		var m = modInt(x, 680621, 270782); if (m % 823 == 0 || m % 827 == 0) return false;
		var m = modInt(x, 695531, 656021); if (m % 829 == 0 || m % 839 == 0) return false;
		var m = modInt(x, 731021, 150749); if (m % 853 == 0 || m % 857 == 0) return false;
		var m = modInt(x, 741317, 78702); if (m % 859 == 0 || m % 863 == 0) return false;
		var m = modInt(x, 772637, 330417); if (m % 877 == 0 || m % 881 == 0) return false;
		var m = modInt(x, 783221, 573874); if (m % 883 == 0 || m % 887 == 0) return false;
		var m = modInt(x, 826277, 721708); if (m % 907 == 0 || m % 911 == 0) return false;
		var m = modInt(x, 853751, 357642); if (m % 919 == 0 || m % 929 == 0) return false;
		var m = modInt(x, 881717, 393488); if (m % 937 == 0 || m % 941 == 0) return false;
		var m = modInt(x, 902491, 395629); if (m % 947 == 0 || m % 953 == 0) return false;
		var m = modInt(x, 938957, 832711); if (m % 967 == 0 || m % 971 == 0) return false;
		var m = modInt(x, 960391, 486367); if (m % 977 == 0 || m % 983 == 0) return false;
		var m = modInt(x, 988027, 680139); if (m % 991 == 0 || m % 997 == 0) return false;
		var m = modInt(x, 1022117, 640802); if (m % 1009 == 0 || m % 1013 == 0) return false;
		var m = modInt(x, 1040399, 12514); if (m % 1019 == 0 || m % 1021 == 0) return false;
		var m = modInt(x, 1065023, 49660); if (m % 1031 == 0 || m % 1033 == 0) return false;
		var m = modInt(x, 1089911, 317350); if (m % 1039 == 0 || m % 1049 == 0) return false;
		var m = modInt(x, 1115111, 808816); if (m % 1051 == 0 || m % 1061 == 0) return false;
		var m = modInt(x, 1136347, 257564); if (m % 1063 == 0 || m % 1069 == 0) return false;
		var m = modInt(x, 1185917, 418214); if (m % 1087 == 0 || m % 1091 == 0) return false;
		var m = modInt(x, 1199021, 1053773); if (m % 1093 == 0 || m % 1097 == 0) return false;
		var m = modInt(x, 1223227, 548743); if (m % 1103 == 0 || m % 1109 == 0) return false;
		var m = modInt(x, 1254391, 1250173); if (m % 1117 == 0 || m % 1123 == 0) return false;
		var m = modInt(x, 1299479, 742782); if (m % 1129 == 0 || m % 1151 == 0) return false;
		var m = modInt(x, 1340939, 247656); if (m % 1153 == 0 || m % 1163 == 0) return false;
		var m = modInt(x, 1382951, 142962); if (m % 1171 == 0 || m % 1181 == 0) return false;
		var m = modInt(x, 1416091, 794257); if (m % 1187 == 0 || m % 1193 == 0) return false;
		var m = modInt(x, 1456813, 381864); if (m % 1201 == 0 || m % 1213 == 0) return false;
		var m = modInt(x, 1488391, 525076); if (m % 1217 == 0 || m % 1223 == 0) return false;
		var m = modInt(x, 1512899, 652333); if (m % 1229 == 0 || m % 1231 == 0) return false;
		var m = modInt(x, 1545013, 1148207); if (m % 1237 == 0 || m % 1249 == 0) return false;
		var m = modInt(x, 1607743, 1550118); if (m % 1259 == 0 || m % 1277 == 0) return false;
		var m = modInt(x, 1640957, 959465); if (m % 1279 == 0 || m % 1283 == 0) return false;
		var m = modInt(x, 1664099, 515517); if (m % 1289 == 0 || m % 1291 == 0) return false;
		var m = modInt(x, 1687397, 139333); if (m % 1297 == 0 || m % 1301 == 0) return false;
		var m = modInt(x, 1703021, 1061159); if (m % 1303 == 0 || m % 1307 == 0) return false;
		var m = modInt(x, 1742399, 106010); if (m % 1319 == 0 || m % 1321 == 0) return false;
		var m = modInt(x, 1806047, 1140500); if (m % 1327 == 0 || m % 1361 == 0) return false;
		var m = modInt(x, 1876891, 40043); if (m % 1367 == 0 || m % 1373 == 0) return false;
		var m = modInt(x, 1932019, 1816834); if (m % 1381 == 0 || m % 1399 == 0) return false;
		var m = modInt(x, 2005007, 1769525); if (m % 1409 == 0 || m % 1423 == 0) return false;
		var m = modInt(x, 2039183, 1302483); if (m % 1427 == 0 || m % 1429 == 0) return false;
		var m = modInt(x, 2062087, 364146); if (m % 1433 == 0 || m % 1439 == 0) return false;
		var m = modInt(x, 2099597, 1786637); if (m % 1447 == 0 || m % 1451 == 0) return false;
		var m = modInt(x, 2119927, 1324654); if (m % 1453 == 0 || m % 1459 == 0) return false;
		var m = modInt(x, 2178551, 473683); if (m % 1471 == 0 || m % 1481 == 0) return false;
		var m = modInt(x, 2205221, 1603715); if (m % 1483 == 0 || m % 1487 == 0) return false;
		var m = modInt(x, 2223077, 1666216); if (m % 1489 == 0 || m % 1493 == 0) return false;
		var m = modInt(x, 2264989, 1166754); if (m % 1499 == 0 || m % 1511 == 0) return false;
		var m = modInt(x, 2331713, 288461); if (m % 1523 == 0 || m % 1531 == 0) return false;
		var m = modInt(x, 2390107, 743472); if (m % 1543 == 0 || m % 1549 == 0) return false;
		var m = modInt(x, 2421127, 2111486); if (m % 1553 == 0 || m % 1559 == 0) return false;
		var m = modInt(x, 2461757, 103943); if (m % 1567 == 0 || m % 1571 == 0) return false;
		var m = modInt(x, 2499557, 982857); if (m % 1579 == 0 || m % 1583 == 0) return false;
		var m = modInt(x, 2556797, 2528568); if (m % 1597 == 0 || m % 1601 == 0) return false;
		var m = modInt(x, 2585663, 2112167); if (m % 1607 == 0 || m % 1609 == 0) return false;
		var m = modInt(x, 2611447, 2067862); if (m % 1613 == 0 || m % 1619 == 0) return false;
		var m = modInt(x, 2637367, 2061389); if (m % 1621 == 0 || m % 1627 == 0) return false;
		var m = modInt(x, 2712509, 2609574); if (m % 1637 == 0 || m % 1657 == 0) return false;
		var m = modInt(x, 2772221, 2302240); if (m % 1663 == 0 || m % 1667 == 0) return false;
		var m = modInt(x, 2825617, 1841); if (m % 1669 == 0 || m % 1693 == 0) return false;
		var m = modInt(x, 2883203, 297577); if (m % 1697 == 0 || m % 1699 == 0) return false;
		var m = modInt(x, 2941189, 787257); if (m % 1709 == 0 || m % 1721 == 0) return false;
		var m = modInt(x, 2985959, 2685105); if (m % 1723 == 0 || m % 1733 == 0) return false;
		var m = modInt(x, 3041527, 781080); if (m % 1741 == 0 || m % 1747 == 0) return false;
		var m = modInt(x, 3083527, 168607); if (m % 1753 == 0 || m % 1759 == 0) return false;
		var m = modInt(x, 3168391, 2290612); if (m % 1777 == 0 || m % 1783 == 0) return false;
		var m = modInt(x, 3196943, 3089187); if (m % 1787 == 0 || m % 1789 == 0) return false;
		var m = modInt(x, 3261611, 983354); if (m % 1801 == 0 || m % 1811 == 0) return false;
		var m = modInt(x, 3337913, 1402416); if (m % 1823 == 0 || m % 1831 == 0) return false;
		var m = modInt(x, 3437267, 328630); if (m % 1847 == 0 || m % 1861 == 0) return false;
		var m = modInt(x, 3493157, 2955524); if (m % 1867 == 0 || m % 1871 == 0) return false;
		var m = modInt(x, 3515621, 1248260); if (m % 1873 == 0 || m % 1877 == 0) return false;
		var m = modInt(x, 3549431, 2228131); if (m % 1879 == 0 || m % 1889 == 0) return false;
		var m = modInt(x, 3625207, 170138); if (m % 1901 == 0 || m % 1907 == 0) return false;
		var m = modInt(x, 3694003, 2467240); if (m % 1913 == 0 || m % 1931 == 0) return false;
		var m = modInt(x, 3767417, 948849); if (m % 1933 == 0 || m % 1949 == 0) return false;
		var m = modInt(x, 3849323, 2832169); if (m % 1951 == 0 || m % 1973 == 0) return false;
		var m = modInt(x, 3932273, 1040892); if (m % 1979 == 0 || m % 1987 == 0) return false;
		var m = modInt(x, 3980021, 1774049); if (m % 1993 == 0 || m % 1997 == 0) return false;
		var m = modInt(x, 4003997, 167657); if (m % 1999 == 0 || m % 2003 == 0) return false;
		var m = modInt(x, 4056187, 727114); if (m % 2011 == 0 || m % 2017 == 0) return false;
		var m = modInt(x, 4112783, 1104561); if (m % 2027 == 0 || m % 2029 == 0) return false;
		var m = modInt(x, 4186067, 527168); if (m % 2039 == 0 || m % 2053 == 0) return false;
		var m = modInt(x, 4268347, 3797942); if (m % 2063 == 0 || m % 2069 == 0) return false;
		var m = modInt(x, 4334723, 4017353); if (m % 2081 == 0 || m % 2083 == 0) return false;
		var m = modInt(x, 4359743, 2491133); if (m % 2087 == 0 || m % 2089 == 0) return false;
		var m = modInt(x, 4430989, 2576116); if (m % 2099 == 0 || m % 2111 == 0) return false;
		var m = modInt(x, 4498577, 3019413); if (m % 2113 == 0 || m % 2129 == 0) return false;
		var m = modInt(x, 4553947, 4306530); if (m % 2131 == 0 || m % 2137 == 0) return false;
		var m = modInt(x, 4588163, 2322002); if (m % 2141 == 0 || m % 2143 == 0) return false;
		var m = modInt(x, 4652633, 3235375); if (m % 2153 == 0 || m % 2161 == 0) return false;
		var m = modInt(x, 4800337, 4416921); if (m % 2179 == 0 || m % 2203 == 0) return false;
		var m = modInt(x, 4884091, 4694542); if (m % 2207 == 0 || m % 2213 == 0) return false;
		var m = modInt(x, 4968377, 143098); if (m % 2221 == 0 || m % 2237 == 0) return false;
		var m = modInt(x, 5022077, 2265375); if (m % 2239 == 0 || m % 2243 == 0) return false;
		var m = modInt(x, 5103017, 3078572); if (m % 2251 == 0 || m % 2267 == 0) return false;
		var m = modInt(x, 5157437, 248732); if (m % 2269 == 0 || m % 2273 == 0) return false;
		var m = modInt(x, 5216647, 2386459); if (m % 2281 == 0 || m % 2287 == 0) return false;
		var m = modInt(x, 5267021, 5084406); if (m % 2293 == 0 || m % 2297 == 0) return false;
		var m = modInt(x, 5336099, 1630506); if (m % 2309 == 0 || m % 2311 == 0) return false;
		var m = modInt(x, 5456887, 1047993); if (m % 2333 == 0 || m % 2339 == 0) return false;
		var m = modInt(x, 5494327, 4707760); if (m % 2341 == 0 || m % 2347 == 0) return false;
		var m = modInt(x, 5541307, 2452720); if (m % 2351 == 0 || m % 2357 == 0) return false;
		var m = modInt(x, 5635867, 3549707); if (m % 2371 == 0 || m % 2377 == 0) return false;
		var m = modInt(x, 5673923, 1761075); if (m % 2381 == 0 || m % 2383 == 0) return false;
		var m = modInt(x, 5716877, 5459114); if (m % 2389 == 0 || m % 2393 == 0) return false;
		var m = modInt(x, 5783989, 2371962); if (m % 2399 == 0 || m % 2411 == 0) return false;
		var m = modInt(x, 5856391, 4897861); if (m % 2417 == 0 || m % 2423 == 0) return false;
		var m = modInt(x, 5948717, 743191); if (m % 2437 == 0 || m % 2441 == 0) return false;
		var m = modInt(x, 6017173, 3679844); if (m % 2447 == 0 || m % 2459 == 0) return false;
		var m = modInt(x, 6100891, 6097143); if (m % 2467 == 0 || m % 2473 == 0) return false;
		var m = modInt(x, 6199931, 1838423); if (m % 2477 == 0 || m % 2503 == 0) return false;
		var m = modInt(x, 6380651, 448114); if (m % 2521 == 0 || m % 2531 == 0) return false;
		var m = modInt(x, 6456677, 3711699); if (m % 2539 == 0 || m % 2543 == 0) return false;
		var m = modInt(x, 6502499, 1832997); if (m % 2549 == 0 || m % 2551 == 0) return false;
		var m = modInt(x, 6594503, 4655336); if (m % 2557 == 0 || m % 2579 == 0) return false;
		var m = modInt(x, 6718463, 6415399); if (m % 2591 == 0 || m % 2593 == 0) return false;
		var m = modInt(x, 6827753, 2153089); if (m % 2609 == 0 || m % 2617 == 0) return false;
		var m = modInt(x, 6901093, 6193922); if (m % 2621 == 0 || m % 2633 == 0) return false;
		var m = modInt(x, 7033079, 1178454); if (m % 2647 == 0 || m % 2657 == 0) return false;
		var m = modInt(x, 7080917, 6441527); if (m % 2659 == 0 || m % 2663 == 0) return false;
		var m = modInt(x, 7150267, 3875577); if (m % 2671 == 0 || m % 2677 == 0) return false;
		var m = modInt(x, 7209221, 1694279); if (m % 2683 == 0 || m % 2687 == 0) return false;
		var m = modInt(x, 7241477, 500807); if (m % 2689 == 0 || m % 2693 == 0) return false;
		var m = modInt(x, 7306193, 5412508); if (m % 2699 == 0 || m % 2707 == 0) return false;
		var m = modInt(x, 7354943, 3657508); if (m % 2711 == 0 || m % 2713 == 0) return false;
		var m = modInt(x, 7420151, 1310020); if (m % 2719 == 0 || m % 2729 == 0) return false;
		var m = modInt(x, 7485671, 6436971); if (m % 2731 == 0 || m % 2741 == 0) return false;
		var m = modInt(x, 7567997, 3555561); if (m % 2749 == 0 || m % 2753 == 0) return false;
		var m = modInt(x, 7683959, 7180850); if (m % 2767 == 0 || m % 2777 == 0) return false;
		var m = modInt(x, 7784099, 3776090); if (m % 2789 == 0 || m % 2791 == 0) return false;
		var m = modInt(x, 7834397, 2065958); if (m % 2797 == 0 || m % 2801 == 0) return false;
		var m = modInt(x, 7901657, 7680775); if (m % 2803 == 0 || m % 2819 == 0) return false;
		var m = modInt(x, 8037221, 3207163); if (m % 2833 == 0 || m % 2837 == 0) return false;
		var m = modInt(x, 8105393, 957487); if (m % 2843 == 0 || m % 2851 == 0) return false;
		var m = modInt(x, 8173877, 6871392); if (m % 2857 == 0 || m % 2861 == 0) return false;
		var m = modInt(x, 8311673, 2461920); if (m % 2879 == 0 || m % 2887 == 0) return false;
		var m = modInt(x, 8409991, 7725735); if (m % 2897 == 0 || m % 2903 == 0) return false;
		var m = modInt(x, 8485553, 5383313); if (m % 2909 == 0 || m % 2917 == 0) return false;
		var m = modInt(x, 8602453, 1759413); if (m % 2927 == 0 || m % 2939 == 0) return false;
		var m = modInt(x, 8732021, 6474826); if (m % 2953 == 0 || m % 2957 == 0) return false;
		var m = modInt(x, 8797147, 4521046); if (m % 2963 == 0 || m % 2969 == 0) return false;
		var m = modInt(x, 8910029, 1134586); if (m % 2971 == 0 || m % 2999 == 0) return false;
		var m = modInt(x, 9036011, 6391137); if (m % 3001 == 0 || m % 3011 == 0) return false;
		var m = modInt(x, 9126437, 3768783); if (m % 3019 == 0 || m % 3023 == 0) return false;
		var m = modInt(x, 9235517, 605463); if (m % 3037 == 0 || m % 3041 == 0) return false;
		var m = modInt(x, 9332989, 7111764); if (m % 3049 == 0 || m % 3061 == 0) return false;
		var m = modInt(x, 9443293, 4023252); if (m % 3067 == 0 || m % 3079 == 0) return false;
		var m = modInt(x, 9523387, 1780620); if (m % 3083 == 0 || m % 3089 == 0) return false;
		var m = modInt(x, 9696971, 6617239); if (m % 3109 == 0 || m % 3119 == 0) return false;
		var m = modInt(x, 9790577, 4089877); if (m % 3121 == 0 || m % 3137 == 0) return false;
		var m = modInt(x, 10017221, 7987710); if (m % 3163 == 0 || m % 3167 == 0) return false;
		var m = modInt(x, 10080589, 6340142); if (m % 3169 == 0 || m % 3181 == 0) return false;
		var m = modInt(x, 10169717, 4022814); if (m % 3187 == 0 || m % 3191 == 0) return false;
		var m = modInt(x, 10278427, 1196354); if (m % 3203 == 0 || m % 3209 == 0) return false;
		var m = modInt(x, 10361957, 9386531); if (m % 3217 == 0 || m % 3221 == 0) return false;
		var m = modInt(x, 10497479, 5998481); if (m % 3229 == 0 || m % 3251 == 0) return false;
		var m = modInt(x, 10595021, 3559931); if (m % 3253 == 0 || m % 3257 == 0) return false;
		var m = modInt(x, 10660189, 1930731); if (m % 3259 == 0 || m % 3271 == 0) return false;
		var m = modInt(x, 10889999, 7075480); if (m % 3299 == 0 || m % 3301 == 0) return false;
		var m = modInt(x, 10956091, 5489272); if (m % 3307 == 0 || m % 3313 == 0) return false;
		var m = modInt(x, 11029037, 3738568); if (m % 3319 == 0 || m % 3323 == 0) return false;
		var m = modInt(x, 11088899, 2301880); if (m % 3329 == 0 || m % 3331 == 0) return false;
		var m = modInt(x, 11189021, 11087973); if (m % 3343 == 0 || m % 3347 == 0) return false;
		var m = modInt(x, 11289599, 8774679); if (m % 3359 == 0 || m % 3361 == 0) return false;
		var m = modInt(x, 11370383, 6916647); if (m % 3371 == 0 || m % 3373 == 0) return false;
		var m = modInt(x, 11492099, 4117179); if (m % 3389 == 0 || m % 3391 == 0) return false;
		var m = modInt(x, 11628091, 989363); if (m % 3407 == 0 || m % 3413 == 0) return false;
		var m = modInt(x, 11840417, 7946282); if (m % 3433 == 0 || m % 3449 == 0) return false;
		var m = modInt(x, 11964677, 5212562); if (m % 3457 == 0 || m % 3461 == 0) return false;
		var m = modInt(x, 12006221, 4298594); if (m % 3463 == 0 || m % 3467 == 0) return false;
		var m = modInt(x, 12110279, 2009318); if (m % 3469 == 0 || m % 3491 == 0) return false;
		var m = modInt(x, 12284989, 10450687); if (m % 3499 == 0 || m % 3511 == 0) return false;
		var m = modInt(x, 12404459, 7941817); if (m % 3517 == 0 || m % 3527 == 0) return false;
		var m = modInt(x, 12467957, 6608359); if (m % 3529 == 0 || m % 3533 == 0) return false;
		var m = modInt(x, 12531599, 5271877); if (m % 3539 == 0 || m % 3541 == 0) return false;
		var m = modInt(x, 12616679, 3485197); if (m % 3547 == 0 || m % 3557 == 0) return false;
		var m = modInt(x, 12709189, 1542487); if (m % 3559 == 0 || m % 3571 == 0) return false;
		var m = modInt(x, 12830723, 11820996); if (m % 3581 == 0 || m % 3583 == 0) return false;
		var m = modInt(x, 12959951, 9236436); if (m % 3593 == 0 || m % 3607 == 0) return false;
		var m = modInt(x, 13068221, 7071036); if (m % 3613 == 0 || m % 3617 == 0) return false;
		var m = modInt(x, 13155113, 5333196); if (m % 3623 == 0 || m % 3631 == 0) return false;
		var m = modInt(x, 13249591, 3443636); if (m % 3637 == 0 || m % 3643 == 0) return false;
		var m = modInt(x, 13432189, 13223865); if (m % 3659 == 0 || m % 3671 == 0) return false;
		var m = modInt(x, 13505621, 11828657); if (m % 3673 == 0 || m % 3677 == 0) return false;
		var m = modInt(x, 13645627, 9168543); if (m % 3691 == 0 || m % 3697 == 0) return false;
		var m = modInt(x, 13727009, 7622285); if (m % 3701 == 0 || m % 3709 == 0) return false;
		var m = modInt(x, 13860713, 5081909); if (m % 3719 == 0 || m % 3727 == 0) return false;
		var m = modInt(x, 13957687, 3239403); if (m % 3733 == 0 || m % 3739 == 0) return false;
		var m = modInt(x, 14167687, 13417090); if (m % 3761 == 0 || m % 3767 == 0) return false;
		var m = modInt(x, 14243051, 12060538); if (m % 3769 == 0 || m % 3779 == 0) return false;
		var m = modInt(x, 14402021, 9199078); if (m % 3793 == 0 || m % 3797 == 0) return false;
		var m = modInt(x, 14531263, 6872722); if (m % 3803 == 0 || m % 3821 == 0) return false;
		var m = modInt(x, 14653559, 4671394); if (m % 3823 == 0 || m % 3833 == 0) return false;
		var m = modInt(x, 14814797, 1769110); if (m % 3847 == 0 || m % 3851 == 0) return false;
		var m = modInt(x, 14884139, 520954); if (m % 3853 == 0 || m % 3863 == 0) return false;
		var m = modInt(x, 15046637, 12642627); if (m % 3877 == 0 || m % 3881 == 0) return false;
		var m = modInt(x, 15194323, 10131965); if (m % 3889 == 0 || m % 3907 == 0) return false;
		var m = modInt(x, 15319387, 8005877); if (m % 3911 == 0 || m % 3917 == 0) return false;
		var m = modInt(x, 15374237, 7073427); if (m % 3919 == 0 || m % 3923 == 0) return false;
		var m = modInt(x, 15444899, 5872173); if (m % 3929 == 0 || m % 3931 == 0) return false;
		var m = modInt(x, 15563021, 3864099); if (m % 3943 == 0 || m % 3947 == 0) return false;
		var m = modInt(x, 15824363, 15245648); if (m % 3967 == 0 || m % 3989 == 0) return false;
		var m = modInt(x, 16016003, 12179408); if (m % 4001 == 0 || m % 4003 == 0) return false;
		var m = modInt(x, 16080091, 11154000); if (m % 4007 == 0 || m % 4013 == 0) return false;
		var m = modInt(x, 16160399, 9869072); if (m % 4019 == 0 || m % 4021 == 0) return false;
		var m = modInt(x, 16305323, 7550288); if (m % 4027 == 0 || m % 4049 == 0) return false;
		var m = modInt(x, 16434907, 5476944); if (m % 4051 == 0 || m % 4057 == 0) return false;
		var m = modInt(x, 16613767, 2615184); if (m % 4073 == 0 || m % 4079 == 0) return false;
		var m = modInt(x, 16744463, 524048); if (m % 4091 == 0 || m % 4093 == 0) return false;
		var m = modInt(x, 16850989, 15670621); if (m % 4099 == 0 || m % 4111 == 0) return false;
		var m = modInt(x, 17040383, 12829711); if (m % 4127 == 0 || m % 4129 == 0) return false;
		var m = modInt(x, 17106487, 11838151); if (m % 4133 == 0 || m % 4139 == 0) return false;
		var m = modInt(x, 17264021, 9475141); if (m % 4153 == 0 || m % 4157 == 0) return false;
		var m = modInt(x, 17372143, 7853311); if (m % 4159 == 0 || m % 4177 == 0) return false;
		var m = modInt(x, 17690411, 3079291); if (m % 4201 == 0 || m % 4211 == 0) return false;
		var m = modInt(x, 17791523, 1562611); if (m % 4217 == 0 || m % 4219 == 0) return false;
		var m = modInt(x, 17892899, 41971); if (m % 4229 == 0 || m % 4231 == 0) return false;
		var m = modInt(x, 17994563, 16511574); if (m % 4241 == 0 || m % 4243 == 0) return false;
		var m = modInt(x, 18113527, 14846078); if (m % 4253 == 0 || m % 4259 == 0) return false;
		var m = modInt(x, 18198731, 13653222); if (m % 4261 == 0 || m % 4271 == 0) return false;
		var m = modInt(x, 18301259, 12217830); if (m % 4273 == 0 || m % 4283 == 0) return false;
		var m = modInt(x, 18429833, 10417794); if (m % 4289 == 0 || m % 4297 == 0) return false;
		var m = modInt(x, 18766199, 5708670); if (m % 4327 == 0 || m % 4337 == 0) return false;
		var m = modInt(x, 18870311, 4251102); if (m % 4339 == 0 || m % 4349 == 0) return false;
		var m = modInt(x, 19009591, 2301182); if (m % 4357 == 0 || m % 4363 == 0) return false;
		var m = modInt(x, 19201843, 18811497); if (m % 4373 == 0 || m % 4391 == 0) return false;
		var m = modInt(x, 19386373, 16412607); if (m % 4397 == 0 || m % 4409 == 0) return false;
		var m = modInt(x, 19554083, 14232377); if (m % 4421 == 0 || m % 4423 == 0) return false;
		var m = modInt(x, 19749127, 11696805); if (m % 4441 == 0 || m % 4447 == 0) return false;
		var m = modInt(x, 19838107, 10540065); if (m % 4451 == 0 || m % 4457 == 0) return false;
		var m = modInt(x, 19998703, 8452317); if (m % 4463 == 0 || m % 4481 == 0) return false;
		var m = modInt(x, 20142119, 6587909); if (m % 4483 == 0 || m % 4493 == 0) return false;
		var m = modInt(x, 20340091, 4014273); if (m % 4507 == 0 || m % 4513 == 0) return false;
		var m = modInt(x, 20412323, 3075257); if (m % 4517 == 0 || m % 4519 == 0) return false;
		var m = modInt(x, 20566081, 1076403); if (m % 4523 == 0 || m % 4547 == 0) return false;
		var m = modInt(x, 20747989, 19459588); if (m % 4549 == 0 || m % 4561 == 0) return false;
		var m = modInt(x, 20930561, 17268724); if (m % 4567 == 0 || m % 4583 == 0) return false;
		var m = modInt(x, 21104827, 15177532); if (m % 4591 == 0 || m % 4597 == 0) return false;
		var m = modInt(x, 21270463, 13189900); if (m % 4603 == 0 || m % 4621 == 0) return false;
		var m = modInt(x, 21511043, 10302940); if (m % 4637 == 0 || m % 4639 == 0) return false;
		var m = modInt(x, 21585307, 9411772); if (m % 4643 == 0 || m % 4649 == 0) return false;
		var m = modInt(x, 21659707, 8518972); if (m % 4651 == 0 || m % 4657 == 0) return false;
		var m = modInt(x, 21790199, 6953068); if (m % 4663 == 0 || m % 4673 == 0) return false;
		var m = modInt(x, 21949189, 5045188); if (m % 4679 == 0 || m % 4691 == 0) return false;
		var m = modInt(x, 22202863, 2001100); if (m % 4703 == 0 || m % 4721 == 0) return false;
		var m = modInt(x, 22335067, 414652); if (m % 4723 == 0 || m % 4729 == 0) return false;
		var m = modInt(x, 22486483, 21084143); if (m % 4733 == 0 || m % 4751 == 0) return false;
		var m = modInt(x, 22762297, 18050189); if (m % 4759 == 0 || m % 4783 == 0) return false;
		var m = modInt(x, 22924943, 16261083); if (m % 4787 == 0 || m % 4789 == 0) return false;
		var m = modInt(x, 23001607, 15417779); if (m % 4793 == 0 || m % 4799 == 0) return false;
		var m = modInt(x, 23107213, 14256113); if (m % 4801 == 0 || m % 4813 == 0) return false;
		var m = modInt(x, 23270927, 12455259); if (m % 4817 == 0 || m % 4831 == 0) return false;
		var m = modInt(x, 23677931, 7978215); if (m % 4861 == 0 || m % 4871 == 0) return false;
		var m = modInt(x, 23843653, 6155273); if (m % 4877 == 0 || m % 4889 == 0) return false;
		var m = modInt(x, 24068827, 3678359); if (m % 4903 == 0 || m % 4909 == 0) return false;
		var m = modInt(x, 24255589, 1623977); if (m % 4919 == 0 || m % 4931 == 0) return false;
		var m = modInt(x, 24354221, 539025); if (m % 4933 == 0 || m % 4937 == 0) return false;
		var m = modInt(x, 24472793, 23707526); if (m % 4943 == 0 || m % 4951 == 0) return false;
		var m = modInt(x, 24621419, 22221266); if (m % 4957 == 0 || m % 4967 == 0) return false;
		var m = modInt(x, 24710837, 21327086); if (m % 4969 == 0 || m % 4973 == 0) return false;
		var m = modInt(x, 24900091, 19434546); if (m % 4987 == 0 || m % 4993 == 0) return false;
		var m = modInt(x, 25009997, 18335486); if (m % 4999 == 0 || m % 5003 == 0) return false;
		var m = modInt(x, 25100099, 17434466); if (m % 5009 == 0 || m % 5011 == 0) return false;
		var m = modInt(x, 25220483, 16230626); if (m % 5021 == 0 || m % 5023 == 0) return false;
		var m = modInt(x, 25451989, 13915566); if (m % 5039 == 0 || m % 5051 == 0) return false;
		var m = modInt(x, 25684543, 11590026); if (m % 5059 == 0 || m % 5077 == 0) return false;
		var m = modInt(x, 25847047, 9964986); if (m % 5081 == 0 || m % 5087 == 0) return false;
		var m = modInt(x, 26009999, 8335466); if (m % 5099 == 0 || m % 5101 == 0) return false;
		var m = modInt(x, 26112091, 7314546); if (m % 5107 == 0 || m % 5113 == 0) return false;
		var m = modInt(x, 26347493, 4960526); if (m % 5119 == 0 || m % 5147 == 0) return false;
		var m = modInt(x, 26625551, 2179946); if (m % 5153 == 0 || m % 5167 == 0) return false;
		var m = modInt(x, 26780609, 629366); if (m % 5171 == 0 || m % 5179 == 0) return false;
		var m = modInt(x, 26967233, 25730359); if (m % 5189 == 0 || m % 5197 == 0) return false;
		var m = modInt(x, 27227443, 23388469); if (m % 5209 == 0 || m % 5227 == 0) return false;
		var m = modInt(x, 27373823, 22071049); if (m % 5231 == 0 || m % 5233 == 0) return false;
		var m = modInt(x, 27551857, 20468743); if (m % 5237 == 0 || m % 5261 == 0) return false;
		var m = modInt(x, 27836167, 17909953); if (m % 5273 == 0 || m % 5279 == 0) return false;
		var m = modInt(x, 27973457, 16674343); if (m % 5281 == 0 || m % 5297 == 0) return false;
		var m = modInt(x, 28153627, 15052813); if (m % 5303 == 0 || m % 5309 == 0) return false;
		var m = modInt(x, 28387559, 12947425); if (m % 5323 == 0 || m % 5333 == 0) return false;
		var m = modInt(x, 28611797, 10929283); if (m % 5347 == 0 || m % 5351 == 0) return false;
		var m = modInt(x, 28987447, 7548433); if (m % 5381 == 0 || m % 5387 == 0) return false;
		var m = modInt(x, 29116807, 6384193); if (m % 5393 == 0 || m % 5399 == 0) return false;
		var m = modInt(x, 29268091, 5022637); if (m % 5407 == 0 || m % 5413 == 0) return false;
		var m = modInt(x, 29354723, 4242949); if (m % 5417 == 0 || m % 5419 == 0) return false;
		var m = modInt(x, 29528347, 2680333); if (m % 5431 == 0 || m % 5437 == 0) return false;
		var m = modInt(x, 29615363, 1897189); if (m % 5441 == 0 || m % 5443 == 0) return false;
		var m = modInt(x, 29811479, 132145); if (m % 5449 == 0 || m % 5471 == 0) return false;
		var m = modInt(x, 30008483, 28367592); if (m % 5477 == 0 || m % 5479 == 0) return false;
		var m = modInt(x, 30161983, 27139592); if (m % 5483 == 0 || m % 5501 == 0) return false;
		var m = modInt(x, 30305021, 25995288); if (m % 5503 == 0 || m % 5507 == 0) return false;
		var m = modInt(x, 30470399, 24672264); if (m % 5519 == 0 || m % 5521 == 0) return false;
		var m = modInt(x, 30569837, 23876760); if (m % 5527 == 0 || m % 5531 == 0) return false;
		var m = modInt(x, 30913591, 21126728); if (m % 5557 == 0 || m % 5563 == 0) return false;
		var m = modInt(x, 31036037, 20147160); if (m % 5569 == 0 || m % 5573 == 0) return false;
		var m = modInt(x, 31203371, 18808488); if (m % 5581 == 0 || m % 5591 == 0) return false;
		var m = modInt(x, 31708097, 14770680); if (m % 5623 == 0 || m % 5639 == 0) return false;
		var m = modInt(x, 31854727, 13597640); if (m % 5641 == 0 || m % 5647 == 0) return false;
		var m = modInt(x, 31945103, 12874632); if (m % 5651 == 0 || m % 5653 == 0) return false;
		var m = modInt(x, 32012963, 12331752); if (m % 5657 == 0 || m % 5659 == 0) return false;
		var m = modInt(x, 32216927, 10700040); if (m % 5669 == 0 || m % 5683 == 0) return false;
		var m = modInt(x, 32387477, 9335640); if (m % 5689 == 0 || m % 5693 == 0) return false;
		var m = modInt(x, 32558411, 7968168); if (m % 5701 == 0 || m % 5711 == 0) return false;
		var m = modInt(x, 32798429, 6048024); if (m % 5717 == 0 || m % 5737 == 0) return false;
		var m = modInt(x, 32970563, 4670952); if (m % 5741 == 0 || m % 5743 == 0) return false;
		var m = modInt(x, 33223471, 2647688); if (m % 5749 == 0 || m % 5779 == 0) return false;
		var m = modInt(x, 33489353, 520632); if (m % 5783 == 0 || m % 5791 == 0) return false;
		return millerRabin(x);
	}
}

/*
function testProbablePrime() {
	var x = fromBytes(cn.bytesFromHex('D08F9A898EF236E78ADAC2B5D9DBF4E19EF0B71403CD5E29FAE0AF6E3906653EE0F5FC79DA3D2032181FF656E2AD265B7C9A7DF7FB35B79A7B16BDCD1F9AA70933CD661BCE189B0B999A2B58B204483B7913FE101B635401EF225718E944529A6A817F617387EEFC8C118FE5AA0BE8059BADECFE4DEA16058505EE3C865655C5'));
	for (var i = 0; i < 10; i++) {
		var isPrime = isProbablePrime127(x);
		console.log(isPrime, HEX(x));
	}
}

function testFindProbablePrime() {
	var tStart = new Date();

	var x = create();
	var findPrime = new FindProbablePrime(x);
	while (! findPrime.next()) {}
	var tEnd = new Date();

	console.log('prime', HEX(x));
	console.log('Found a prime in ' + (tEnd - tStart) + ' ms');
}
*/
