import { Disposable, EventEmitter, Event, ConfigurationChangeEvent } from "vscode";
import { configuration } from "../config/configuration";
import { Container } from "../container";
import { Logger } from "../logger";
import { Time } from "./time";
import pAny from "p-any";
import pRetry from "p-retry";
import axios, { AxiosInstance } from 'axios';

export type OnlineInfoEvent = {
    isOnline: boolean;
};

const onlinePolling: number = 2 * Time.MINUTES;
const offlinePolling: number = 5 * Time.SECONDS;

export class OnlineDetector extends Disposable {
    private _disposable: Disposable;
    private _isOnline: boolean;
    private _isOfflineMode: boolean;
    private _onlineTimer: any | undefined;
    private _offlineTimer: any | undefined;
    private _transport: AxiosInstance;
    private _checksInFlight: boolean = false;
    //private _queue = new PQueue({ concurrency: 1 });

    private _onDidOnlineChange = new EventEmitter<OnlineInfoEvent>();
    public get onDidOnlineChange(): Event<OnlineInfoEvent> {
        return this._onDidOnlineChange.event;
    }

    constructor() {
        super(() => this.dispose());

        this._disposable = Disposable.from(
            configuration.onDidChange(this.onConfigurationChanged, this)
        );

        this._transport = axios.create({
            timeout: 10 * Time.SECONDS,
        });

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
        const promise = async () => await pAny([
            (async () => {
                Logger.debug('Online check attempting to connect to http://atlassian.com');
                await this._transport(`http://atlassian.com`, { method: "HEAD" });
                Logger.debug('Online check connected to http://atlassian.com');
                return true;
            })(),
            (async () => {
                Logger.debug('Online check attempting to connect to https://bitbucket.org');
                await this._transport(`https://bitbucket.org`, { method: "HEAD" });
                Logger.debug('Online check connected to https://bitbucket.org');
                return true;
            })()
        ]);

        return await pRetry<boolean>(promise, {
            retries: 4,
            onFailedAttempt: error => {
                Logger.debug(`Online check attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left.`);
            },
        }).catch(() => false);

    }

    private async checkOnlineStatus() {
        if (!this._checksInFlight) {
            this._checksInFlight = true;

            let newIsOnline = await this.runOnlineChecks();

            this._checksInFlight = false;

            if (newIsOnline !== this._isOnline) {
                this._isOnline = newIsOnline;

                if (!this._isOnline) {
                    this._offlineTimer = setInterval(async () => {
                        await this.checkOnlineStatus();
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
}