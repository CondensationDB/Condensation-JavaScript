// *** AES 256 in CTR mode ***
var aes = new AES();
cn.aes = aes;

function AES() {
	INCLUDE AES256.js
	INCLUDE crypt.js
	INCLUDE kdf.js
}
