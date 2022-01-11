import { Memento } from 'vscode';
import { IPC } from 'node-ipc';
import { Logger } from '../logger';
import { pid, uptime } from 'process';

const RULING_PID_KEY = 'rulingPid';
const PING_MESSAGE = `atlascode-ping`;
const ACK_MESSAGE = `atlascode-ack`;
const MAX_ROUNDS = 3;
const TIMEOUT = 5000;
const READ_DELAY = 5000;
const LAUNCH_DELAY_SECONDS = 20;

export function startListening() {
    const ipc = new IPC();

    ipc.config.id = `atlascode-${pid}`;
    ipc.config.retry = 1500;
    ipc.config.silent = true;
    ipc.serve(() => {
        ipc.server.on(PING_MESSAGE, (message: any, socket: any) => {
            Logger.debug(message);
            ipc.server.emit(socket, ACK_MESSAGE);
        });
    });
    ipc.server.start();

    Logger.debug(`${ipc.config.id} is listening`);
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export class Negotiator {
    constructor(private globalState: Memento) {}

    public async areWeRulingPid(): Promise<boolean> {
        // Give any other workspace enough time to wake up before trying to establish who's in charge
        const lifettime = uptime();
        if (lifettime < LAUNCH_DELAY_SECONDS) {
            Logger.debug(`Waiting ${LAUNCH_DELAY_SECONDS} seconds before starting negotiations`);
            await sleep(Math.floor((LAUNCH_DELAY_SECONDS - lifettime) * 1000));
            Logger.debug(`We've waited long enough.`);
        }

        Logger.debug(`Checking to see if we're the ruling pid`);
        for (let round = 0; round < MAX_ROUNDS; round++) {
            Logger.debug(`Starting round ${round} of negotiations`);
            const result = await this.negotiationRound();
            if (result !== undefined) {
                Logger.debug(`Ruling pid? ${result}`);
                return result;
            }
        }
        Logger.error(new Error(`Failed to negotiate a ruling PID after ${MAX_ROUNDS} rounds`));
        return false;
    }

    async negotiationRound(): Promise<boolean | undefined> {
        const rulingPid: number = this.globalState.get(RULING_PID_KEY) || 0;

        if (pid === rulingPid) {
            Logger.debug(`This process is in charge of refreshing credentials.`);
            return true;
        }

        Logger.debug(`Pinging ${rulingPid}`);
        const rulerIsAlive = await this.ping(pid, rulingPid);

        if (rulerIsAlive) {
            Logger.debug(`${rulingPid} responded.`);
            return false;
        }

        Logger.debug(`${rulingPid} failed to respond. Negitiating new responsible process.`);
        this.globalState.update(RULING_PID_KEY, pid);
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const isRulingProcess = pid === this.globalState.get(RULING_PID_KEY);
                Logger.debug(`After delay is ruling process: ${isRulingProcess}`);
                resolve(isRulingProcess);
            }, READ_DELAY);
        });
    }

    async ping(myPort: number, theirPort: number): Promise<boolean> {
        const ipc = new IPC();
        const myAddress = `atlascode-${myPort}`;
        const theirAddress = `atlascode-${theirPort}`;

        Logger.debug(`Attempting to ping ${theirAddress}`);
        ipc.config.id = myAddress;
        ipc.config.retry = 6000; // Make sure it's more than timeout.
        ipc.config.silent = true;
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                Logger.debug(`Timed out waiting on ${theirAddress}`);
                ipc.disconnect(theirAddress);
                resolve(false);
            }, TIMEOUT);

            ipc.connectTo(theirAddress, () => {
                ipc.of[theirAddress].on('connect', () => {
                    ipc.of[theirAddress].emit(PING_MESSAGE, `Ping received from ${myPort}.`);
                });
                ipc.of[theirAddress].on(ACK_MESSAGE, () => {
                    clearTimeout(timeout);
                    Logger.debug(`${theirPort} acked`);
                    ipc.disconnect(theirAddress);
                    resolve(true);
                });
            });
        });
    }
}
