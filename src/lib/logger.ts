export interface Logger {
    info(message?: any, ...params: any[]): void;
    debug(message?: any, ...params: any[]): void;
    error(ex: Error, classOrMethod?: string, ...params: any[]): void;
}
