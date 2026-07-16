import {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
	NodeApiError,
	NodeConnectionTypes,
	NodeOperationError,
} from 'n8n-workflow';

const TORRENT_FIELDS = [
	'id',
	'name',
	'status',
	'percentDone',
	'totalSize',
	'rateDownload',
	'rateUpload',
	'eta',
	'downloadDir',
	'uploadRatio',
];

export class Transmission implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Transmission',
		name: 'transmission',
		icon: { light: 'file:transmission.svg', dark: 'file:transmission.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Control your Transmission client through its RPC API',
		defaults: { name: 'Transmission' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'transmissionApi', required: true }],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Get Session', value: 'getSession', action: 'Get the session settings' },
					{ name: 'Get Session Stats', value: 'getSessionStats', action: 'Get the session stats' },
					{ name: 'Get Torrents', value: 'getTorrents', action: 'Get many torrents' },
				],
				default: 'getTorrents',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const credentials = await this.getCredentials('transmissionApi', i);
				const baseURL = (credentials.baseUrl as string).replace(/\/+$/, '');
				const operation = this.getNodeParameter('operation', i) as string;

				const headers: IDataObject = {};
				if (credentials.username || credentials.password) {
					headers.Authorization = `Basic ${Buffer.from(
						`${credentials.username}:${credentials.password}`,
					).toString('base64')}`;
				}

				const RPC_BY_OP: Record<string, { method: string; arguments?: IDataObject }> = {
					getSession: { method: 'session-get' },
					getSessionStats: { method: 'session-stats' },
					getTorrents: { method: 'torrent-get', arguments: { fields: TORRENT_FIELDS } },
				};
				const rpc = RPC_BY_OP[operation];
				if (!rpc) {
					throw new NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`, {
						itemIndex: i,
					});
				}

				let sessionId = '';
				const post = () =>
					this.helpers.httpRequest({
						method: 'POST' as IHttpRequestMethods,
						baseURL,
						url: '/transmission/rpc',
						headers: sessionId
							? { ...headers, 'X-Transmission-Session-Id': sessionId }
							: headers,
						body: { method: rpc.method, arguments: rpc.arguments ?? {} },
						json: true,
					} as IHttpRequestOptions);

				let response;
				try {
					response = await post();
				} catch (err) {
					// Transmission answers the first call with 409 + the session id header.
					const sid = err?.response?.headers?.['x-transmission-session-id'];
					if ((err?.response?.status ?? err?.httpCode) === 409 && sid) {
						sessionId = sid as string;
						response = await post();
					} else {
						throw err;
					}
				}

				const args = (response as IDataObject)?.arguments as IDataObject;
				const torrents = args?.torrents as IDataObject[] | undefined;
				if (Array.isArray(torrents)) {
					for (const element of torrents) {
						returnData.push({ json: element, pairedItem: { item: i } });
					}
				} else {
					returnData.push({ json: (args ?? (response as IDataObject)), pairedItem: { item: i } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
