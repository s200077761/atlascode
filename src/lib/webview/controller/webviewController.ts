import { DetailedSiteInfo, Product } from '../../../atlclients/authInfo';

export type MessagePoster = (m: any) => Thenable<boolean>;

export interface WebviewController<FD> {
    title(): string;
    screenDetails(): { id: string; site?: DetailedSiteInfo; product?: Product };
    onMessageReceived(msg: any): void;
    update(factoryData?: FD): void;
}
