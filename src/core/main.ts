import { getAction } from "./routes/routes";
import { Design } from "./design/design";
import { State } from "./service/state";

import type { StudioResponse, IStudioRequestBase } from "core/routes";

onmessage = async function(event: MessageEvent): Promise<void> {
	if(!event.ports[0]) return;

	const request = event.data as IStudioRequestBase;
	let response: StudioResponse;
	try {
		// 取得請求對應的路由
		const action = getAction(request);

		// 執行請求；結果可能是 Promise 也可能不是
		const result = await action(...request.value);

		if(result !== undefined) {
			// 如果請求本身具有特定的傳回結果就加以傳回
			response = { value: result };
		} else {
			// 否則預設的情況就是傳回更新模型
			const update = State.$updateResult;
			State.$resetResult();
			response = { update };
		}
	} catch(e: unknown) {
		debugger;
		response = { error: e instanceof Error ? e.message : "Unknown error" };
	}

	event.ports[0].postMessage(response);
};

export { Design };
