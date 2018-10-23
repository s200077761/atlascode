import { Logger } from "../../logger";
import { Atl } from "../../atlclients/clientManager";


export async function currentUserJira() {
    let client = await Atl.jirarequest();

    if (client) {
        client.getCurrentUser({}).then(user => {
            Logger.debug(`currentUser is: ${user.data.displayName}`);
        });
    }
}
