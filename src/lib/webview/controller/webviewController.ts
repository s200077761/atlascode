export type MessagePoster = (m: any) => Thenable<boolean>;

export interface WebviewController<FD> {
    onMessageReceived(msg: any): void;
    update(factoryData?: FD): void;
}
