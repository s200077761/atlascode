import { Disposable, EventEmitter, Event, ConfigurationChangeEvent } from "vscode";
import { configuration } from "../config/configuration";
import { Container } from "../container";
import { Logger } from "../logger";
import { Time } from "./time";
import pAny from "p-any";
import pTimeout from "p-timeout";
import fetch from 'node-fetch';

export type OnlineInfoEvent = {
    isOnline: boolean;
};

const onlinePolling: number = 2 * Time.MINUTES;
const offlinePolling: number = 5 * Time.SECONDS;
const statusCheckTimeout: number = 3 * Time.SECONDS;

export class OnlineDetector extends Disposable {
    private _disposable: Disposable;
    private _isOnline: boolean;
    private _isOfflineMode: boolean;
    private _onlineTimer: any | undefined;
    private _offlineTimer: any | undefined;

    private _onDidOnlineChange = new EventEmitter<OnlineInfoEvent>();
    public get onDidOnlineChange(): Event<OnlineInfoEvent> {
        return this._onDidOnlineChange.event;
    }

    constructor() {
        super(() => this.dispose());

        this._disposable = Disposable.from(
            configuration.onDidChange(this.onConfigurationChanged, this)
        );

        void this.onConfigurationChanged(configuration.initializingChangeEvent);

    }

    dispose() {
        clearInterval(this._onlineTimer);
        clearInterval(this._offlineTimer);
        this._disposable.dispose();
        this._onDidOnlineChange.dispose();
    }

    private async onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = configuration.initializing(e);

        if (initializing) {
            await this.checkOnlineStatus();

            this._onlineTimer = setInterval(() => {
                this.checkOnlineStatus();
            }, onlinePolling);
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

    private async runOnlineChecks(): Promise<boolean> {
        const promise = pAny([
            (async () => {
                await fetch(`http://atlassian.com`, { method: "HEAD" });
                return true;
            })(),
            (async () => {
                await fetch(`https://bitbucket.org`, { method: "HEAD" });
                return true;
            })()
        ]);

        return pTimeout(promise, statusCheckTimeout).catch(() => false);
    }

    private async checkOnlineStatus() {
        let newIsOnline = await this.runOnlineChecks();

        if (newIsOnline !== this._isOnline) {
            this._isOnline = newIsOnline;

            if (!this._isOnline) {
                this._offlineTimer = setInterval(() => {
                    this.checkOnlineStatus();
                }, offlinePolling);
            } else {
                clearInterval(this._offlineTimer);
            }

            if (!this._isOfflineMode) {

                Logger.debug(newIsOnline ? 'You have gone online!' : 'You have gone offline :(');
                this._onDidOnlineChange.fire({ isOnline: newIsOnline });
            }
        }
    }
}