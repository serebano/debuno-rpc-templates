import { render } from "https://esm.sh/preact-render-to-string";

function Demo() {
  return (
    <div>
      <h1>Demo----</h1>
      <p>{navigator.userAgent}</p>
    </div>
  );
}

export function Demo2() {
  return render(Demo());
}

export { Demo };
