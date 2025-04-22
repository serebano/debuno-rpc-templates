import { Files } from "./files.tsx";
import { File } from "./file.tsx";
import { History } from "./history.tsx";
import { connect } from "../connect/connect.ts";

function App() {
  if (!connect.url.value) {
    return <History />;
  }

  // if (!connect.instances.value.length) {
  //   return <History />;
  // }

  return (
    <>
      <div id="nav">
        <div style="padding:10px 10px 0 10px;font-size:14px;">
          <a href="#">History</a>
        </div>
        <Files />
      </div>
      <div id="body">
        <File />
      </div>
    </>
  );
}

export { App };
