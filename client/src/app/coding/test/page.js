'use client'

import { useState } from "react";
import Editor from "@monaco-editor/react";

const PythonEditor = () => {
  const [code, setCode] = useState("# Write Python code here...");
  const [output, setOutput] = useState("");

  const runCode = async () => {
    const response = await fetch("http://localhost:8000/code/run-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await response.json();
    setOutput(data.output);
  };

  return (
    <div>
      <Editor height="300px" language="python" value={code} onChange={setCode} />
      <button onClick={runCode}>Run</button>
      <pre>{output}</pre>
    </div>
  );
};

export default PythonEditor;
