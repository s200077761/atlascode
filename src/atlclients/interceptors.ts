import { AxiosInstance } from "axios";
import curlirize from 'axios-curlirize';
import { Logger } from "../logger";

interface CurlResult {
    command: string;
    object: any;
}
export function addCurlLogging(transport: AxiosInstance): void {
    curlirize(transport, (result: CurlResult, err: any) => {
        let { command } = result;
        command = command.replace('-H "Accept-Encoding:gzip, deflate" ', '');
        if (!err) {
            Logger.debug("-".repeat(70));
            Logger.debug(command);
            Logger.debug("-".repeat(70));
        }
    });
}