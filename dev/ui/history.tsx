import { computed } from "@preact/signals";
import { connect } from "../connect/connect.ts";
import { RPCClient } from "../connect/RPCClient.ts";

const history = computed(() => {
  return connect.history.value.map((endpoint) => {
    const readyState = connect.instances.value.find((i) =>
      i.endpoint === endpoint
    )?.readyState;
    return {
      endpoint,
      state: typeof readyState === "undefined"
        ? RPCClient.STATE[RPCClient.CLOSED]
        : RPCClient.STATE[readyState],
    };
  });
});

function History() {
  return (
    <div style="margin:20px 20px 20px 40px;font-size:14px;">
      <h2>History</h2>
      <ul>
        {history.value.map(({ endpoint, state }) => (
          <li>
            <a href={`#${endpoint}`}>{endpoint}</a> [{state}]
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => connect.restore()}
      >
        Restore
      </button>
    </div>
  );
}

export { History };
