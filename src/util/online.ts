import { Disposable, EventEmitter, Event, ConfigurationChangeEvent } from "vscode";
import { configuration } from "../config/configuration";
import { Container } from "../container";
import { Logger } from "../logger";
import isOnline from "is-online";

export type OnlineInfoEvent = {
    isOnline: boolean;
};

export type Options = {
    polling?: number;
    timeout?: number;
    version?: "v4" | "v6";
};

const defaultOptions: Options = {
    timeout: 1000, polling: 1500, version: 'v4'
};

export class OnlineDetector extends Disposable {
    private _disposable: Disposable;
    private _isOnline: boolean;
    private _isOfflineMode: boolean;
    private _options: Options;
    private _timer: any | undefined;

    private _onDidOnlineChange = new EventEmitter<OnlineInfoEvent>();
    public get onDidOnlineChange(): Event<OnlineInfoEvent> {
        return this._onDidOnlineChange.event;
    }

    constructor(options?: Options) {
        super(() => this.dispose());

        this._options = defaultOptions;

        if (options) {
            this._options = { ...defaultOptions, ...options };
        }

        this._disposable = Disposable.from(
            configuration.onDidChange(this.onConfigurationChanged, this)
        );

        void this.onConfigurationChanged(configuration.initializingChangeEvent);

    }

    dispose() {
        clearInterval(this._timer);
        this._disposable.dispose();
        this._onDidOnlineChange.dispose();
    }

    private async onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = configuration.initializing(e);

        if (initializing) {
            this._isOnline = true;

            this._timer = setInterval(() => {
                this.checkOnlineStatus(this._options);
            }, this._options.polling!);
        }

        if (initializing || configuration.changed(e, 'offlineMode')) {
            this._isOfflineMode = Container.config.offlineMode;

            if (this._isOnline !== !this._isOfflineMode) {
                this._onDidOnlineChange.fire({ isOnline: !this._isOfflineMode });
            }
        }
    }

    public isOnline(): boolean {
        if (this._isOfflineMode) {
            return false;
        }

        return this._isOnline;
    }

    private async checkOnlineStatus(options: Options) {
        let newIsOnline = await isOnline(options);

        if (newIsOnline !== this._isOnline) {
            this._isOnline = newIsOnline;

            if (!this._isOfflineMode) {

                Logger.debug(newIsOnline ? 'You have gone online!' : 'You have gone offline :(');
                this._onDidOnlineChange.fire({ isOnline: newIsOnline });
            }
        }
    }
}