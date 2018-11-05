import { ExtensionContext } from 'vscode';
import { configuration, IConfig } from './config/configuration';
import { ConfigWebview } from './webviews/configWebview';

export class Container {
    static initialize(context: ExtensionContext, config: IConfig) {
        this._context = context;
        this._config = config;

        context.subscriptions.push((this._configWebview = new ConfigWebview(context.extensionPath)));
    }

    private static _config: IConfig | undefined;
    static get config() {
        if (this._config === undefined) {
            this._config = configuration.get<IConfig>();
        }
        return this._config;
    }

    private static _context: ExtensionContext;
    static get context() {
        return this._context;
    }

    private static _configWebview: ConfigWebview;
    static get configWebview() {
        return this._configWebview;
    }
}