import { Toolbar } from './editor/Toolbar'
import { SubBar } from './editor/SubBar'
import { EditorCanvas } from './editor/EditorCanvas'
import { Inspector } from './editor/Inspector'
import { PatchTable } from './editor/PatchTable'
import { LiveView } from './output/LiveView'
import { useStore } from './state/store'
import { useDmxBridge } from './state/dmx-bridge'
import { C } from './ui/tokens'

function App(): React.JSX.Element {
  const mode = useStore((s) => s.mode)
  useDmxBridge() // feed Art-Net into the store (edit-mode swatches + live render)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: C.canvas }}>
      <Toolbar />
      {mode === 'edit' ? (
        <>
          <SubBar />
          <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
            <EditorCanvas />
            <Inspector />
          </div>
          <PatchTable />
        </>
      ) : (
        <main style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex' }}>
          <LiveView />
        </main>
      )}
    </div>
  )
}

export default App
