import { Logger } from "../../logger";
import { Atl } from "../../atlclients/clientManager";


export async function currentUserBitbucket() {
    let bbreq = await Atl.bbrequest();

    if (bbreq) {
        bbreq.user.get('').then(user => {
            Logger.debug("currentUser is: " + user.data.display_name);
        });
    }
}
