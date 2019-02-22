export class LogAccumulator {
    _logs: string = "";
    _splitLogs: string[] = [];
    _complete = false;

    constructor(stream: NodeJS.ReadableStream) {
        stream.on('data', (data: string) => this.addData(data));
        stream.on('end', () => this.finish());
    }

    async logs(): Promise<string[]> {
        while (!this._complete) {
            await this.sleep(500);
        }
        return this._splitLogs;
    }

    private async sleep(ms: number): Promise<any> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private addData(data: string) {
        this._logs += data;
    }

    private finish() {
        const lines = this._logs.split('\n');
        var commandAccumulator = "";
        var lineIndex = 0;

        // Trim any log output preceding the first command
        while (!lines[lineIndex].startsWith("+ ") && lineIndex < lines.length) {
            lineIndex++;
        }

        for (; lineIndex < lines.length; lineIndex++) {
            if (lines[lineIndex].startsWith("+ ")) {
                if (commandAccumulator.length > 0) {
                    this._splitLogs.push(commandAccumulator);
                }
                commandAccumulator = lines[lineIndex] + '\n';
            } else {
                commandAccumulator += lines[lineIndex] + '\n';
            }
        }
        if (commandAccumulator.length > 0) {
            this._splitLogs.push(commandAccumulator);
        }

        this._complete = true;
    }
}

