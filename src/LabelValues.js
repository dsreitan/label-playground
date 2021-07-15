import { useState, useRef, memo, useCallback } from "react"
import { ForceGraph2D, ForceGraph3D } from 'react-force-graph'
import { apiCall, delay } from "./helpers"

const GetContentType = (level) => {
  switch (level) {
    case 1: return "root"
    default: return `child ${level - 1}`
  }
}

const normalizeValues = (jsonArray) => {
  if (!jsonArray || jsonArray.length === 0) return []

  return jsonArray.map(x => {
    let values = x.value.split("/")
    let parents = x.parentValue?.split("/") || []
    const lastValue = values[values.length - 1]
    const lastParent = parents[parents.length - 1]

    return {
      level: values.length,
      contentType: GetContentType(values.length),
      lastParent,
      lastValue,
      value: x.value,
      parentValue: x.parentValue,
      name: x.name["nb-NO"]
    }
  })
}

const mapToTree = (normalizedValues) => {
  return {
    nodes: normalizedValues
      .map(x => { return { id: x.value, ...x } }),
    links: normalizedValues
      .filter(x => x.parentValue)
      .map(x => { return { source: x.parentValue, target: x.value, ...x } }),
  }
}

// treat nodes with duplicate "leaf node" as the same
const mapToGraph = (normalizedValues) => {
  return {
    nodes: normalizedValues
      // .filter((v, i, a) => a.findIndex(t => (t.lastValue === v.lastValue)) === i) //TODO: fix duplicates
      .map(x => { return { id: x.value, ...x } }),
    links: normalizedValues
      .filter(x => x.parentValue)
      .filter((v, i, a) => a.findIndex(t => (t.lastValue === v.lastValue && t.lastParent === v.lastParent)) === i)
      .map(x => { return { source: x.parentValue, target: x.value, ...x } }),
  }
}


export default memo(props => {
  const labelKey = props.labelKey
  const valuePrefix = useRef()
  const partialName = useRef()
  const labelValueValue = useRef()
  const labelValueParentValue = useRef()
  const labelValueName = useRef()
  const graphRef = useRef()
  const labelValueUpdateChildren = useRef()
  // const labelValueDescription = useRef() //TODO: implement description
  const [searchText, setSearchText] = useState("")
  const [showGraph, setShowGraph] = useState(false)
  const [tree, setTree] = useState({ nodes: [], links: [] })
  const [graph, setGraph] = useState({ nodes: [], links: [] })
  const [selectedNode, setSelectedNode] = useState({})

  const selectNode = (node) => {
    labelValueValue.current.value = node.value
    labelValueParentValue.current.value = node.parentValue
    labelValueName.current.value = node.name

    setSelectedNode(node)
  }

  const handleNodeClick = useCallback(node => {
    // Aim at node from outside it
    const distance = 400
    const distRatio = 1 + distance / Math.hypot(node.y, node.x, node.z)

    graphRef.current.cameraPosition(
      { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, // new position
      node, // lookAt ({ x, y, z })
      2000  // ms transition duration
    )
  }, [graphRef])

  const getLabelValues = async () => {
    if (!labelKey) return
    const url = `https://localhost:5021/labels/${labelKey}/values?valuePrefix=${valuePrefix.current.value}&partialName=${partialName.current.value}`
    const json = await apiCall(url, "GET")
    const labels = normalizeValues(json)
    setTree(mapToTree(labels))
    setGraph(mapToGraph(labels))
  }
  const postLabelValue = async () => {
    if (!labelKey) return
    if (!labelValueValue.current.value) return
    if (!labelValueName.current.value) return
    const url = `https://localhost:5021/labels/${labelKey}/values`
    var labelValue = await apiCall(url, "POST", {
      value: labelValueValue.current.value,
      parentValue: labelValueParentValue.current.value ? labelValueParentValue.current.value : null,
      name: {
        "nb-NO": labelValueName.current.value
      }
    })
    setSelectedNode(labelValue)
    await getLabelValues()
  }
  const putLabelValue = async () => {
    if (!labelKey) return
    if (!selectedNode.value) return
    if (!labelValueValue.current.value) return
    if (!labelValueName.current.value) return
    const url = `https://localhost:5021/labels/${labelKey}/values/${selectedNode.value}?updateChildren=${!!labelValueUpdateChildren.current.checked}`
    var labelValue = await apiCall(url, "PUT", {
      value: labelValueValue.current.value,
      parentValue: labelValueParentValue.current.value ? labelValueParentValue.current.value : null,
      name: {
        "nb-NO": labelValueName.current.value
      }
    })
    setSelectedNode(labelValue)
    await getLabelValues()
  }
  const deleteLabelValue = async () => {
    if (!labelKey) return
    if (!selectedNode.value) return
    const url = `https://localhost:5021/labels/${labelKey}/values/${selectedNode.value}`
    await apiCall(url, "DELETE")
    setSelectedNode({})
    await getLabelValues()
  }

  return (
    <div>
      {tree.nodes.length > 0 &&
        <>
          <input type="text" placeholder="CSS search" onInput={(e) => setSearchText(e.target.value)} style={{ position: "fixed", bottom: 0, right: 0, zIndex: 51 }} />
          <span style={{ position: "fixed", bottom: 0, zIndex: -1 }}>{tree.nodes.length} nodes</span>
          <button onClick={() => showGraph ? setShowGraph(false) : setShowGraph(true)} style={{ position: "fixed", top: 0, right: 0, zIndex: 51 }}>🪐</button>
        </>}

      <div>
        <button className="get" onClick={getLabelValues}>GET /labels/{labelKey}/values</button>
        <input type="text" placeholder="?valuePrefix=" ref={valuePrefix} onInput={() => delay(() => getLabelValues(), 500)} />
        <input type="text" placeholder="&partialName=" ref={partialName} onInput={() => delay(() => getLabelValues(), 500)} />
      </div>

      <div>
        <button onClick={postLabelValue} className="post">POST /labels/{labelKey}/values</button>
        <div>
          {selectedNode.value ?
            <button onClick={putLabelValue} className="put">PUT /labels/{labelKey}/values/{selectedNode.value}</button>
            : null}
          <input type="text" placeholder="parentValue" ref={labelValueParentValue} />
          <input type="text" placeholder="value" ref={labelValueValue} />
          <input type="text" placeholder="name" ref={labelValueName} />
          <input type="checkbox" ref={labelValueUpdateChildren} /><small style={{ overflow: "hidden" }}>Update children</small>
        </div>
      </div>
      {selectedNode.value ?
        <div>
          <button onClick={deleteLabelValue} className="delete">DELETE /labels/{labelKey}/values/{selectedNode.value}</button>
        </div>
        : null}

      <ForceGraph2D
        graphData={tree}
        dagMode={"td"}
        nodeAutoColorBy="contentType"
        nodeVal={node => 50 / node.level}
        nodeVisibility={x => x.value.includes(searchText)}
        linkVisibility={x => x.source.value ? x.source.value.includes(searchText) : x.source.includes(searchText)}
        onNodeClick={node => {
          console.log("node", node)
          selectNode(node)
        }}
        onLinkClick={link => console.log("link", link)}
        linkDirectionalParticles={0}
        nodeCanvasObjectMode={() => 'after'}
        nodeLabel={node => `${node.name} (${node.contentType})`}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const label = node.name
          const fontSize = 10 / globalScale
          ctx.font = `${fontSize}px Sans-Serif`
          ctx.textAlign = 'center'
          ctx.fillStyle = 'black'
          ctx.fillText(label, node.x, node.y - 10 / globalScale)
        }}
      />

      {showGraph ?
        <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, zIndex: 50 }}>
          <ForceGraph3D
            ref={graphRef}
            graphData={graph}
            showNavInfo={false}
            nodeAutoColorBy="contentType"
            nodeVal={node => 50 / node.level}
            nodeVisibility={node => node.value && node.value.includes(searchText)}
            linkVisibility={link => link.value && link.value.includes(searchText)}
            onNodeClick={node => {
              console.log("clicked node", node)
              handleNodeClick(node)
            }}
            onLinkClick={link => {
              console.log("clicked link", link)
              handleNodeClick(link.target)
            }}
            linkDirectionalParticles={0}
            nodeLabel={node => `${node.name} (${node.contentType})`}
            linkLabel={link => ``}
          />
        </div>
        : null}
    </div>
  )
}, (prevProps, nextProps) => true)