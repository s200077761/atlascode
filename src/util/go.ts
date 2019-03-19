export default function go(promise: Promise<any>) {
    return promise.then(data => {
        return [data, undefined];
    })
        .catch(err => [undefined, err]);
}