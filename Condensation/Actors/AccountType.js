// *** Account types used by PeerAccount and IdentityAccount ***

// TODO: AccountType is now ActorStatus

function AccountType(asText, asBytes) {
	this.asText = asText;
	this.asBytes = asBytes;
};

cn.AccountTypes = {
	ACTIVE: new AccountType('active', '#active#'),
	IDLE: new AccountType('idle', '#idle#'),
	ENTRUSTED: new AccountType('entrusted', '#entrusted#'),
	REVOKED: new AccountType('revoked', '#revoked#')
	};

cn.accountTypeFromBytes = function(bytes) {
	if (cn.equalBytes(cn.AccountTypes.ACTIVE.asBytes, bytes)) return cn.AccountTypes.ACTIVE;
	if (cn.equalBytes(cn.AccountTypes.IDLE.asBytes, bytes)) return cn.AccountTypes.IDLE;
	if (cn.equalBytes(cn.AccountTypes.ENTRUSTED.asBytes, bytes)) return cn.AccountTypes.ENTRUSTED;
	if (cn.equalBytes(cn.AccountTypes.REVOKED.asBytes, bytes)) return cn.AccountTypes.REVOKED;
	return null;
};
