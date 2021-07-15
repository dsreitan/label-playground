import { useState, useRef } from "react"
import LabelValues from "./LabelValues"
import { apiCall } from "./helpers"

export default () => {
  const [labelKey, setLabelKey] = useState("")
  const [labels, setLabels] = useState([])
  const keyInput = useRef()
  const nameInput = useRef()

  const selectLabel = (key, name) => {
    keyInput.current.value = key
    nameInput.current.value = name
    setLabelKey(key)
  }

  const getLabels = async () => {
    const url = `https://localhost:5021/labels`
    const data = await apiCall(url, "GET")
    setLabels(data)
  }

  const postLabel = async () => {
    if (!keyInput.current.value) return
    if (!nameInput.current.value) return
    const url = `https://localhost:5021/labels`
    var label = await apiCall(url, "POST", { key: keyInput.current.value, name: nameInput.current.value })
    selectLabel(label.key, label.name)
    await getLabels()
  }
  const putLabel = async () => {
    if (!labelKey) return
    if (!keyInput.current.value) return
    if (!nameInput.current.value) return
    const url = `https://localhost:5021/labels/${labelKey}`
    var label = await apiCall(url, "PUT", { key: keyInput.current.value, name: nameInput.current.value })
    selectLabel(label.key, label.name)
    await getLabels()
  }
  const deleteLabel = async () => {
    if (!labelKey) return
    const url = `https://localhost:5021/labels/${labelKey}`
    await apiCall(url, "DELETE")
    selectLabel("", "")
    await getLabels()
  }

  return (
    <>
      <div>
        <button onClick={getLabels} className="get">GET /labels</button>
        {labels.map(x =>
          <button className={`get ${labelKey === x.key ? "active" : null}`} key={x.key} onClick={() => selectLabel(x.key, x.name)}>{x.name}</button>
        )}
      </div>
      <div>
        <button onClick={postLabel} className="post">POST /labels</button>
        {labelKey &&
          <button onClick={putLabel} className="put">PUT /labels/{labelKey}</button>}
        <input type="text" placeholder="key" ref={keyInput} />
        <input type="text" placeholder="name" ref={nameInput} />
      </div>

      {labelKey &&
        <>
          <div>
            <button onClick={deleteLabel} className="delete">DELETE /labels/{labelKey}</button>
          </div>
          <br />
          <LabelValues key={labelKey} labelKey={labelKey} />
        </>}
    </>
  )
}
