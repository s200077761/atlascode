export type MessagePoster = (m: any) => Thenable<boolean>;

export interface WebviewController<FD> {
    title(): string;
    onMessageReceived(msg: any): void;
    update(factoryData?: FD): void;
}
