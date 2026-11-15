import KitView from '../../views/KitView'

export const metadata = { title: 'Component kit · Climatch', robots: { index: false } }

// Not linked from the app: the review page for every ui-kit component in every state (SPEC A3, S38).
export default function Page() {
  return <KitView />
}
