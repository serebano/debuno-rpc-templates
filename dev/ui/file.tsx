import { connect } from "../connect/connect.ts";

function FileSource() {
  const file = connect.file.value!;
  const { source = "", http } = file;
  return (
    <pre>
    {source
      .split("\n")
      .map((line, index) => <a
        key={index}
        title={`Edit line ${index+1}`}
        href={`${http}:${index+1}`}
        onClick={(e) => {
          e.preventDefault()
          file.open({line: index+1})
        }}>
          <i>{index+1}</i>
          <span>{line}</span>
        </a>
      )}
    </pre>
  );
}

const depsFilter = (url: string) =>
  connect.files.value.find((f) => f.http === url);

function FileDeps(
  { files, title }: { files: Record<string, number | null>; title: string },
) {
  if (!files) return null;
  return (
    <div style="flex:1">
      <h3>{title}</h3>
      <ul>
        {Object.entries(files).filter(([url]) => depsFilter(url)).map(
          ([url, ver]) => {
            return (
              <li>
                <a
                  href={url}
                  onClick={(e) => {
                    e.preventDefault();
                    location.hash = url;
                    // connect.getFile(url);
                  }}
                >
                  {url}
                </a>
                <span style="opacity:0.7">&nbsp;{ver ? `v${ver}` : ``}</span>
              </li>
            );
          },
        )}
      </ul>
    </div>
  );
}

function File() {
  const file = connect.file.value;
  return file && !file.error
    ? (
      <div class="file">
        <div class="file-info">
          <div style={{ fontSize: 14 }}>
            <b>{file.base}</b> {file?.path}{" "}
            <span style="opacity:0.7">
              {file.version ? `v${file.version}` : ``}
            </span>
          </div>
          <div>
            <a href={file?.http} target="rpc">{file?.http}</a>
          </div>
          <div>
            <a
              href={file?.file}
              onClick={(e) => {
                e.preventDefault();
                fetch(file?.http + "?open", {
                  headers: { "x-dest": "document" },
                });
              }}
            >
              {file?.file}
            </a>
          </div>
          <div style="display: flex; gap:20px;width:100%">
            <FileDeps files={file.dependents} title="Dependents" />
            <FileDeps files={file.dependencies} title="Dependencies" />
          </div>
        </div>
        <FileSource />
      </div>
    )
    : (
      <div class="file">
        <div class="file-info">
          <pre>{file ? JSON.stringify(file, null, 4).replaceAll('"', "") : 'No file selected...'}</pre>
        </div>
      </div>
    );
}

export { File };
