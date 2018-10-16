
interface ICacheItem {
    content: any;
    meta: {
        createdAt: number;
        ttl: number;
    }
}

export enum Interval {
    SECOND = 10000,
    MINUTE = 60000,
    HOUR = 3600000,
    DAY = 86400000,
    WEEK = 604800000,
    MONTH = 2592000000,
    FOREVER = Infinity
}

export class CacheMap {
    private _data:Map<string,ICacheItem> = new Map<string,ICacheItem>();

    public getItem<T>(key: string): T | undefined {
        let item = this._data.get(key);
        if (item && item.meta && item.meta.ttl && this.isItemExpired(item)) {
            this._data.delete(key);
            return undefined;
        }

        return item ? item.content : undefined;
    }

    public setItem(key: string, content: any, ttl:number = Infinity) {
        let meta = {
            ttl: ttl,
            createdAt: Date.now()
        };
        
        this._data.set(key,{
            content: content,
            meta: meta
        });
    }

    public deleteItem(key: string): boolean {
        return this._data.delete(key);
    }

    public clear() {
        this._data.clear();
    }

    private isItemExpired(item: ICacheItem): boolean {
        return Date.now() > item.meta.createdAt + item.meta.ttl;
    }
}