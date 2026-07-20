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

const METHOD_BY_OP: Record<string, string> = {
	addTorrent: 'torrent-add',
	getFreeSpace: 'free-space',
	getSession: 'session-get',
	getSessionStats: 'session-stats',
	getTorrents: 'torrent-get',
	removeTorrent: 'torrent-remove',
	startTorrent: 'torrent-start',
	stopTorrent: 'torrent-stop',
	testPort: 'port-test',
	verifyTorrent: 'torrent-verify',
};

export class Transmission implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Transmission',
		name: 'transmission',
		icon: { light: 'file:transmission.svg', dark: 'file:transmission.dark.svg' },
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
					{ name: 'Add Torrent', value: 'addTorrent', action: 'Add a torrent from a magnet or URL' },
					{ name: 'Get Free Space', value: 'getFreeSpace', action: 'Get the free disk space' },
					{ name: 'Get Session', value: 'getSession', action: 'Get the session settings' },
					{ name: 'Get Session Stats', value: 'getSessionStats', action: 'Get the session stats' },
					{ name: 'Get Torrents', value: 'getTorrents', action: 'Get many torrents' },
					{ name: 'Remove Torrent', value: 'removeTorrent', action: 'Remove a torrent' },
					{ name: 'Start Torrent', value: 'startTorrent', action: 'Start a torrent' },
					{ name: 'Stop Torrent', value: 'stopTorrent', action: 'Stop a torrent' },
					{ name: 'Test Port', value: 'testPort', action: 'Test whether the port is open' },
					{ name: 'Verify Torrent', value: 'verifyTorrent', action: 'Verify a torrent' },
				],
				default: 'getTorrents',
			},
			{
				displayName: 'Torrent ID',
				name: 'torrentId',
				type: 'string',
				default: '',
				required: true,
				description: 'The torrent ID (numeric) or info hash',
				displayOptions: {
					show: { operation: ['startTorrent', 'stopTorrent', 'verifyTorrent', 'removeTorrent'] },
				},
			},
			{
				displayName: 'Magnet or URL',
				name: 'magnet',
				type: 'string',
				default: '',
				required: true,
				description: 'A magnet link or a .torrent file URL to add',
				displayOptions: { show: { operation: ['addTorrent'] } },
			},
			{
				displayName: 'Delete Downloaded Data',
				name: 'deleteData',
				type: 'boolean',
				default: false,
				description: 'Whether to also delete the downloaded files from disk',
				displayOptions: { show: { operation: ['removeTorrent'] } },
			},
			{
				displayName: 'Path',
				name: 'path',
				type: 'string',
				default: '/downloads',
				description: 'Filesystem path to check for free space',
				displayOptions: { show: { operation: ['getFreeSpace'] } },
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

				const method = METHOD_BY_OP[operation];
				if (!method) {
					throw new NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`, {
						itemIndex: i,
					});
				}

				const idArg = () => {
					const raw = this.getNodeParameter('torrentId', i) as string;
					const num = Number(raw);
					return [Number.isNaN(num) || raw.trim() === '' ? raw : num];
				};

				let args: IDataObject = {};
				switch (operation) {
					case 'getTorrents':
						args = { fields: TORRENT_FIELDS };
						break;
					case 'addTorrent':
						args = { filename: this.getNodeParameter('magnet', i) as string };
						break;
					case 'getFreeSpace':
						args = { path: this.getNodeParameter('path', i, '/downloads') as string };
						break;
					case 'startTorrent':
					case 'stopTorrent':
					case 'verifyTorrent':
						args = { ids: idArg() };
						break;
					case 'removeTorrent':
						args = {
							ids: idArg(),
							'delete-local-data': this.getNodeParameter('deleteData', i, false) as boolean,
						};
						break;
					default:
						args = {};
				}

				const headers: IDataObject = {};
				if (credentials.username || credentials.password) {
					headers.Authorization = `Basic ${Buffer.from(
						`${credentials.username}:${credentials.password}`,
					).toString('base64')}`;
				}

				let sessionId = '';
				const post = () =>
					this.helpers.httpRequestWithAuthentication.call(this, 'transmissionApi', {
						method: 'POST' as IHttpRequestMethods,
						baseURL,
						url: '/transmission/rpc',
						headers: sessionId
							? { ...headers, 'X-Transmission-Session-Id': sessionId }
							: headers,
						body: { method, arguments: args },
						json: true,
						returnFullResponse: true,
						ignoreHttpStatusErrors: true,
					} as IHttpRequestOptions) as Promise<{ statusCode: number; headers: IDataObject; body: unknown }>;

				// Transmission answers the first call with 409 + the session id header;
				// read it and retry (ignoreHttpStatusErrors keeps the 409 from throwing).
				let full = await post();
				if (full.statusCode === 409) {
					const h = full.headers ?? {};
					sessionId = (h['x-transmission-session-id'] ?? h['X-Transmission-Session-Id']) as string;
					full = await post();
				}
				if (full.statusCode >= 400) {
					throw new NodeApiError(this.getNode(), (full.body ?? {}) as JsonObject, {
						itemIndex: i,
						httpCode: String(full.statusCode),
					});
				}
				const response = full.body;

				const resArgs = (response as IDataObject)?.arguments as IDataObject;
				const torrents = resArgs?.torrents as IDataObject[] | undefined;
				if (Array.isArray(torrents)) {
					for (const element of torrents) {
						returnData.push({ json: element, pairedItem: { item: i } });
					}
				} else {
					returnData.push({ json: resArgs ?? (response as IDataObject), pairedItem: { item: i } });
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
