import { render } from "preact";
import { App } from "./ui/app.tsx";
import { connect } from "./connect/connect.ts";

connect.on("*", (e) => {
  console.debug(
    `%c${e.target.endpoint.replace("://", ":")}%c on(%c${e.type}%c)`,
    `color:#ccc;background:#3c3c3c;border-radius:50px;font-size:11px;padding:2.5px 7px;font-family:-apple-system, BlinkMacSystemFont, sans-serif;`,
    `color:ccc;`,
    `color:#fe8d59;`,
    `color:ccc`,
    e.data ?? "",
  );
});

connect.init();
connect.restore();

render(<App />, document.querySelector("#app")!);

if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(() => {
    console.clear();
    connect.close();
    connect.dispose();
  });
}
