
export namespace ReactPromiseUtil {
    export function winEventPromise(eventName: string, timeout: number, nonce?: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                console.log(`got timeout ${eventName}`, nonce);
                window.removeEventListener('message', issueListener);
                clearTimeout(timer);
                reject(`timeout waiting for event ${eventName}`);
            }, timeout);

            const issueListener = (e: MessageEvent) => {
                console.log(`got event ${e}`, nonce);
                if (e.data.type === eventName && (!nonce || e.data.nonce === nonce)) {
                    clearTimeout(timer);
                    window.removeEventListener('message', issueListener);
                    resolve(e.data);
                }
                if (e.data.type === 'error' && nonce && e.data.nonce === nonce) {
                    window.removeEventListener('message', issueListener);
                    clearTimeout(timer);
                    reject(e.data.reason);
                }
            };

            console.log(`listening for ${eventName}`);
            window.addEventListener('message', issueListener);
        });
    }
}