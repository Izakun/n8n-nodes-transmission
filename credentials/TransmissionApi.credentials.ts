import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class TransmissionApi implements ICredentialType {
	name = 'transmissionApi';

	displayName = 'Transmission API';

	icon = 'file:transmissionApi.svg' as const;

	documentationUrl =
		'https://github.com/transmission/transmission/blob/main/docs/rpc-spec.md';

	// Transmission RPC needs an X-Transmission-Session-Id handshake plus optional
	// HTTP Basic auth; the node handles both, so no generic authenticate block.
	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'http://transmission:9091',
			required: true,
			description: 'Base URL of the Transmission instance (e.g. http://transmission:9091). No trailing slash.',
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			description: 'RPC username (leave empty if authentication is disabled)',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'RPC password (leave empty if authentication is disabled)',
		},
	];
}
