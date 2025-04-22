import { computed } from "@preact/signals";
import { connect, files } from "../connect/connect.ts";
import type { RPCFile } from "../connect/RPCFiles.ts";

interface Endpoint {
  endpoint: string;
  path: string;
  files: RPCFile[];
}

const endpoints = computed<Record<string, Endpoint>>(() => {
  return Object.fromEntries(connect.instances.value.map((instance) => {
    return [instance.endpoint, {
      endpoint: instance.endpoint,
      path: instance.path,
      files: connect.filesMap.get(instance)!.value,
    }];
  }));
});

function AllFiles() {
  console.log("AllfFiles", files.value);
  return (
    <ul>
      {files.value.map((file) => {
        return (
          <li key={file.http}>
            <span>{file.http}</span>
            {file.version ? <i>{file.version}</i> : <i></i>}
          </li>
        );
      })}
    </ul>
  );
}

function Files() {
  const entries = Object.values(endpoints.value);
  return (
    <ul>
      {entries.map((entry) => {
        return (
          <li key={entry.endpoint}>
            <div>{entry.endpoint}</div>
            <ul>
              {entry.files.map((file) => {
                return (
                  <li key={file.http}>
                    <a
                      href={file.http}
                      onClick={(e) => {
                        e.preventDefault();
                        location.hash = file.http;
                      }}
                    >
                      {file.path}
                    </a>
                    {file.version
                      ? <i style="opacity:0.5">&nbsp;v{file.version}</i>
                      : <i></i>}
                  </li>
                );
              })}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}

export { AllFiles, Files };
