import { ParentComponent, ErrorBoundary } from 'solid-js'

const Fallback = (error: Error) => (
  <div style='user-select: text;'>
    <div>Unknown error has occured please</div>
    <a href='/'>Reload</a>
    <details>
      <summary>Internal Error logs</summary>
      {console.log(error) as unknown as string}
      <p>{error.stack?.toString()}</p>
    </details>
  </div>
)

export const ErrorPage: ParentComponent = (props) => (
  <ErrorBoundary fallback={Fallback}>{props.children}</ErrorBoundary>
)
