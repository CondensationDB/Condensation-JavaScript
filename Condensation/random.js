cn.randomBytes = function(length) {
	var bytes = new Uint8Array(length);
	fillRandom(bytes);
	return bytes;
}

cn.fillRandom = fillRandom;
